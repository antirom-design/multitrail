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
  });

  onDestroy(() => {
    // Clean up
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    window.removeEventListener('resize', resizeCanvas);
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
        drawStyle: settings.drawStyle
      });

      // Continue loop
      animationFrameId = requestAnimationFrame(animate);
    }

    animate();
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
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    trailManager.addPoint(x, y);
  }

  function handleMouseUp() {
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
  on:mouseleave={handleMouseUp}
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
