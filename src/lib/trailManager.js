/**
 * Trail Manager - Manages drawing points with timestamps
 * Points older than configured lifetime are automatically cleaned up
 */

export class TrailManager {
  constructor(lifetimeMs = 7500) {
    this.points = [];
    this.currentStrokeId = 0;
    this.lifetimeMs = lifetimeMs;
    this.lastPoint = null;
    this.lastPointTime = null;
  }

  /**
   * Start a new stroke (don't connect to previous lines)
   */
  startNewStroke() {
    this.currentStrokeId++;
    this.lastPoint = null;
    this.lastPointTime = null;
  }

  /**
   * Calculate speed based on distance and time from last point
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} Speed in pixels per millisecond
   */
  calculateSpeed(x, y) {
    if (!this.lastPoint || !this.lastPointTime) {
      return 0;
    }

    const now = Date.now();
    const timeDiff = now - this.lastPointTime;

    if (timeDiff === 0) {
      return 0;
    }

    const dx = x - this.lastPoint.x;
    const dy = y - this.lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Speed in pixels per millisecond
    return distance / timeDiff;
  }

  /**
   * Add a new drawing point to the trail
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} pressure - Pressure value (default 1.0, for future use)
   */
  addPoint(x, y, pressure = 1.0) {
    const speed = this.calculateSpeed(x, y);

    this.points.push({
      type: 'draw',
      x,
      y,
      timestamp: Date.now(),
      pressure,
      strokeId: this.currentStrokeId,
      speed
    });

    this.lastPoint = { x, y };
    this.lastPointTime = Date.now();
  }

  /**
   * Add a text character to the trail
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} char - Character to display
   */
  addText(x, y, char) {
    this.points.push({
      type: 'text',
      x,
      y,
      char,
      timestamp: Date.now(),
      strokeId: this.currentStrokeId
    });
  }

  /**
   * Set the trail lifetime in milliseconds
   * @param {number} ms - Lifetime in milliseconds
   */
  setLifetime(ms) {
    this.lifetimeMs = ms;
  }

  /**
   * Get all points that are still active (within lifetime)
   * @returns {Array} Array of active points
   */
  getActivePoints() {
    const now = Date.now();
    const cutoffTime = now - this.lifetimeMs;

    // Filter points that are still within the lifetime
    return this.points.filter(point => point.timestamp > cutoffTime);
  }

  /**
   * Remove points older than lifetime
   * Call this periodically to prevent memory buildup
   */
  cleanup() {
    const now = Date.now();
    const cutoffTime = now - this.lifetimeMs;

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
