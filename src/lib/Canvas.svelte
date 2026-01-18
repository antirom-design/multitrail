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
    console.log('🎨 Canvas onMount - Starting initialization...');
    console.log('🎨 isMultiplayerMode:', isMultiplayerMode);
    console.log('🎨 websocket:', websocket);
    console.log('🎨 settings:', settings);

    // Initialize trail manager with initial lifetime
    console.log('🎨 Creating TrailManager...');
    trailManager = new TrailManager(settings.lifetimeMs);
    console.log('✅ TrailManager created');

    // Initialize multiplayer managers if in multiplayer mode
    if (isMultiplayerMode) {
      console.log('🎨 Multiplayer mode enabled - initializing managers...');
      try {
        console.log('🎨 Creating RemoteTrailsManager...');
        remoteTrailsManager = new RemoteTrailsManager();
        console.log('✅ RemoteTrailsManager created');

        console.log('🎨 Creating RemoteCursorsManager...');
        remoteCursorsManager = new RemoteCursorsManager();
        console.log('✅ RemoteCursorsManager created');

        console.log('🎨 Setting up multiplayer listeners...');
        setupMultiplayerListeners();
        console.log('✅ Multiplayer listeners setup complete');
      } catch (error) {
        console.error('❌ Error initializing multiplayer managers:', error);
        throw error;
      }
    }

    // Set up canvas for high-DPI displays
    console.log('🎨 Resizing canvas...');
    resizeCanvas();
    console.log('✅ Canvas resized');

    // Start animation loop
    console.log('🎨 Starting animation loop...');
    startAnimationLoop();
    console.log('✅ Animation loop started');

    // Handle window resize
    console.log('🎨 Adding window event listeners...');
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('keydown', handleKeyDown);
    console.log('✅ Window event listeners added');

    console.log('✅ Canvas onMount complete!');
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
          drawRemoteCursor(ctx, cursor.x, cursor.y, cursor.userName, cursor.color);
        });
      }

      // Continue loop
      animationFrameId = requestAnimationFrame(animate);
    }

    animate();
  }

  // Multiplayer setup and handlers
  function setupMultiplayerListeners() {
    console.log('🔌 Setting up multiplayer event listeners...');
    window.addEventListener('remoteDrawPoints', handleRemotePoints);
    console.log('✅ remoteDrawPoints listener added');
    window.addEventListener('remoteCursor', handleRemoteCursor);
    console.log('✅ remoteCursor listener added');
    window.addEventListener('remoteSettings', handleRemoteSettings);
    console.log('✅ remoteSettings listener added');
  }

  function handleRemotePoints(event) {
    console.log('📍 Received remote points:', event.detail);
    const { sessionId, userName, points } = event.detail;
    if (remoteTrailsManager) {
      remoteTrailsManager.addUser(sessionId, userName);
      remoteTrailsManager.addPoints(sessionId, points);
      console.log(`✅ Added ${points.length} points for user ${userName}`);
    } else {
      console.warn('⚠️ remoteTrailsManager not initialized');
    }
  }

  function handleRemoteCursor(event) {
    console.log('🖱️ Received remote cursor:', event.detail);
    const { sessionId, userName, x, y } = event.detail;
    if (remoteCursorsManager && remoteTrailsManager) {
      // Get the user's color from their settings
      const userMeta = remoteTrailsManager.userMeta.get(sessionId);
      const color = userMeta?.settings?.color || '#ffffff';
      remoteCursorsManager.updateCursor(sessionId, userName, x, y, color);
    } else {
      console.warn('⚠️ remoteCursorsManager or remoteTrailsManager not initialized');
    }
  }

  function handleRemoteSettings(event) {
    console.log('⚙️ Received remote settings:', event.detail);
    const { sessionId, settings: userSettings } = event.detail;
    if (remoteTrailsManager) {
      remoteTrailsManager.updateSettings(sessionId, userSettings);
    } else {
      console.warn('⚠️ remoteTrailsManager not initialized for settings update');
    }
  }

  // Point buffering for multiplayer
  function bufferPoint(point) {
    console.log('📦 Buffering point:', point);
    pointBuffer.push(point);

    // Send batch every 32ms (30 FPS) or when buffer reaches 10 points
    if (pointBuffer.length >= 10) {
      console.log('📦 Buffer full (10 points), flushing...');
      flushPointBuffer();
    } else if (!pointBatchTimeout) {
      console.log('📦 Starting batch timeout (32ms)...');
      pointBatchTimeout = setTimeout(flushPointBuffer, 32);
    }
  }

  function flushPointBuffer() {
    console.log(`📤 Flushing ${pointBuffer.length} points. WebSocket:`, websocket);
    if (pointBuffer.length > 0 && websocket) {
      try {
        console.log('📤 Calling websocket.sendPoints with', pointBuffer.length, 'points');
        websocket.sendPoints([...pointBuffer]);
        console.log('✅ Points sent successfully');
        pointBuffer = [];
      } catch (error) {
        console.error('❌ Error sending points:', error);
      }
    } else {
      if (!websocket) {
        console.warn('⚠️ Cannot flush points - websocket is null');
      }
      if (pointBuffer.length === 0) {
        console.log('ℹ️ Buffer is empty, nothing to flush');
      }
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
    console.log('🖱️ Mouse down');
    isDrawing = true;
    trailManager.startNewStroke(); // Start a new stroke
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    trailManager.addPoint(x, y);

    // Send stroke start and point to WebSocket if in multiplayer mode
    if (isMultiplayerMode && websocket) {
      console.log('📤 Sending stroke start. Multiplayer:', isMultiplayerMode, 'WebSocket:', websocket);
      try {
        websocket.sendStrokeStart(trailManager.currentStrokeId);
        console.log('✅ Stroke start sent');
        const lastPoint = trailManager.points[trailManager.points.length - 1];
        bufferPoint(lastPoint);
      } catch (error) {
        console.error('❌ Error in handleMouseDown:', error);
      }
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
