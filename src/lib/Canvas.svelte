<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { TrailManager } from './trailManager.js';
  import { RemoteTrailsManager } from './remoteTrailsManager.js';
  import { RemoteCursorsManager } from './remoteCursors.js';
  import { TafelManager } from './tafelManager.js';
  import { clearCanvas, drawTrail, drawRemoteCursor, drawTafelStrokes, drawEraserCursor, setupHighDPICanvas } from './canvasRenderer.js';

  export let settings = {
    lifetimeMs: 15000,
    strokeWidth: 4,
    color: '#ffffff',
    drawStyle: 'line'
  };

  export let websocket = null;
  export let isMultiplayerMode = false;
  export let roomMode = 'trail'; // 'trail' or 'tafel'
  export let activeTool = 'pen'; // 'pen', 'brush', 'eraser'
  export let tafelManager = null; // Shared TafelManager instance

  const dispatch = createEventDispatcher();

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

  // Tafel mode state
  let currentTafelStroke = null; // Current stroke being drawn in tafel mode
  let eraserPath = []; // Points for eraser hit detection
  const ERASER_RADIUS = 20;

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
      window.removeEventListener('tafelStroke', handleRemoteTafelStroke);
      window.removeEventListener('tafelErase', handleRemoteTafelErase);
      window.removeEventListener('tafelClear', handleRemoteTafelClear);
      window.removeEventListener('tafelSync', handleTafelSync);
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
      // Clear canvas
      clearCanvas(ctx, canvas.width, canvas.height);

      if (roomMode === 'tafel') {
        // Tafel mode: Draw persistent strokes
        if (tafelManager) {
          const strokes = tafelManager.getAllStrokes();
          drawTafelStrokes(ctx, strokes);

          // Draw current stroke being drawn (if any)
          if (currentTafelStroke && currentTafelStroke.points.length > 0) {
            drawTafelStrokes(ctx, [currentTafelStroke]);
          }
        }

        // Draw eraser cursor when eraser is active and drawing
        if (activeTool === 'eraser' && isCanvasHovered) {
          drawEraserCursor(ctx, cursorPosition.x, cursorPosition.y, ERASER_RADIUS);
        }
      } else {
        // Trail mode: Clean up old points
        trailManager.cleanup();

        if (isMultiplayerMode && remoteTrailsManager && remoteCursorsManager) {
          remoteTrailsManager.cleanup();
          remoteCursorsManager.cleanup();
        }

        // Get active points
        const points = trailManager.getActivePoints();

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
        }
      }

      // Draw remote cursors in both modes
      if (isMultiplayerMode && remoteCursorsManager) {
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

    // Tafel mode listeners
    window.addEventListener('tafelStroke', handleRemoteTafelStroke);
    console.log('✅ tafelStroke listener added');
    window.addEventListener('tafelErase', handleRemoteTafelErase);
    console.log('✅ tafelErase listener added');
    window.addEventListener('tafelClear', handleRemoteTafelClear);
    console.log('✅ tafelClear listener added');
    window.addEventListener('tafelSync', handleTafelSync);
    console.log('✅ tafelSync listener added');
  }

  function handleRemoteTafelStroke(event) {
    console.log('📝 Received remote tafel stroke:', event.detail);
    const { stroke } = event.detail;
    if (tafelManager) {
      tafelManager.addStroke(stroke);
    }
  }

  function handleRemoteTafelErase(event) {
    console.log('🗑️ Received remote tafel erase:', event.detail);
    const { strokeIds } = event.detail;
    if (tafelManager) {
      tafelManager.deleteStrokes(strokeIds);
    }
  }

  function handleRemoteTafelClear(event) {
    console.log('🧹 Received remote tafel clear');
    if (tafelManager) {
      tafelManager.clearAll();
    }
  }

  function handleTafelSync(event) {
    console.log('📥 Received tafel sync:', event.detail);
    const { strokes } = event.detail;
    if (tafelManager && strokes) {
      tafelManager.importStrokes(strokes);
    }
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
    console.log('🖱️ Mouse down - mode:', roomMode, 'tool:', activeTool);
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (roomMode === 'tafel') {
      handleTafelMouseDown(x, y);
    } else {
      handleTrailMouseDown(x, y);
    }
  }

  function handleTrailMouseDown(x, y) {
    trailManager.startNewStroke();
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
        console.error('❌ Error in handleTrailMouseDown:', error);
      }
    }
  }

  function handleTafelMouseDown(x, y) {
    if (activeTool === 'eraser') {
      // Start eraser path
      eraserPath = [{ x, y }];
      // Check for strokes at this point
      if (tafelManager) {
        const hits = tafelManager.getStrokesAtPoint(x, y, ERASER_RADIUS);
        if (hits.length > 0) {
          // Delete hit strokes and broadcast
          tafelManager.deleteStrokes(hits);
          if (isMultiplayerMode && websocket) {
            websocket.sendTafelErase(hits);
          }
          dispatch('tafelErase', hits);
        }
      }
    } else {
      // Pen or Brush tool - start new stroke
      const strokeId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      currentTafelStroke = {
        strokeId,
        userId: null, // Will be set by App.svelte
        userName: null,
        tool: activeTool,
        color: settings.color,
        strokeWidth: settings.strokeWidth,
        points: [{ x, y, speed: 0, timestamp: Date.now() }],
        createdAt: Date.now()
      };
      console.log('📝 Started tafel stroke:', strokeId);
    }
  }

  function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Always update cursor position
    cursorPosition = { x, y };

    // Send cursor position if in multiplayer mode (throttled to 50ms)
    if (isMultiplayerMode && websocket) {
      const now = Date.now();
      if (now - lastCursorEmit > 50) {
        websocket.sendCursor(x, y);
        lastCursorEmit = now;
      }
    }

    // If drawing, add point based on mode
    if (isDrawing) {
      if (roomMode === 'tafel') {
        handleTafelMouseMove(x, y);
      } else {
        handleTrailMouseMove(x, y);
      }
    }
  }

  function handleTrailMouseMove(x, y) {
    trailManager.addPoint(x, y);

    // Buffer point for multiplayer
    if (isMultiplayerMode && websocket) {
      const lastPoint = trailManager.points[trailManager.points.length - 1];
      bufferPoint(lastPoint);
    }
  }

  function handleTafelMouseMove(x, y) {
    if (activeTool === 'eraser') {
      // Continue eraser path
      eraserPath.push({ x, y });

      // Check for strokes along the path
      if (tafelManager) {
        const hits = tafelManager.getStrokesAtPoint(x, y, ERASER_RADIUS);
        if (hits.length > 0) {
          tafelManager.deleteStrokes(hits);
          if (isMultiplayerMode && websocket) {
            websocket.sendTafelErase(hits);
          }
          dispatch('tafelErase', hits);
        }
      }
    } else if (currentTafelStroke) {
      // Add point to current stroke
      const lastPoint = currentTafelStroke.points[currentTafelStroke.points.length - 1];
      const now = Date.now();
      const dt = now - lastPoint.timestamp;
      const dx = x - lastPoint.x;
      const dy = y - lastPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = dt > 0 ? dist / dt : 0;

      currentTafelStroke.points.push({ x, y, speed, timestamp: now });
    }
  }

  function handleMouseUp() {
    if (!isDrawing) return;

    if (roomMode === 'tafel') {
      handleTafelMouseUp();
    } else {
      handleTrailMouseUp();
    }

    isDrawing = false;
  }

  function handleTrailMouseUp() {
    if (isMultiplayerMode && websocket) {
      // Flush remaining buffered points
      flushPointBuffer();
      // Send stroke end
      websocket.sendStrokeEnd(trailManager.currentStrokeId);
    }
  }

  function handleTafelMouseUp() {
    if (activeTool === 'eraser') {
      // Clear eraser path
      eraserPath = [];
    } else if (currentTafelStroke && currentTafelStroke.points.length > 0) {
      // Finalize the stroke - dispatch to App.svelte to handle
      console.log('📝 Finalizing tafel stroke:', currentTafelStroke.strokeId);
      dispatch('tafelStrokeComplete', currentTafelStroke);
      currentTafelStroke = null;
    }
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
    isCanvasHovered = true; // Touch implies hover
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    cursorPosition = { x, y };

    if (roomMode === 'tafel') {
      handleTafelMouseDown(x, y);
    } else {
      handleTrailTouchStart(x, y);
    }
  }

  function handleTrailTouchStart(x, y) {
    trailManager.startNewStroke();
    trailManager.addPoint(x, y);

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

    cursorPosition = { x, y };

    // Send cursor position if in multiplayer mode (throttled)
    if (isMultiplayerMode && websocket) {
      const now = Date.now();
      if (now - lastCursorEmit > 50) {
        websocket.sendCursor(x, y);
        lastCursorEmit = now;
      }
    }

    if (roomMode === 'tafel') {
      handleTafelMouseMove(x, y);
    } else {
      handleTrailTouchMove(x, y);
    }
  }

  function handleTrailTouchMove(x, y) {
    trailManager.addPoint(x, y);

    if (isMultiplayerMode && websocket) {
      const lastPoint = trailManager.points[trailManager.points.length - 1];
      bufferPoint(lastPoint);
    }
  }

  function handleTouchEnd(e) {
    e.preventDefault();
    if (!isDrawing) return;

    if (roomMode === 'tafel') {
      handleTafelMouseUp();
    } else {
      handleTrailMouseUp();
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
