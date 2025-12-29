/**
 * Canvas Renderer - Handles drawing trails as dots or strokes
 */

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
 * Draw trail - can be dots or connected lines per stroke
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} points - Array of points with {x, y, timestamp, strokeId}
 * @param {Object} settings - Drawing settings {strokeWidth, color, drawStyle}
 */
export function drawTrail(ctx, points, settings = {}) {
  if (points.length === 0) return;

  const {
    strokeWidth = 4,
    color = '#ffffff',
    drawStyle = 'line' // 'line' or 'dots'
  } = settings;

  // Group points by stroke ID so we don't connect separate strokes
  const strokes = groupPointsByStroke(points);

  // Set up canvas styling
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  // Draw each stroke separately
  for (const stroke of strokes) {
    if (drawStyle === 'dots') {
      drawDots(ctx, stroke, strokeWidth);
    } else {
      drawStroke(ctx, stroke);
    }
  }
}

/**
 * Group points by stroke ID
 * @param {Array} points - Array of points
 * @returns {Array} Array of stroke arrays
 */
function groupPointsByStroke(points) {
  if (points.length === 0) return [];

  const strokes = [];
  let currentStroke = [points[0]];
  let currentStrokeId = points[0].strokeId;

  for (let i = 1; i < points.length; i++) {
    if (points[i].strokeId === currentStrokeId) {
      currentStroke.push(points[i]);
    } else {
      strokes.push(currentStroke);
      currentStroke = [points[i]];
      currentStrokeId = points[i].strokeId;
    }
  }

  strokes.push(currentStroke);
  return strokes;
}

/**
 * Draw points as individual dots
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} points - Array of points in this stroke
 * @param {number} strokeWidth - Width/radius of dots
 */
function drawDots(ctx, points, strokeWidth) {
  const radius = strokeWidth / 2;

  for (const point of points) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draw a stroke (connected line through points)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} points - Array of points in this stroke
 */
function drawStroke(ctx, points) {
  if (points.length === 0) return;

  ctx.beginPath();

  if (points.length === 1) {
    // Single point - draw a small circle
    const p = points[0];
    ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (points.length === 2) {
    // Two points - draw a straight line
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.stroke();
    return;
  }

  // For three or more points, draw smooth quadratic curves
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    ctx.quadraticCurveTo(current.x, current.y, midX, midY);
  }

  // Draw to the last point
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
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
