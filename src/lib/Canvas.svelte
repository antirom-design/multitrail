<script>
  import { onMount, onDestroy } from 'svelte';
  import { TrailManager } from './trailManager.js';
  import { clearCanvas, drawTrail, setupHighDPICanvas } from './canvasRenderer.js';

  export let settings = {
    lifetimeMs: 15000,
    strokeWidth: 4,
    color: '#ffffff',
    drawStyle: 'line'
  };

  let canvas;
  let ctx;
  let trailManager;
  let animationFrameId;
  let isDrawing = false;
  let cursorPosition = { x: 0, y: 0 };
  let isCanvasHovered = false;
  let textOffsetX = 0; // Track horizontal position for text
  let lastTypingPosition = { x: 0, y: 0 }; // Track where we started typing

  // Update trail manager when settings change
  $: if (trailManager) {
    trailManager.setLifetime(settings.lifetimeMs);
  }

  onMount(() => {
    // Initialize trail manager with initial lifetime
    trailManager = new TrailManager(settings.lifetimeMs);

    // Set up canvas for high-DPI displays
    resizeCanvas();

    // Start animation loop
    startAnimationLoop();

    // Handle window resize
    window.addEventListener('resize', resizeCanvas);

    // Handle keyboard events
    window.addEventListener('keydown', handleKeyDown);
  });

  onDestroy(() => {
    // Clean up
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    window.removeEventListener('resize', resizeCanvas);
    window.removeEventListener('keydown', handleKeyDown);
  });

  function resizeCanvas() {
    if (!canvas) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    ctx = setupHighDPICanvas(canvas, width, height);
  }

  function startAnimationLoop() {
    function animate() {
      // Clean up old points
      trailManager.cleanup();

      // Get active points
      const points = trailManager.getActivePoints();

      // Clear and redraw
      clearCanvas(ctx, canvas.width, canvas.height);
      drawTrail(ctx, points, {
        strokeWidth: settings.strokeWidth,
        color: settings.color,
        drawStyle: settings.drawStyle,
        speedSettings: settings.speedSettings || { enabled: false },
        fontSize: settings.fontSize || 24
      });

      // Continue loop
      animationFrameId = requestAnimationFrame(animate);
    }

    animate();
  }

  // Keyboard event handler
  function handleKeyDown(e) {
    // Only type when canvas is hovered (cursor is over canvas)
    if (!isCanvasHovered) return;

    // Ignore modifier keys and special keys
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length > 1 && e.key !== 'Enter' && e.key !== 'Backspace') return;

    e.preventDefault();

    // Check if cursor has moved to a new position (reset typing position)
    const moveThreshold = 20; // pixels
    const dx = cursorPosition.x - lastTypingPosition.x;
    const dy = cursorPosition.y - lastTypingPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > moveThreshold) {
      // Cursor moved - start new typing position
      textOffsetX = 0;
      lastTypingPosition = { ...cursorPosition };
    }

    if (e.key === 'Enter') {
      // New line - move down and reset horizontal position
      lastTypingPosition.y += settings.fontSize || 24;
      cursorPosition.y = lastTypingPosition.y;
      textOffsetX = 0;
      return;
    }

    if (e.key === 'Backspace') {
      // Move back
      textOffsetX -= (settings.fontSize || 24) * 0.6;
      if (textOffsetX < 0) textOffsetX = 0;
      return;
    }

    // Add character at the last typing position + offset
    const charWidth = (settings.fontSize || 24) * 0.6; // Approximate character width
    trailManager.addText(lastTypingPosition.x + textOffsetX, lastTypingPosition.y, e.key);
    textOffsetX += charWidth;
  }

  // Mouse events (for desktop testing)
  function handleMouseDown(e) {
    isDrawing = true;
    trailManager.startNewStroke(); // Start a new stroke
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    trailManager.addPoint(x, y);
  }

  function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Always update cursor position for text typing
    cursorPosition = { x, y };

    // If drawing, add point
    if (isDrawing) {
      trailManager.addPoint(x, y);
    }
  }

  function handleMouseUp() {
    isDrawing = false;
  }

  function handleMouseEnter() {
    isCanvasHovered = true;
  }

  function handleMouseLeave() {
    isCanvasHovered = false;
    isDrawing = false;
  }

  // Touch events (for mobile)
  function handleTouchStart(e) {
    e.preventDefault();
    isDrawing = true;
    trailManager.startNewStroke(); // Start a new stroke
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    trailManager.addPoint(x, y);
  }

  function handleTouchMove(e) {
    e.preventDefault();
    if (!isDrawing) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    trailManager.addPoint(x, y);
  }

  function handleTouchEnd(e) {
    e.preventDefault();
    isDrawing = false;
  }
</script>

<canvas
  bind:this={canvas}
  on:mousedown={handleMouseDown}
  on:mousemove={handleMouseMove}
  on:mouseup={handleMouseUp}
  on:mouseenter={handleMouseEnter}
  on:mouseleave={handleMouseLeave}
  on:touchstart={handleTouchStart}
  on:touchmove={handleTouchMove}
  on:touchend={handleTouchEnd}
  on:touchcancel={handleTouchEnd}
/>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    cursor: crosshair;
    touch-action: none;
  }
</style>
