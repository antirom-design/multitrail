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
 * Calculate stroke width based on speed
 * @param {number} speed - Speed in pixels per millisecond
 * @param {Object} speedSettings - Speed settings {enabled, minWidth, maxWidth, sensitivity}
 * @param {number} baseWidth - Base stroke width
 * @returns {number} Calculated stroke width
 */
function calculateStrokeWidth(speed, speedSettings, baseWidth) {
  if (!speedSettings.enabled) {
    return baseWidth;
  }

  // Convert speed (px/ms) to a more usable scale
  // Typical speeds: slow = 0.1-0.5, medium = 0.5-2, fast = 2-10
  const speedScale = speed * speedSettings.sensitivity;

  // Map speed to width (inversely): slow = thick, fast = thin
  // Using exponential decay for smoother feel
  const speedFactor = Math.exp(-speedScale);

  const width = speedSettings.minWidth +
    (speedSettings.maxWidth - speedSettings.minWidth) * speedFactor;

  return Math.max(speedSettings.minWidth, Math.min(speedSettings.maxWidth, width));
}

/**
 * Draw trail - can be dots or connected lines per stroke, includes text
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} points - Array of points with {x, y, timestamp, strokeId, type}
 * @param {Object} settings - Drawing settings
 */
export function drawTrail(ctx, points, settings = {}) {
  if (points.length === 0) return;

  const {
    strokeWidth = 4,
    color = '#ffffff',
    drawStyle = 'line',
    speedSettings = { enabled: false, minWidth: 1, maxWidth: 20, sensitivity: 1 },
    fontSize = 24
  } = settings;

  // Separate draw points and text points
  const drawPoints = points.filter(p => p.type === 'draw');
  const textPoints = points.filter(p => p.type === 'text');

  // Draw strokes
  if (drawPoints.length > 0) {
    const strokes = groupPointsByStroke(drawPoints);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    for (const stroke of strokes) {
      if (drawStyle === 'dots') {
        drawDots(ctx, stroke, strokeWidth, speedSettings);
      } else {
        drawStroke(ctx, stroke, strokeWidth, speedSettings);
      }
    }
  }

  // Draw text
  if (textPoints.length > 0) {
    drawText(ctx, textPoints, color, fontSize);
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
 * Draw points as individual dots with speed-based sizing
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} points - Array of points in this stroke
 * @param {number} baseWidth - Base stroke width
 * @param {Object} speedSettings - Speed settings
 */
function drawDots(ctx, points, baseWidth, speedSettings) {
  for (const point of points) {
    const width = calculateStrokeWidth(point.speed || 0, speedSettings, baseWidth);
    const radius = width / 2;

    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draw a stroke (connected line through points) with variable width
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} points - Array of points in this stroke
 * @param {number} baseWidth - Base stroke width
 * @param {Object} speedSettings - Speed settings
 */
function drawStroke(ctx, points, baseWidth, speedSettings) {
  if (points.length === 0) return;

  if (points.length === 1) {
    // Single point - draw a small circle
    const p = points[0];
    const width = calculateStrokeWidth(p.speed || 0, speedSettings, baseWidth);
    ctx.beginPath();
    ctx.arc(p.x, p.y, width / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // For speed-based width, we need to draw segments with varying widths
  if (speedSettings.enabled) {
    drawVariableWidthStroke(ctx, points, baseWidth, speedSettings);
  } else {
    // Fixed width stroke
    ctx.lineWidth = baseWidth;
    drawFixedWidthStroke(ctx, points);
  }
}

/**
 * Draw fixed width stroke
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} points - Array of points
 */
function drawFixedWidthStroke(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
  } else {
    for (let i = 1; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      ctx.quadraticCurveTo(current.x, current.y, midX, midY);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  ctx.stroke();
}

/**
 * Draw variable width stroke (speed-dependent)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} points - Array of points
 * @param {number} baseWidth - Base stroke width
 * @param {Object} speedSettings - Speed settings
 */
function drawVariableWidthStroke(ctx, points, baseWidth, speedSettings) {
  // Draw each segment with its own width
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];

    // Use average speed for this segment
    const avgSpeed = ((current.speed || 0) + (next.speed || 0)) / 2;
    const width = calculateStrokeWidth(avgSpeed, speedSettings, baseWidth);

    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(current.x, current.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
  }
}

/**
 * Draw text characters
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} textPoints - Array of text points
 * @param {string} color - Text color
 * @param {number} fontSize - Font size
 */
function drawText(ctx, textPoints, color, fontSize) {
  ctx.fillStyle = color;
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textBaseline = 'middle';

  for (const point of textPoints) {
    ctx.fillText(point.char, point.x, point.y);
  }
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

/**
 * Draw a remote cursor with username label
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {string} userName - Display name for the cursor
 * @param {string} color - User's color (hex string)
 */
export function drawRemoteCursor(ctx, x, y, userName, color = '#ffffff') {
  // Save current context state
  ctx.save();

  // Draw crosshair cursor with user's color
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  ctx.beginPath();
  // Horizontal line
  ctx.moveTo(x - 12, y);
  ctx.lineTo(x + 12, y);
  // Vertical line
  ctx.moveTo(x, y - 12);
  ctx.lineTo(x, y + 12);
  ctx.stroke();

  // Add a white outline for visibility
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 5;
  ctx.globalCompositeOperation = 'destination-over';
  ctx.beginPath();
  ctx.moveTo(x - 12, y);
  ctx.lineTo(x + 12, y);
  ctx.moveTo(x, y - 12);
  ctx.lineTo(x, y + 12);
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';

  // Draw username label
  ctx.font = 'bold 13px sans-serif';
  ctx.textBaseline = 'top';
  const textWidth = ctx.measureText(userName).width;
  const padding = 6;
  const labelX = x + 16;
  const labelY = y - 12;

  // Draw label background with user's color
  ctx.fillStyle = color;
  ctx.fillRect(labelX, labelY, textWidth + padding * 2, 24);

  // Draw label text (white for contrast)
  ctx.fillStyle = '#ffffff';
  ctx.fillText(userName, labelX + padding, labelY + 5);

  // Restore context state
  ctx.restore();
}
