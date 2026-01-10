<script>
  import { onMount, onDestroy } from 'svelte';
  import { TrailManager } from './trailManager.js';
  import { RemoteTrailsManager } from './remoteTrailsManager.js';
  import { RemoteCursorsManager } from './remoteCursors.js';
  import { clearCanvas, drawTrail, drawRemoteCursor, setupHighDPICanvas } from './canvasRenderer.js';

  export let settings = {
    lifetimeMs: 15000,
    strokeWidth: 4,
    color: '#ffffff',
    drawStyle: 'line'
  };

  export let websocket = null;
  export let isMultiplayerMode = false;

  let canvas;
  let ctx;
  let trailManager;
  let animationFrameId;
  let isDrawing = false;
  let cursorPosition = { x: 0, y: 0 };
  let isCanvasHovered = false;
  let textOffsetX = 0; // Track horizontal position for text
  let lastTypingPosition = { x: 0, y: 0 }; // Track where we started typing

  // Multiplayer managers
  let remoteTrailsManager = null;
  let remoteCursorsManager = null;

  // Point buffering for multiplayer
  let pointBuffer = [];
  let pointBatchTimeout = null;
  let lastCursorEmit = 0;

  // Update trail manager when settings change
  $: if (trailManager) {
    trailManager.setLifetime(settings.lifetimeMs);
  }

  onMount(() => {
    // Initialize trail manager with initial lifetime
    trailManager = new TrailManager(settings.lifetimeMs);

    // Initialize multiplayer managers if in multiplayer mode
    if (isMultiplayerMode) {
      remoteTrailsManager = new RemoteTrailsManager();
      remoteCursorsManager = new RemoteCursorsManager();
      setupMultiplayerListeners();
    }

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
    if (pointBatchTimeout) {
      clearTimeout(pointBatchTimeout);
    }
    window.removeEventListener('resize', resizeCanvas);
    window.removeEventListener('keydown', handleKeyDown);

    // Clean up multiplayer listeners
    if (isMultiplayerMode) {
      window.removeEventListener('remoteDrawPoints', handleRemotePoints);
      window.removeEventListener('remoteCursor', handleRemoteCursor);
      window.removeEventListener('remoteSettings', handleRemoteSettings);
    }
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

      if (isMultiplayerMode && remoteTrailsManager && remoteCursorsManager) {
        remoteTrailsManager.cleanup();
        remoteCursorsManager.cleanup();
      }

      // Get active points
      const points = trailManager.getActivePoints();

      // Clear and redraw
      clearCanvas(ctx, canvas.width, canvas.height);

      // Draw local trails
      drawTrail(ctx, points, {
        strokeWidth: settings.strokeWidth,
        color: settings.color,
        drawStyle: settings.drawStyle,
        speedSettings: settings.speedSettings || { enabled: false },
        fontSize: settings.fontSize || 24
      });

      // Draw remote trails and cursors if in multiplayer mode
      if (isMultiplayerMode && remoteTrailsManager && remoteCursorsManager) {
        const remoteUsers = remoteTrailsManager.getAllActivePoints();
        remoteUsers.forEach(({ points: userPoints, settings: userSettings }) => {
          drawTrail(ctx, userPoints, {
            strokeWidth: userSettings.strokeWidth,
            color: userSettings.color,
            drawStyle: userSettings.drawStyle,
            speedSettings: { enabled: false }, // Disable speed for remote
            fontSize: userSettings.fontSize || 24
          });
        });

        // Draw remote cursors
        const cursors = remoteCursorsManager.getActiveCursors();
        cursors.forEach(cursor => {
          drawRemoteCursor(ctx, cursor.x, cursor.y, cursor.userName);
        });
      }

      // Continue loop
      animationFrameId = requestAnimationFrame(animate);
    }

    animate();
  }

  // Multiplayer setup and handlers
  function setupMultiplayerListeners() {
    window.addEventListener('remoteDrawPoints', handleRemotePoints);
    window.addEventListener('remoteCursor', handleRemoteCursor);
    window.addEventListener('remoteSettings', handleRemoteSettings);
  }

  function handleRemotePoints(event) {
    const { sessionId, userName, points } = event.detail;
    if (remoteTrailsManager) {
      remoteTrailsManager.addUser(sessionId, userName);
      remoteTrailsManager.addPoints(sessionId, points);
    }
  }

  function handleRemoteCursor(event) {
    const { sessionId, userName, x, y } = event.detail;
    if (remoteCursorsManager) {
      remoteCursorsManager.updateCursor(sessionId, userName, x, y);
    }
  }

  function handleRemoteSettings(event) {
    const { sessionId, settings: userSettings } = event.detail;
    if (remoteTrailsManager) {
      remoteTrailsManager.updateSettings(sessionId, userSettings);
    }
  }

  // Point buffering for multiplayer
  function bufferPoint(point) {
    pointBuffer.push(point);

    // Send batch every 32ms (30 FPS) or when buffer reaches 10 points
    if (pointBuffer.length >= 10) {
      flushPointBuffer();
    } else if (!pointBatchTimeout) {
      pointBatchTimeout = setTimeout(flushPointBuffer, 32);
    }
  }

  function flushPointBuffer() {
    if (pointBuffer.length > 0 && websocket) {
      websocket.sendPoints([...pointBuffer]);
      pointBuffer = [];
    }
    pointBatchTimeout = null;
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

    // Send stroke start and point to WebSocket if in multiplayer mode
    if (isMultiplayerMode && websocket) {
      websocket.sendStrokeStart(trailManager.currentStrokeId);
      const lastPoint = trailManager.points[trailManager.points.length - 1];
      bufferPoint(lastPoint);
    }
  }

  function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Always update cursor position for text typing
    cursorPosition = { x, y };

    // Send cursor position if in multiplayer mode (throttled to 50ms)
    if (isMultiplayerMode && websocket) {
      const now = Date.now();
      if (now - lastCursorEmit > 50) {
        websocket.sendCursor(x, y);
        lastCursorEmit = now;
      }
    }

    // If drawing, add point
    if (isDrawing) {
      trailManager.addPoint(x, y);

      // Buffer point for multiplayer
      if (isMultiplayerMode && websocket) {
        const lastPoint = trailManager.points[trailManager.points.length - 1];
        bufferPoint(lastPoint);
      }
    }
  }

  function handleMouseUp() {
    if (isDrawing && isMultiplayerMode && websocket) {
      // Flush remaining buffered points
      flushPointBuffer();
      // Send stroke end
      websocket.sendStrokeEnd(trailManager.currentStrokeId);
    }
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

    // Send stroke start and point to WebSocket if in multiplayer mode
    if (isMultiplayerMode && websocket) {
      websocket.sendStrokeStart(trailManager.currentStrokeId);
      const lastPoint = trailManager.points[trailManager.points.length - 1];
      bufferPoint(lastPoint);
    }
  }

  function handleTouchMove(e) {
    e.preventDefault();
    if (!isDrawing) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    trailManager.addPoint(x, y);

    // Buffer point for multiplayer
    if (isMultiplayerMode && websocket) {
      const lastPoint = trailManager.points[trailManager.points.length - 1];
      bufferPoint(lastPoint);
    }
  }

  function handleTouchEnd(e) {
    e.preventDefault();
    if (isDrawing && isMultiplayerMode && websocket) {
      // Flush remaining buffered points
      flushPointBuffer();
      // Send stroke end
      websocket.sendStrokeEnd(trailManager.currentStrokeId);
    }
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
