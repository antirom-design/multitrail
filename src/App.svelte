<script>
  import { onMount } from 'svelte';
  import Canvas from './lib/Canvas.svelte';
  import TestScreen from './lib/TestScreen.svelte';
  import NameInput from './lib/NameInput.svelte';
  import RoomJoin from './lib/RoomJoin.svelte';
  import UserList from './lib/UserList.svelte';
  import OnlineIndicator from './lib/OnlineIndicator.svelte';
  import TopBar from './lib/TopBar.svelte';
  import TafelToolbar from './lib/TafelToolbar.svelte';
  import { createWebSocket } from './lib/websocket.js';
  import { TafelManager } from './lib/tafelManager.js';

  const BACKEND_URL = import.meta.env.PROD
    ? 'wss://funkhaus-websocket.onrender.com'
    : 'ws://localhost:3001';

  // States: TESTING → NAMED → ROOM_SELECT → IN_ROOM
  const STATES = {
    TESTING: 'TESTING',
    NAMED: 'NAMED',
    ROOM_SELECT: 'ROOM_SELECT',
    IN_ROOM: 'IN_ROOM'
  };

  // Color palette for users
  const COLOR_PALETTE = [
    '#FF6B6B', // red
    '#4ECDC4', // turquoise
    '#45B7D1', // blue
    '#FFA07A', // salmon
    '#98D8C8', // mint
    '#F7DC6F', // yellow
    '#BB8FCE', // purple
    '#85C1E2', // sky blue
    '#F8B739', // orange
    '#52C77A', // green
    '#FF85A1', // pink
    '#95E1D3'  // aqua
  ];

  function getRandomColor() {
    return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
  }

  let appState = STATES.TESTING;
  let user = null;
  let roomCode = null;
  let websocket = null;

  let settings = {
    lifetimeMs: 10000,
    strokeWidth: 4,
    color: '#ffffff',
    drawStyle: 'line',
    speedSettings: {
      enabled: false,
      minWidth: 1,
      maxWidth: 20,
      sensitivity: 1
    },
    fontSize: 24
  };

  let roomState = {
    users: [],
    sessionId: null,
    isHousemaster: false
  };

  let sessionId = null;
  let hasJoinedHouse = false; // Track if we've joined to prevent infinite loop
  let showUserList = false; // Toggle for user list overlay
  let autoJoinRoomCode = null; // Room code from QR scan

  // Tafel mode state
  let roomMode = 'tafel'; // 'trail' or 'tafel' - tafel is default
  let activeTool = 'pen'; // 'pen', 'brush', 'eraser'
  let tafelManager = null;

  function toggleUserList() {
    showUserList = !showUserList;
  }

  function closeUserList() {
    showUserList = false;
  }

  function requestFullscreen() {
    // Request fullscreen to hide URL bar on mobile
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(err => {
        console.log('Fullscreen request failed:', err);
      });
    } else if (elem.webkitRequestFullscreen) { // Safari
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { // IE11
      elem.msRequestFullscreen();
    }
  }

  function exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(err => {
        console.log('Exit fullscreen failed:', err);
      });
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }

  onMount(() => {
    // Generate session ID
    let storedSessionId = sessionStorage.getItem('multitrail_session_id');
    if (!storedSessionId) {
      storedSessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('multitrail_session_id', storedSessionId);
    }
    sessionId = storedSessionId;
    console.log('🆔 Session ID:', sessionId);

    // Check for room code in URL (QR scan)
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join');
    if (joinCode) {
      autoJoinRoomCode = joinCode.toUpperCase();
      console.log('🔗 Auto-join room code from URL:', autoJoinRoomCode);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Check for saved name
    const savedName = localStorage.getItem('multitrail_last_name');
    if (savedName && appState === STATES.TESTING) {
      // We'll set this after tests pass
    }
  });

  function handleTestsPass() {
    console.log('✅ Tests passed');
    // Check if we have a saved name
    const savedName = localStorage.getItem('multitrail_last_name');
    if (savedName) {
      console.log('📝 Using saved name:', savedName);
      user = { displayName: savedName };

      // Auto-join room if we have a code from QR scan
      if (autoJoinRoomCode) {
        console.log('🔗 Auto-joining room:', autoJoinRoomCode);
        roomCode = autoJoinRoomCode;
        settings.color = getRandomColor();
        appState = STATES.IN_ROOM;
        setTimeout(() => requestFullscreen(), 500);
      } else {
        appState = STATES.ROOM_SELECT;
        console.log('🔄 State changed to ROOM_SELECT');
      }
    } else {
      console.log('📝 No saved name, prompting for name');
      appState = STATES.NAMED;
      console.log('🔄 State changed to NAMED');
    }
  }

  function handleTestsFail(report) {
    console.error('❌ Tests failed:', report);
  }

  function handleSetName({ detail: displayName }) {
    console.log('📝 Setting name:', displayName);
    user = { displayName };
    localStorage.setItem('multitrail_last_name', displayName);

    // Auto-join room if we have a code from QR scan
    if (autoJoinRoomCode) {
      console.log('🔗 Auto-joining room:', autoJoinRoomCode);
      roomCode = autoJoinRoomCode;
      settings.color = getRandomColor();
      appState = STATES.IN_ROOM;
      setTimeout(() => requestFullscreen(), 500);
    } else {
      appState = STATES.ROOM_SELECT;
      console.log('🔄 State changed to ROOM_SELECT');
    }
  }

  function handleCreateRoom() {
    console.log('🎲 Creating new room...');
    // Generate 6-character room code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    roomCode = code;
    // Assign a random color to the user
    settings.color = getRandomColor();
    console.log('🏠 Room code generated:', roomCode);
    console.log('🎨 User color assigned:', settings.color);
    console.log('🔄 Changing state to IN_ROOM...');
    appState = STATES.IN_ROOM;
    console.log('✅ State changed to IN_ROOM');
    // Request fullscreen on mobile to hide URL bar
    setTimeout(() => requestFullscreen(), 500);
  }

  function handleJoinRoom({ detail: code }) {
    console.log('🚪 Joining room:', code);
    roomCode = code.toUpperCase();
    // Assign a random color to the user
    settings.color = getRandomColor();
    console.log('🎨 User color assigned:', settings.color);
    console.log('🔄 Changing state to IN_ROOM...');
    appState = STATES.IN_ROOM;
    console.log('✅ State changed to IN_ROOM');
    // Request fullscreen on mobile to hide URL bar
    setTimeout(() => requestFullscreen(), 500);
  }

  function handleChangeName({ detail: newName }) {
    console.log('✏️ Changing name to:', newName);
    user = { displayName: newName };
    localStorage.setItem('multitrail_last_name', newName);
    console.log('✅ Name updated');
  }

  function handleLeaveRoom() {
    console.log('🚪 Leaving room...');

    // Remove event listeners
    window.removeEventListener('modeChange', handleRemoteModeChange);
    window.removeEventListener('tafelClearMine', handleRemoteTafelClearMine);
    window.removeEventListener('tafelStroke', handleRemoteTafelStroke);
    window.removeEventListener('tafelClear', handleRemoteTafelClear);
    window.removeEventListener('roomInitialState', handleRoomInitialState);

    if (websocket) {
      console.log('🔌 Disconnecting WebSocket...');
      websocket.disconnect();
      websocket = null;
      console.log('✅ WebSocket disconnected');
    }
    roomCode = null;
    hasJoinedHouse = false; // Reset flag for next room join
    roomState = {
      users: [],
      sessionId: null,
      isHousemaster: false
    };

    // Reset Tafel state
    roomMode = 'trail';
    activeTool = 'pen';
    if (tafelManager) {
      tafelManager.clearAll();
      tafelManager = null;
    }

    appState = STATES.ROOM_SELECT;
    console.log('🔄 State changed to ROOM_SELECT');
    // Exit fullscreen when leaving room
    exitFullscreen();
  }

  // WebSocket connection - only when IN_ROOM
  $: if (appState === STATES.IN_ROOM && roomCode && user && !websocket) {
    console.log('🔌 Reactive: WebSocket connection triggered');
    console.log('🔌 appState:', appState);
    console.log('🔌 roomCode:', roomCode);
    console.log('🔌 user:', user);
    console.log('🔌 BACKEND_URL:', BACKEND_URL);

    // Initialize TafelManager
    tafelManager = new TafelManager();
    console.log('📝 TafelManager created');

    try {
      console.log('🔌 Creating WebSocket...');
      websocket = createWebSocket();
      console.log('✅ WebSocket object created:', websocket);

      console.log('🔌 Connecting to', BACKEND_URL);
      websocket.connect(BACKEND_URL);
      console.log('✅ WebSocket.connect() called');

      console.log('🔌 Subscribing to WebSocket state updates...');
      websocket.subscribe(state => {
        console.log('📡 WebSocket state update received:', state);

        if (state.connected && appState === STATES.IN_ROOM && !hasJoinedHouse) {
          console.log('📡 WebSocket connected! Joining house...');
          console.log('📡 Joining house:', roomCode, 'as', user.displayName);
          try {
            websocket.joinHouse(roomCode, user.displayName);
            hasJoinedHouse = true; // Prevent re-joining
            console.log('✅ joinHouse() called successfully');
          } catch (error) {
            console.error('❌ Error calling joinHouse:', error);
          }
        }

        if (state.rooms && state.rooms.length > 0) {
          console.log('📡 Received room list:', state.rooms);
          roomState.users = state.rooms;
          roomState.sessionId = state.sessionId;
          roomState.isHousemaster = state.isHousemaster;
          console.log('✅ Room state updated:', roomState);
        }
      });
      console.log('✅ WebSocket subscription setup complete');

      // Set up mode change listener
      setupModeChangeListener();
    } catch (error) {
      console.error('❌ Error in WebSocket initialization:', error);
      throw error;
    }
  }

  function setupModeChangeListener() {
    window.addEventListener('modeChange', handleRemoteModeChange);
    window.addEventListener('tafelClearMine', handleRemoteTafelClearMine);
    window.addEventListener('tafelStroke', handleRemoteTafelStroke);
    window.addEventListener('tafelClear', handleRemoteTafelClear);
    window.addEventListener('roomInitialState', handleRoomInitialState);
  }

  function handleRemoteModeChange(event) {
    console.log('🔄 Received mode change:', event.detail);
    const { mode } = event.detail;

    // Always apply mode change from server (includes our own echo back)
    roomMode = mode;

    // Clear tafel when mode changes
    if (tafelManager) {
      tafelManager.clearAll();
    }

    // Reset tool to pen
    activeTool = 'pen';
  }

  function handleRemoteTafelClearMine(event) {
    console.log('🧹 Received tafelClearMine:', event.detail);
    const { sessionId: senderId } = event.detail;
    if (tafelManager && senderId) {
      tafelManager.clearUserStrokes(senderId);
    }
  }

  function handleRemoteTafelStroke(event) {
    console.log('📝 Received tafelStroke:', event.detail);
    const { stroke } = event.detail;
    if (tafelManager && stroke) {
      tafelManager.addStroke(stroke);
    }
  }

  function handleRemoteTafelClear(event) {
    console.log('🧹 Received tafelClear:', event.detail);
    if (tafelManager) {
      tafelManager.clearAll();
    }
  }

  function handleRoomInitialState(event) {
    console.log('📋 Received room initial state:', event.detail);
    const { mode, tafelStrokes } = event.detail;

    // Set the room mode
    roomMode = mode;
    console.log('🔄 Set room mode to:', mode);

    // Import existing tafel strokes
    if (tafelManager && tafelStrokes && tafelStrokes.length > 0) {
      tafelManager.importStrokes(tafelStrokes);
      console.log('📝 Imported', tafelStrokes.length, 'tafel strokes');
    }
  }

  function handleSettingsUpdate(event) {
    settings = { ...event.detail };

    // Broadcast settings update if in room
    if (appState === STATES.IN_ROOM && websocket) {
      websocket.sendSettings({
        color: settings.color,
        strokeWidth: settings.strokeWidth,
        drawStyle: settings.drawStyle,
        fontSize: settings.fontSize
      });
    }
  }

  // Tafel Toolbar handlers
  function handleToolChange(event) {
    activeTool = event.detail;
    console.log('🔧 Tool changed to:', activeTool);
  }

  function handleColorChange(event) {
    settings.color = event.detail;
    settings = { ...settings };
    console.log('🎨 Color changed to:', settings.color);

    // Broadcast color change
    if (appState === STATES.IN_ROOM && websocket) {
      websocket.sendUserColorChange(settings.color);
    }
  }

  function handleBrushSizeChange(event) {
    settings.strokeWidth = event.detail;
    settings = { ...settings };
    console.log('📏 Brush size changed to:', settings.strokeWidth);
  }

  // Host Controls handlers
  function handleModeChange(event) {
    const newMode = event.detail;
    console.log('🔄 Mode change requested:', newMode);

    roomMode = newMode;

    // Clear tafel when mode changes
    if (tafelManager) {
      tafelManager.clearAll();
    }

    // Reset tool to pen
    activeTool = 'pen';

    // Broadcast mode change
    if (websocket) {
      websocket.sendModeChange(newMode);
    }
  }

  function handleClearTafel() {
    console.log('🧹 Clear tafel requested');

    if (tafelManager) {
      tafelManager.clearAll();
    }

    // Broadcast clear
    if (websocket) {
      websocket.sendTafelClear();
    }
  }

  function handleClearMyDrawings() {
    console.log('🧹 Clear my drawings requested');

    if (tafelManager && roomState.sessionId) {
      tafelManager.clearUserStrokes(roomState.sessionId);
    }

    // Broadcast to others
    if (websocket) {
      websocket.sendTafelClearMine();
    }
  }

  // Canvas Tafel handlers
  function handleTafelStrokeComplete(event) {
    const stroke = event.detail;
    console.log('📝 Tafel stroke complete:', stroke.strokeId);

    // Add user info to stroke
    stroke.userId = roomState.sessionId;
    stroke.userName = user?.displayName || 'Unknown';

    // Add to local tafel manager
    if (tafelManager) {
      tafelManager.addStroke(stroke);
    }

    // Broadcast to other clients
    if (websocket) {
      websocket.sendTafelStroke(stroke);
    }
  }

  function handleTafelErase(event) {
    const strokeIds = event.detail;
    console.log('🗑️ Tafel erase:', strokeIds);
    // Already deleted locally in Canvas.svelte, just log
  }
</script>

<main>
  {#if appState === STATES.TESTING}
    <TestScreen
      backendUrl={BACKEND_URL}
      on:testsPass={handleTestsPass}
      on:testsFail={handleTestsFail}
    />
  {:else if appState === STATES.NAMED}
    <NameInput on:submit={handleSetName} />
  {:else if appState === STATES.ROOM_SELECT}
    <RoomJoin
      displayName={user?.displayName}
      on:createRoom={handleCreateRoom}
      on:joinRoom={handleJoinRoom}
      on:changeName={handleChangeName}
    />
  {:else if appState === STATES.IN_ROOM}
    <Canvas
      {settings}
      {websocket}
      isMultiplayerMode={true}
      {roomMode}
      {activeTool}
      {tafelManager}
      on:tafelStrokeComplete={handleTafelStrokeComplete}
      on:tafelErase={handleTafelErase}
    />

    <TopBar
      roomCode={roomCode}
      {roomMode}
      isHousemaster={roomState.isHousemaster}
      bind:settings
      on:modeChange={handleModeChange}
      on:settingsUpdate={handleSettingsUpdate}
    />

    {#if roomMode === 'tafel'}
      <TafelToolbar
        {activeTool}
        activeColor={settings.color}
        brushSize={settings.strokeWidth}
        on:toolChange={handleToolChange}
        on:colorChange={handleColorChange}
        on:brushSizeChange={handleBrushSizeChange}
        on:clearMyDrawings={handleClearMyDrawings}
      />
    {/if}

    <OnlineIndicator
      userCount={roomState.users.length}
      on:click={toggleUserList}
    />

    <UserList
      users={roomState.users}
      currentUserId={roomState.sessionId}
      show={showUserList}
      on:close={closeUserList}
    />

    <button class="leave-btn" on:click={handleLeaveRoom} aria-label="Leave Room" title="Leave Room">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
    </button>
  {/if}
</main>

<style>
  main {
    width: 100%;
    height: 100%;
    display: block;
  }

  .leave-btn {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px;
    background: rgba(255, 59, 48, 0.9);
    border: none;
    border-radius: 50%;
    color: white;
    cursor: pointer;
    backdrop-filter: blur(10px);
    transition: all 0.2s;
    z-index: 100;
    box-shadow: 0 4px 12px rgba(255, 59, 48, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .leave-btn:hover {
    background: rgba(255, 59, 48, 1);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(255, 59, 48, 0.4);
  }

  .leave-btn:active {
    transform: translateY(0);
  }

  .leave-btn svg {
    display: block;
  }

  @media (max-width: 600px) {
    .leave-btn {
      bottom: 10px;
      right: 10px;
      padding: 10px;
    }

    .leave-btn svg {
      width: 18px;
      height: 18px;
    }
  }
</style>
