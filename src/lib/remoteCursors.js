/**
 * Remote Cursors Manager - Tracks cursor positions from remote users
 */

export class RemoteCursorsManager {
  constructor() {
    // Map of userId -> cursor data
    this.cursors = new Map()
  }

  /**
   * Update or add a cursor position
   * @param {string} userId - Unique user identifier
   * @param {string} userName - Display name
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  updateCursor(userId, userName, x, y) {
    this.cursors.set(userId, {
      x,
      y,
      userName,
      lastSeen: Date.now()
    })
  }

  /**
   * Remove a specific cursor
   * @param {string} userId
   */
  removeCursor(userId) {
    this.cursors.delete(userId)
  }

  /**
   * Get all active cursors (removes stale ones automatically)
   * @returns {Array} Array of cursor objects with userId, x, y, userName
   */
  getActiveCursors() {
    const now = Date.now()
    const staleTimeout = 2000 // 2 seconds - remove if no update
    const active = []

    this.cursors.forEach((cursor, userId) => {
      if (now - cursor.lastSeen > staleTimeout) {
        // Remove stale cursor
        this.cursors.delete(userId)
      } else {
        active.push({
          userId,
          x: cursor.x,
          y: cursor.y,
          userName: cursor.userName
        })
      }
    })

    return active
  }

  /**
   * Clean up stale cursors
   */
  cleanup() {
    // This automatically happens in getActiveCursors()
    this.getActiveCursors()
  }

  /**
   * Clear all cursors
   */
  clearAll() {
    this.cursors.clear()
  }

  /**
   * Get the number of active cursors
   * @returns {number}
   */
  getCursorCount() {
    // Clean up first
    this.getActiveCursors()
    return this.cursors.size
  }
}
