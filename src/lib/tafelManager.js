/**
 * Tafel Manager - Manages persistent strokes for blackboard mode
 * Unlike trail mode where points fade, tafel mode keeps strokes permanently
 */

export class TafelManager {
  constructor() {
    // All strokes, keyed by strokeId
    this.strokes = new Map()
    // Map of userId -> Set of strokeIds
    this.userStrokes = new Map()
  }

  /**
   * Add a new stroke
   * @param {Object} stroke - Stroke data
   * @param {string} stroke.strokeId - Unique stroke ID
   * @param {string} stroke.userId - Owner's session ID
   * @param {string} stroke.userName - Owner's display name
   * @param {string} stroke.tool - 'pen' or 'brush'
   * @param {string} stroke.color - Stroke color
   * @param {number} stroke.strokeWidth - Base stroke width
   * @param {Array} stroke.points - Array of {x, y, speed}
   * @param {number} stroke.createdAt - Timestamp
   */
  addStroke(stroke) {
    const { strokeId, userId } = stroke

    this.strokes.set(strokeId, stroke)

    // Track which user owns this stroke
    if (!this.userStrokes.has(userId)) {
      this.userStrokes.set(userId, new Set())
    }
    this.userStrokes.get(userId).add(strokeId)

    console.log(`📝 Tafel: Added stroke ${strokeId} for user ${userId}`)
  }

  /**
   * Add points to an existing stroke (for real-time drawing)
   * @param {string} strokeId - Stroke to update
   * @param {Array} points - Points to add
   */
  addPointsToStroke(strokeId, points) {
    const stroke = this.strokes.get(strokeId)
    if (stroke) {
      stroke.points.push(...points)
    }
  }

  /**
   * Delete a stroke by ID
   * @param {string} strokeId - Stroke to delete
   * @returns {boolean} Whether the stroke was deleted
   */
  deleteStroke(strokeId) {
    const stroke = this.strokes.get(strokeId)
    if (!stroke) return false

    const { userId } = stroke

    // Remove from strokes map
    this.strokes.delete(strokeId)

    // Remove from user's stroke set
    const userStrokeSet = this.userStrokes.get(userId)
    if (userStrokeSet) {
      userStrokeSet.delete(strokeId)
      if (userStrokeSet.size === 0) {
        this.userStrokes.delete(userId)
      }
    }

    console.log(`🗑️ Tafel: Deleted stroke ${strokeId}`)
    return true
  }

  /**
   * Delete multiple strokes
   * @param {Array<string>} strokeIds - Array of stroke IDs to delete
   * @returns {Array<string>} Actually deleted stroke IDs
   */
  deleteStrokes(strokeIds) {
    const deleted = []
    for (const strokeId of strokeIds) {
      if (this.deleteStroke(strokeId)) {
        deleted.push(strokeId)
      }
    }
    return deleted
  }

  /**
   * Get stroke by ID
   * @param {string} strokeId
   * @returns {Object|undefined}
   */
  getStroke(strokeId) {
    return this.strokes.get(strokeId)
  }

  /**
   * Get all strokes as an array
   * @returns {Array} Array of all strokes
   */
  getAllStrokes() {
    return Array.from(this.strokes.values())
  }

  /**
   * Get strokes by user ID
   * @param {string} userId
   * @returns {Array} Array of strokes for this user
   */
  getStrokesForUser(userId) {
    const strokeIds = this.userStrokes.get(userId)
    if (!strokeIds) return []
    return Array.from(strokeIds).map(id => this.strokes.get(id)).filter(Boolean)
  }

  /**
   * Find strokes that intersect with a point (for eraser tool)
   * Uses a simple distance-based hit test
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} radius - Hit radius
   * @returns {Array<string>} Array of stroke IDs that intersect
   */
  getStrokesAtPoint(x, y, radius = 10) {
    const hits = []

    for (const [strokeId, stroke] of this.strokes) {
      for (const point of stroke.points) {
        const dx = point.x - x
        const dy = point.y - y
        const dist = Math.sqrt(dx * dx + dy * dy)

        // Hit threshold includes stroke width
        const hitThreshold = radius + (stroke.strokeWidth || 4) / 2

        if (dist <= hitThreshold) {
          hits.push(strokeId)
          break // Found a hit, no need to check more points
        }
      }
    }

    return hits
  }

  /**
   * Find strokes along a path (for eraser drag)
   * @param {Array} path - Array of {x, y} points
   * @param {number} radius - Hit radius
   * @returns {Array<string>} Unique stroke IDs that intersect
   */
  getStrokesAlongPath(path, radius = 10) {
    const hits = new Set()

    for (const point of path) {
      const strokesAtPoint = this.getStrokesAtPoint(point.x, point.y, radius)
      strokesAtPoint.forEach(id => hits.add(id))
    }

    return Array.from(hits)
  }

  /**
   * Clear all strokes
   */
  clearAll() {
    this.strokes.clear()
    this.userStrokes.clear()
    console.log('🧹 Tafel: Cleared all strokes')
  }

  /**
   * Clear strokes for a specific user
   * @param {string} userId
   */
  clearUserStrokes(userId) {
    const strokeIds = this.userStrokes.get(userId)
    if (!strokeIds) return

    for (const strokeId of strokeIds) {
      this.strokes.delete(strokeId)
    }
    this.userStrokes.delete(userId)

    console.log(`🧹 Tafel: Cleared all strokes for user ${userId}`)
  }

  /**
   * Export all strokes for syncing
   * @returns {Array} Serializable array of strokes
   */
  exportStrokes() {
    return this.getAllStrokes()
  }

  /**
   * Import strokes (for sync on join)
   * @param {Array} strokes - Array of stroke objects
   */
  importStrokes(strokes) {
    this.clearAll()
    for (const stroke of strokes) {
      this.addStroke(stroke)
    }
    console.log(`📥 Tafel: Imported ${strokes.length} strokes`)
  }

  /**
   * Get stroke count
   * @returns {number}
   */
  get strokeCount() {
    return this.strokes.size
  }

  /**
   * Check if a stroke belongs to a user
   * @param {string} strokeId
   * @param {string} userId
   * @returns {boolean}
   */
  isStrokeOwnedBy(strokeId, userId) {
    const stroke = this.strokes.get(strokeId)
    return stroke && stroke.userId === userId
  }
}
