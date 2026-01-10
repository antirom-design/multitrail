<script>
  import Canvas from './lib/Canvas.svelte';
  import Settings from './lib/Settings.svelte';
  import RoomJoin from './lib/RoomJoin.svelte';
  import UserList from './lib/UserList.svelte';
  import RoomInfo from './lib/RoomInfo.svelte';
  import { createWebSocket } from './lib/websocket.js';

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

  // Multiplayer state
  let websocket = null;
  let multiplayerMode = false;
  let inRoom = false;
  let roomState = {
    code: '',
    users: [],
    sessionId: null,
    isHousemaster: false
  };

  function handleJoinRoom({ detail }) {
    const { roomCode, userName } = detail;

    // Determine WebSocket URL based on environment
    const wsUrl = import.meta.env.PROD
      ? 'wss://funkhaus-websocket.onrender.com'
      : 'ws://localhost:3001';

    // Initialize WebSocket
    websocket = createWebSocket();
    websocket.connect(wsUrl);

    // Subscribe to WebSocket state changes
    websocket.subscribe(state => {
      if (state.connected && !inRoom) {
        // Join the house/room
        websocket.joinHouse(roomCode, userName);
      }

      if (state.rooms && state.rooms.length > 0) {
        roomState.users = state.rooms;
        roomState.sessionId = state.sessionId;
        roomState.isHousemaster = state.isHousemaster;
        inRoom = true;
        multiplayerMode = true;
        roomState.code = roomCode;
      }
    });
  }

  function handleSettingsUpdate(event) {
    settings = { ...event.detail };

    // Broadcast settings update if in multiplayer
    if (multiplayerMode && websocket && inRoom) {
      websocket.sendSettings({
        color: settings.color,
        strokeWidth: settings.strokeWidth,
        drawStyle: settings.drawStyle,
        fontSize: settings.fontSize
      });
    }
  }

  function toggleMultiplayer() {
    if (!multiplayerMode) {
      // Show join screen
      multiplayerMode = true;
      inRoom = false;
    } else {
      // Leave room
      if (websocket) {
        websocket.disconnect();
        websocket = null;
      }
      multiplayerMode = false;
      inRoom = false;
      roomState = {
        code: '',
        users: [],
        sessionId: null,
        isHousemaster: false
      };
    }
  }
</script>

<main>
  {#if multiplayerMode && !inRoom}
    <RoomJoin on:join={handleJoinRoom} />
  {:else}
    <Canvas
      {settings}
      {websocket}
      isMultiplayerMode={multiplayerMode && inRoom}
    />

    <Settings bind:settings on:update={handleSettingsUpdate} />

    {#if multiplayerMode && inRoom}
      <UserList
        users={roomState.users}
        currentUserId={roomState.sessionId}
      />
      <RoomInfo roomCode={roomState.code} />
    {/if}

    <!-- Multiplayer toggle button -->
    <button class="mp-toggle" on:click={toggleMultiplayer}>
      {multiplayerMode ? 'Leave Room' : 'Join Multiplayer'}
    </button>
  {/if}
</main>

<style>
  main {
    width: 100%;
    height: 100%;
    display: block;
  }

  .mp-toggle {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 24px;
    background: rgba(0, 0, 0, 0.7);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    color: white;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    backdrop-filter: blur(10px);
    transition: all 0.2s;
    z-index: 100;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .mp-toggle:hover {
    background: rgba(0, 0, 0, 0.85);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  }

  .mp-toggle:active {
    transform: translateY(0);
  }

  /* Mobile responsiveness */
  @media (max-width: 600px) {
    .mp-toggle {
      bottom: 10px;
      right: 10px;
      padding: 10px 20px;
      font-size: 0.85rem;
    }
  }
</style>
