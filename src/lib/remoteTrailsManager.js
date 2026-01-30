/**
 * Remote Trails Manager - Manages drawing trails from all remote users
 */

import { TrailManager } from './trailManager.js'

export class RemoteTrailsManager {
  constructor(lifetimeMs = 7500) {
    // Map of userId -> TrailManager instance
    this.userTrails = new Map()
    // Map of userId -> user metadata
    this.userMeta = new Map()
    // Default lifetime for all trails
    this.lifetimeMs = lifetimeMs
  }

  /**
   * Add or update a user
   * @param {string} userId - Unique user identifier
   * @param {string} userName - Display name
   * @param {Object} settings - User's drawing settings
   */
  addUser(userId, userName, settings = null) {
    if (!this.userTrails.has(userId)) {
      const trailManager = new TrailManager(this.lifetimeMs)
      this.userTrails.set(userId, trailManager)
    }

    // Update or create metadata
    this.userMeta.set(userId, {
      userName,
      settings: settings || {
        color: '#ffffff',
        strokeWidth: 4,
        drawStyle: 'line',
        fontSize: 24
      },
      lastSeen: Date.now()
    })
  }

  /**
   * Remove a user and their trails
   * @param {string} userId
   */
  removeUser(userId) {
    this.userTrails.delete(userId)
    this.userMeta.delete(userId)
  }

  /**
   * Add drawing points for a specific user
   * @param {string} userId
   * @param {Array} points - Array of point objects
   */
  addPoints(userId, points) {
    const trailManager = this.userTrails.get(userId)
    if (!trailManager) return

    points.forEach(point => {
      // Add point directly to the trail manager's points array
      trailManager.points.push(point)
    })

    // Update last seen timestamp
    const meta = this.userMeta.get(userId)
    if (meta) {
      meta.lastSeen = Date.now()
    }
  }

  /**
   * Update a user's drawing settings
   * @param {string} userId
   * @param {Object} settings - New settings
   */
  updateSettings(userId, settings) {
    const meta = this.userMeta.get(userId)
    if (meta) {
      meta.settings = { ...meta.settings, ...settings }
      meta.lastSeen = Date.now()
    }
  }

  /**
   * Get all active points from all users with their settings
   * @returns {Array} Array of {userId, userName, points, settings}
   */
  getAllActivePoints() {
    const allUsers = []

    this.userTrails.forEach((trailManager, userId) => {
      trailManager.cleanup()
      const points = trailManager.getActivePoints()
      const meta = this.userMeta.get(userId)

      if (points.length > 0 && meta) {
        allUsers.push({
          userId,
          userName: meta.userName,
          points,
          settings: meta.settings
        })
      }
    })

    return allUsers
  }

  /**
   * Clean up old trails and inactive users
   */
  cleanup() {
    // Clean up old trails for each user
    this.userTrails.forEach(trailManager => trailManager.cleanup())

    // Remove users who haven't been seen in 30 seconds
    const now = Date.now()
    const inactiveTimeout = 30000 // 30 seconds

    this.userMeta.forEach((meta, userId) => {
      if (now - meta.lastSeen > inactiveTimeout) {
        console.log(`Removing inactive user: ${meta.userName}`)
        this.removeUser(userId)
      }
    })
  }

  /**
   * Set the lifetime for all trails (room-wide setting)
   * @param {number} lifetimeMs - New lifetime in milliseconds
   */
  setLifetime(lifetimeMs) {
    this.lifetimeMs = lifetimeMs
    // Update all existing trail managers
    this.userTrails.forEach(trailManager => {
      trailManager.setLifetime(lifetimeMs)
    })
  }

  /**
   * Clear all users and trails
   */
  clearAll() {
    this.userTrails.clear()
    this.userMeta.clear()
  }

  /**
   * Get the number of active users
   * @returns {number}
   */
  getUserCount() {
    return this.userMeta.size
  }

  /**
   * Get list of all users with metadata
   * @returns {Array}
   */
  getAllUsers() {
    const users = []
    this.userMeta.forEach((meta, userId) => {
      users.push({
        id: userId,
        name: meta.userName,
        settings: meta.settings,
        lastSeen: meta.lastSeen
      })
    })
    return users
  }
}
