/**
 * Trail Manager - Manages drawing points with timestamps
 * Points older than configured lifetime are automatically cleaned up
 */

export class TrailManager {
  constructor(lifetimeMs = 15000) {
    this.points = [];
    this.currentStrokeId = 0;
    this.lifetimeMs = lifetimeMs;
  }

  /**
   * Start a new stroke (don't connect to previous lines)
   */
  startNewStroke() {
    this.currentStrokeId++;
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
      pressure,
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
