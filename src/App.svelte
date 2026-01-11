<script>
  import { onMount } from 'svelte';
  import Canvas from './lib/Canvas.svelte';
  import Settings from './lib/Settings.svelte';
  import TestScreen from './lib/TestScreen.svelte';
  import NameInput from './lib/NameInput.svelte';
  import RoomJoin from './lib/RoomJoin.svelte';
  import UserList from './lib/UserList.svelte';
  import RoomInfo from './lib/RoomInfo.svelte';
  import { createWebSocket } from './lib/websocket.js';

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

  let appState = STATES.TESTING;
  let user = null;
  let roomCode = null;
  let websocket = null;

  let settings = {
    lifetimeMs: 15000,
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

  onMount(() => {
    // Generate session ID
    let storedSessionId = sessionStorage.getItem('multitrail_session_id');
    if (!storedSessionId) {
      storedSessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('multitrail_session_id', storedSessionId);
    }
    sessionId = storedSessionId;
    console.log('🆔 Session ID:', sessionId);

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
      appState = STATES.ROOM_SELECT;
      console.log('🔄 State changed to ROOM_SELECT');
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
    appState = STATES.ROOM_SELECT;
    console.log('🔄 State changed to ROOM_SELECT');
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
    console.log('🏠 Room code generated:', roomCode);
    console.log('🔄 Changing state to IN_ROOM...');
    appState = STATES.IN_ROOM;
    console.log('✅ State changed to IN_ROOM');
  }

  function handleJoinRoom({ detail: code }) {
    console.log('🚪 Joining room:', code);
    roomCode = code.toUpperCase();
    console.log('🔄 Changing state to IN_ROOM...');
    appState = STATES.IN_ROOM;
    console.log('✅ State changed to IN_ROOM');
  }

  function handleLeaveRoom() {
    console.log('🚪 Leaving room...');
    if (websocket) {
      console.log('🔌 Disconnecting WebSocket...');
      websocket.disconnect();
      websocket = null;
      console.log('✅ WebSocket disconnected');
    }
    roomCode = null;
    roomState = {
      users: [],
      sessionId: null,
      isHousemaster: false
    };
    appState = STATES.ROOM_SELECT;
    console.log('🔄 State changed to ROOM_SELECT');
  }

  // WebSocket connection - only when IN_ROOM
  $: if (appState === STATES.IN_ROOM && roomCode && user && !websocket) {
    console.log('🔌 Reactive: WebSocket connection triggered');
    console.log('🔌 appState:', appState);
    console.log('🔌 roomCode:', roomCode);
    console.log('🔌 user:', user);
    console.log('🔌 BACKEND_URL:', BACKEND_URL);

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

        if (state.connected && appState === STATES.IN_ROOM) {
          console.log('📡 WebSocket connected! Joining house...');
          console.log('📡 Joining house:', roomCode, 'as', user.displayName);
          try {
            websocket.joinHouse(roomCode, user.displayName);
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
    } catch (error) {
      console.error('❌ Error in WebSocket initialization:', error);
      throw error;
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
    />
  {:else if appState === STATES.IN_ROOM}
    <Canvas
      {settings}
      {websocket}
      isMultiplayerMode={true}
    />

    <Settings bind:settings on:update={handleSettingsUpdate} />

    <UserList
      users={roomState.users}
      currentUserId={roomState.sessionId}
    />

    <RoomInfo roomCode={roomCode} />

    <button class="leave-btn" on:click={handleLeaveRoom}>
      Leave Room
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
    padding: 12px 24px;
    background: rgba(255, 59, 48, 0.9);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    color: white;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    backdrop-filter: blur(10px);
    transition: all 0.2s;
    z-index: 100;
    box-shadow: 0 4px 12px rgba(255, 59, 48, 0.3);
  }

  .leave-btn:hover {
    background: rgba(255, 59, 48, 1);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(255, 59, 48, 0.4);
  }

  .leave-btn:active {
    transform: translateY(0);
  }

  @media (max-width: 600px) {
    .leave-btn {
      bottom: 10px;
      right: 10px;
      padding: 10px 20px;
      font-size: 0.85rem;
    }
  }
</style>
