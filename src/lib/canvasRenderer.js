/**
 * Canvas Renderer - Handles drawing trails with smooth curves and fade effects
 */

const TRAIL_LIFETIME_MS = 15000; // 15 seconds
const FADE_START_MS = 13000; // Start fading at 13 seconds
const STROKE_WIDTH = 4;
const STROKE_COLOR = 'white';

/**
 * Clear the entire canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
export function clearCanvas(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
}

/**
 * Calculate alpha value based on point age
 * Points fade from alpha 1.0 to 0.0 between 13-15 seconds
 * @param {number} timestamp - Point timestamp
 * @returns {number} Alpha value between 0 and 1
 */
export function calculateAlpha(timestamp) {
  const age = Date.now() - timestamp;

  if (age < FADE_START_MS) {
    return 1.0; // Full opacity
  }

  if (age >= TRAIL_LIFETIME_MS) {
    return 0.0; // Fully transparent (should be filtered out)
  }

  // Linear fade from 1.0 to 0.0 over the last 2 seconds
  const fadeProgress = (age - FADE_START_MS) / (TRAIL_LIFETIME_MS - FADE_START_MS);
  return 1.0 - fadeProgress;
}

/**
 * Draw smooth trail through points using quadratic curves
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} points - Array of points with {x, y, timestamp}
 */
export function drawTrail(ctx, points) {
  if (points.length === 0) return;

  // Set up canvas styling
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = STROKE_WIDTH;

  // Group points by similar age for efficient alpha rendering
  // This reduces the number of path operations needed
  const pointsByAlpha = groupPointsByAlpha(points);

  // Draw each alpha group
  for (const group of pointsByAlpha) {
    const alpha = group.alpha;
    if (alpha <= 0) continue;

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();

    // Draw smooth curves through the group's points
    drawSmoothCurve(ctx, group.points);

    ctx.stroke();
  }
}

/**
 * Group consecutive points with similar alpha values
 * This optimizes rendering by reducing the number of separate paths
 * @param {Array} points - Array of points
 * @returns {Array} Array of {alpha, points} groups
 */
function groupPointsByAlpha(points) {
  if (points.length === 0) return [];

  const groups = [];
  let currentGroup = {
    alpha: calculateAlpha(points[0].timestamp),
    points: [points[0]]
  };

  for (let i = 1; i < points.length; i++) {
    const alpha = calculateAlpha(points[i].timestamp);
    const alphaDiff = Math.abs(alpha - currentGroup.alpha);

    // If alpha difference is small, add to current group
    // Otherwise, start a new group
    if (alphaDiff < 0.1) {
      currentGroup.points.push(points[i]);
      currentGroup.alpha = (currentGroup.alpha + alpha) / 2; // Average alpha
    } else {
      groups.push(currentGroup);
      currentGroup = {
        alpha: alpha,
        points: [points[i]]
      };
    }
  }

  groups.push(currentGroup);
  return groups;
}

/**
 * Draw a smooth curve through points using quadratic Bezier curves
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} points - Array of points
 */
function drawSmoothCurve(ctx, points) {
  if (points.length === 0) return;

  if (points.length === 1) {
    // Single point - draw a small circle
    const p = points[0];
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.1, p.y + 0.1);
    return;
  }

  // Start at the first point
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    // Two points - draw a straight line
    ctx.lineTo(points[1].x, points[1].y);
    return;
  }

  // For three or more points, draw smooth quadratic curves
  // The control point for each curve is the current point,
  // and we draw to the midpoint between current and next
  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;

    ctx.quadraticCurveTo(current.x, current.y, midX, midY);
  }

  // Draw line to the last point
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
}

/**
 * Get canvas device pixel ratio for high-DPI displays
 * @returns {number} Device pixel ratio
 */
export function getDevicePixelRatio() {
  return window.devicePixelRatio || 1;
}

/**
 * Set up canvas for high-DPI displays (retina, etc.)
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {number} width - Desired width in CSS pixels
 * @param {number} height - Desired height in CSS pixels
 * @returns {CanvasRenderingContext2D} Scaled context
 */
export function setupHighDPICanvas(canvas, width, height) {
  const dpr = getDevicePixelRatio();

  // Set canvas size in actual pixels
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  // Set display size in CSS pixels
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  // Scale context to match device pixel ratio
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  return ctx;
}
