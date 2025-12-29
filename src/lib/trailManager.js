/**
 * Trail Manager - Manages drawing points with timestamps
 * Points older than 15 seconds are automatically cleaned up
 */

const TRAIL_LIFETIME_MS = 15000; // 15 seconds

export class TrailManager {
  constructor() {
    this.points = [];
  }

  /**
   * Add a new point to the trail
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} pressure - Pressure value (default 1.0, for future use)
   */
  addPoint(x, y, pressure = 1.0) {
    this.points.push({
      x,
      y,
      timestamp: Date.now(),
      pressure
    });
  }

  /**
   * Get all points that are still active (less than 15 seconds old)
   * @returns {Array} Array of active points
   */
  getActivePoints() {
    const now = Date.now();
    const cutoffTime = now - TRAIL_LIFETIME_MS;

    // Filter points that are still within the lifetime
    return this.points.filter(point => point.timestamp > cutoffTime);
  }

  /**
   * Remove points older than 15 seconds
   * Call this periodically to prevent memory buildup
   */
  cleanup() {
    const now = Date.now();
    const cutoffTime = now - TRAIL_LIFETIME_MS;

    // Keep only points that are newer than the cutoff time
    this.points = this.points.filter(point => point.timestamp > cutoffTime);
  }

  /**
   * Clear all points
   */
  clear() {
    this.points = [];
  }

  /**
   * Get the total number of points (including expired ones)
   * @returns {number}
   */
  getPointCount() {
    return this.points.length;
  }

  /**
   * Get the age of a point in milliseconds
   * @param {Object} point - Point object with timestamp
   * @returns {number} Age in milliseconds
   */
  getPointAge(point) {
    return Date.now() - point.timestamp;
  }
}
