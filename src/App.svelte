<script>
  import { onMount } from "svelte";
  import Canvas from "./lib/Canvas.svelte";
  import TestScreen from "./lib/TestScreen.svelte";
  import NameInput from "./lib/NameInput.svelte";
  import RoomJoin from "./lib/RoomJoin.svelte";
  import UserList from "./lib/UserList.svelte";
  import OnlineIndicator from "./lib/OnlineIndicator.svelte";
  import TopBar from "./lib/TopBar.svelte";
  import TafelToolbar from "./lib/TafelToolbar.svelte";
  import QuizView from "./lib/QuizView.svelte";
  import AvatarView from "./lib/AvatarView.svelte";
  import AvatarCustomizeModal from "./lib/AvatarCustomizeModal.svelte";
  import { createWebSocket } from "./lib/websocket.js";
  import { TafelManager } from "./lib/tafelManager.js";

  const BACKEND_URL = import.meta.env.PROD
    ? "wss://funkhaus-websocket.onrender.com"
    : "ws://localhost:3001";

  // States: TESTING → NAMED → ROOM_SELECT → IN_ROOM
  const STATES = {
    TESTING: "TESTING",
    NAMED: "NAMED",
    ROOM_SELECT: "ROOM_SELECT",
    IN_ROOM: "IN_ROOM",
  };

  // Color palette for users
  const COLOR_PALETTE = [
    "#FF6B6B", // red
    "#4ECDC4", // turquoise
    "#45B7D1", // blue
    "#FFA07A", // salmon
    "#98D8C8", // mint
    "#F7DC6F", // yellow
    "#BB8FCE", // purple
    "#85C1E2", // sky blue
    "#F8B739", // orange
    "#52C77A", // green
    "#FF85A1", // pink
    "#95E1D3", // aqua
  ];

  function getRandomColor() {
    return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
  }

  let appState = STATES.TESTING;
  let user = null;
  let roomCode = null;
  let websocket = null;

  let settings = {
    lifetimeMs: 7500,
    strokeWidth: 4,
    color: "#ffffff",
    drawStyle: "line",
    speedSettings: {
      enabled: false,
      minWidth: 1,
      maxWidth: 20,
      sensitivity: 1,
    },
    fontSize: 24,
  };

  let roomState = {
    users: [],
    sessionId: null,
    isHousemaster: false,
  };

  let sessionId = null;
  let initialized = false; // Guard: don't persist to localStorage until onMount is done
  let hasJoinedHouse = false; // Track if we've joined to prevent infinite loop
  let showUserList = false; // Toggle for user list overlay
  let showAvatarModal = false; // Toggle for avatar customization modal
  let avatarViewRef = null; // Reference to AvatarView for reloading customization
  let autoJoinRoomCode = null; // Room code from QR scan
  let showShareModal = false; // Show share modal after room creation

  // Tafel mode state
  let roomMode = "avatar"; // 'avatar', 'tafel', 'trail', or 'quiz'
  let activeTool = "pen"; // 'pen', 'brush', 'eraser'
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
      elem.requestFullscreen().catch((err) => {
        console.log("Fullscreen request failed:", err);
      });
    } else if (elem.webkitRequestFullscreen) {
      // Safari
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      // IE11
      elem.msRequestFullscreen();
    }
  }

  function exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch((err) => {
        console.log("Exit fullscreen failed:", err);
      });
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }

  // Persistence logic
  $: if (initialized && appState) localStorage.setItem("multitrail_app_state", appState);
  $: if (initialized && roomCode) localStorage.setItem("multitrail_room_code", roomCode);
  $: if (initialized && roomMode) localStorage.setItem("multitrail_room_mode", roomMode);
  $: if (initialized && sessionId) localStorage.setItem("multitrail_session_id", sessionId);
  $: if (initialized && settings.color && settings.color !== "#ffffff")
    localStorage.setItem("multitrail_color", settings.color);
  $: if (user && user.displayName)
    localStorage.setItem("multitrail_last_name", user.displayName);

  onMount(() => {
    // Generate or restore session ID
    let storedSessionId = localStorage.getItem("multitrail_session_id");
    if (!storedSessionId) {
      storedSessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("multitrail_session_id", storedSessionId);
    }
    sessionId = storedSessionId;
    console.log("🆔 Session ID:", sessionId);

    // Restore name from long-term storage
    const savedName = localStorage.getItem("multitrail_last_name");
    if (savedName) {
      user = { displayName: savedName };
      console.log("👤 Restored user name:", savedName);
    }

    // Check for room code in URL (QR scan takes precedence)
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get("join");
    if (joinCode) {
      autoJoinRoomCode = joinCode.toUpperCase();
      console.log("🔗 Auto-join room code from URL:", autoJoinRoomCode);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Check for active room session (for page reload)
    const savedRoomCode = localStorage.getItem("multitrail_room_code");
    const savedColor = localStorage.getItem("multitrail_color");
    const savedState = localStorage.getItem("multitrail_app_state");
    const savedMode = localStorage.getItem("multitrail_room_mode");

    if (savedRoomCode && !autoJoinRoomCode) {
      roomCode = savedRoomCode;
      if (savedColor) settings.color = savedColor;
      if (savedMode) roomMode = savedMode;
      console.log("🔄 Restoring room session:", savedRoomCode);

      // If we were in a room, and have a name, jump back
      if (savedState === STATES.IN_ROOM && user) {
        console.log("🚀 Fast recovery to IN_ROOM");
        // We'll set appState here, which will trigger websocket connection
        appState = STATES.IN_ROOM;
      }
    }

    // Now allow reactive statements to persist to localStorage
    initialized = true;
  });

  function handleTestsPass() {
    console.log("✅ Tests passed");
    // If we already restored into a room, don't override
    if (appState === STATES.IN_ROOM) {
      console.log("🚀 Already in room, skipping test flow");
      return;
    }
    // Check if we have a saved name
    const savedName = localStorage.getItem("multitrail_last_name");
    if (savedName) {
      console.log("📝 Using saved name:", savedName);
      user = { displayName: savedName };

      // Auto-join room if we have a code from QR scan or reload
      if (autoJoinRoomCode) {
        console.log("🔗 Auto-joining room:", autoJoinRoomCode);
        roomCode = autoJoinRoomCode;
        // Only generate new color if not restoring from session
        if (!settings.color || settings.color === "#ffffff") {
          settings.color = getRandomColor();
        }
        // Save to localStorage
        localStorage.setItem("multitrail_room_code", roomCode);
        localStorage.setItem("multitrail_color", settings.color);
        appState = STATES.IN_ROOM;
        setTimeout(() => requestFullscreen(), 500);
      } else {
        appState = STATES.ROOM_SELECT;
        console.log("🔄 State changed to ROOM_SELECT");
      }
    } else {
      console.log("📝 No saved name, prompting for name");
      appState = STATES.NAMED;
      console.log("🔄 State changed to NAMED");
    }
  }

  function handleTestsFail(report) {
    console.error("❌ Tests failed:", report);
  }

  function handleSetName({ detail: displayName }) {
    console.log("📝 Setting name:", displayName);
    user = { displayName };
    localStorage.setItem("multitrail_last_name", displayName);

    // Auto-join room if we have a code from QR scan
    if (autoJoinRoomCode) {
      console.log("🔗 Auto-joining room:", autoJoinRoomCode);
      roomCode = autoJoinRoomCode;
      settings.color = getRandomColor();
      // Save to localStorage
      localStorage.setItem("multitrail_room_code", roomCode);
      localStorage.setItem("multitrail_color", settings.color);
      appState = STATES.IN_ROOM;
      setTimeout(() => requestFullscreen(), 500);
    } else {
      appState = STATES.ROOM_SELECT;
      console.log("🔄 State changed to ROOM_SELECT");
    }
  }

  function handleCreateRoom() {
    console.log("🎲 Creating new room...");
    // Generate 6-character room code
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    roomCode = code;
    // Assign a random color to the user
    settings.color = getRandomColor();
    console.log("🏠 Room code generated:", roomCode);
    console.log("🎨 User color assigned:", settings.color);

    // Save to localStorage for persistence
    localStorage.setItem("multitrail_room_code", roomCode);
    localStorage.setItem("multitrail_color", settings.color);

    roomState = { ...roomState, isHousemaster: true };

    console.log("🔄 Changing state to IN_ROOM...");
    appState = STATES.IN_ROOM;
    console.log("✅ State changed to IN_ROOM");
    // Request fullscreen on mobile to hide URL bar
    setTimeout(() => requestFullscreen(), 500);
  }

  function handleJoinRoom({ detail: code }) {
    console.log("🚪 Joining room:", code);
    roomCode = code.toUpperCase();
    // Assign a random color to the user
    settings.color = getRandomColor();
    console.log("🎨 User color assigned:", settings.color);

    // Save to localStorage for persistence
    localStorage.setItem("multitrail_room_code", roomCode);
    localStorage.setItem("multitrail_color", settings.color);

    console.log("🔄 Changing state to IN_ROOM...");
    appState = STATES.IN_ROOM;
    console.log("✅ State changed to IN_ROOM");
    // Request fullscreen on mobile to hide URL bar
    setTimeout(() => requestFullscreen(), 500);
  }

  function handleChangeName({ detail: newName }) {
    console.log("✏️ Changing name to:", newName);
    user = { displayName: newName };
    localStorage.setItem("multitrail_last_name", newName);
    console.log("✅ Name updated");
  }

  function handleLeaveRoom() {
    console.log("🚪 Leaving room...");

    // Clear localStorage (so reopen won't rejoin)
    localStorage.removeItem("multitrail_room_code");
    localStorage.removeItem("multitrail_color");
    localStorage.removeItem("multitrail_app_state");
    localStorage.removeItem("multitrail_room_mode");

    // Remove event listeners
    window.removeEventListener("modeChange", handleRemoteModeChange);
    window.removeEventListener(
      "roomLifetimeChange",
      handleRemoteLifetimeChange,
    );
    window.removeEventListener("tafelClearMine", handleRemoteTafelClearMine);
    window.removeEventListener("tafelStroke", handleRemoteTafelStroke);
    window.removeEventListener("tafelClear", handleRemoteTafelClear);
    window.removeEventListener("roomInitialState", handleRoomInitialState);

    if (websocket) {
      console.log("🔌 Disconnecting WebSocket...");
      websocket.disconnect();
      websocket = null;
      console.log("✅ WebSocket disconnected");
    }
    roomCode = null;
    hasJoinedHouse = false; // Reset flag for next room join
    roomState = {
      users: [],
      sessionId: null,
      isHousemaster: false,
    };

    // Reset mode state
    roomMode = "avatar";
    activeTool = "pen";
    if (tafelManager) {
      tafelManager.clearAll();
      tafelManager = null;
    }

    appState = STATES.ROOM_SELECT;
    console.log("🔄 State changed to ROOM_SELECT");
    // Exit fullscreen when leaving room
    exitFullscreen();
  }

  // WebSocket connection - only when IN_ROOM
  $: if (appState === STATES.IN_ROOM && roomCode && user && !websocket) {
    console.log("🔌 Reactive: WebSocket connection triggered");
    console.log("🔌 appState:", appState);
    console.log("🔌 roomCode:", roomCode);
    console.log("🔌 user:", user);
    console.log("🔌 BACKEND_URL:", BACKEND_URL);

    // Initialize TafelManager
    tafelManager = new TafelManager();
    console.log("📝 TafelManager created");

    try {
      console.log("🔌 Creating WebSocket with sessionId:", sessionId);
      websocket = createWebSocket(sessionId);
      console.log("✅ WebSocket object created:", websocket);

      console.log("🔌 Connecting to", BACKEND_URL);
      websocket.connect(BACKEND_URL);
      console.log("✅ WebSocket.connect() called");

      console.log("🔌 Subscribing to WebSocket state updates...");
      websocket.subscribe((state) => {
        if (state.connected && appState === STATES.IN_ROOM && !hasJoinedHouse) {
          console.log("📡 WebSocket connected! Joining house...");
          console.log("📡 Joining house:", roomCode, "as", user.displayName);
          try {
            websocket.joinHouse(roomCode, user.displayName);
            hasJoinedHouse = true; // Prevent re-joining
            console.log("✅ joinHouse() called successfully");
          } catch (error) {
            console.error("❌ Error calling joinHouse:", error);
          }
        }

        if (state.rooms && state.rooms.length > 0) {
          roomState = {
            ...roomState,
            users: state.rooms,
            sessionId: state.sessionId,
            isHousemaster: state.isHousemaster,
          };
        }
      });
      console.log("✅ WebSocket subscription setup complete");

      // Set up mode change listener
      setupModeChangeListener();
    } catch (error) {
      console.error("❌ Error in WebSocket initialization:", error);
      throw error;
    }
  }

  function setupModeChangeListener() {
    window.addEventListener("modeChange", handleRemoteModeChange);
    window.addEventListener("roomLifetimeChange", handleRemoteLifetimeChange);
    window.addEventListener("tafelClearMine", handleRemoteTafelClearMine);
    window.addEventListener("tafelStroke", handleRemoteTafelStroke);
    window.addEventListener("tafelClear", handleRemoteTafelClear);
    window.addEventListener("roomInitialState", handleRoomInitialState);
  }

  function handleRemoteModeChange(event) {
    console.log("🔄 Received mode change:", event.detail);
    const { mode } = event.detail;

    // Always apply mode change from server (includes our own echo back)
    roomMode = mode;

    // Clear tafel when mode changes
    if (tafelManager) {
      tafelManager.clearAll();
    }

    // Reset tool to pen
    activeTool = "pen";
  }

  function handleRemoteLifetimeChange(event) {
    console.log("⏱️ Received lifetime change:", event.detail);
    const { lifetimeMs } = event.detail;

    // Update local settings
    settings.lifetimeMs = lifetimeMs;
    settings = { ...settings }; // Trigger reactivity
    console.log("⏱️ Trail lifetime updated to:", lifetimeMs / 1000, "s");
  }

  function handleRemoteTafelClearMine(event) {
    console.log("🧹 Received tafelClearMine:", event.detail);
    const { sessionId: senderId } = event.detail;
    if (tafelManager && senderId) {
      tafelManager.clearUserStrokes(senderId);
    }
  }

  function handleRemoteTafelStroke(event) {
    console.log("📝 Received tafelStroke:", event.detail);
    const { stroke } = event.detail;
    if (tafelManager && stroke) {
      tafelManager.addStroke(stroke);
    }
  }

  function handleRemoteTafelClear(event) {
    console.log("🧹 Received tafelClear:", event.detail);
    if (tafelManager) {
      tafelManager.clearAll();
    }
  }

  function handleRoomInitialState(event) {
    console.log("📋 Received room initial state:", event.detail);
    const { mode, tafelStrokes } = event.detail;

    // If housemaster and no existing strokes (new room), enforce 'avatar' mode
    const isNewRoom = !tafelStrokes || tafelStrokes.length === 0;
    if (roomState.isHousemaster && isNewRoom && mode !== "avatar") {
      console.log("🔄 New room created by host, enforcing avatar mode");
      roomMode = "avatar";
      // Notify server about the mode
      if (websocket) {
        websocket.sendModeChange("avatar");
      }
    } else {
      // Use server's mode for existing rooms or when joining
      roomMode = mode;
      console.log("🔄 Set room mode to:", mode);
    }

    // Import existing tafel strokes
    if (tafelManager && tafelStrokes && tafelStrokes.length > 0) {
      tafelManager.importStrokes(tafelStrokes);
      console.log("📝 Imported", tafelStrokes.length, "tafel strokes");
    }
  }

  function handleSettingsUpdate(event) {
    const oldLifetimeMs = settings.lifetimeMs;
    settings = { ...event.detail };

    // Broadcast settings update if in room
    if (appState === STATES.IN_ROOM && websocket) {
      websocket.sendSettings({
        color: settings.color,
        strokeWidth: settings.strokeWidth,
        drawStyle: settings.drawStyle,
        fontSize: settings.fontSize,
      });

      // If housemaster changed trail lifetime, broadcast to all
      if (roomState.isHousemaster && settings.lifetimeMs !== oldLifetimeMs) {
        console.log(
          "⏱️ Housemaster changing trail lifetime to:",
          settings.lifetimeMs,
        );
        websocket.sendRoomLifetimeChange(settings.lifetimeMs);
      }
    }
  }

  // Tafel Toolbar handlers
  function handleToolChange(event) {
    activeTool = event.detail;
    console.log("🔧 Tool changed to:", activeTool);
  }

  function handleColorChange(event) {
    settings.color = event.detail;
    settings = { ...settings };
    console.log("🎨 Color changed to:", settings.color);

    // Broadcast color change
    if (appState === STATES.IN_ROOM && websocket) {
      websocket.sendUserColorChange(settings.color);
    }
  }

  function handleBrushSizeChange(event) {
    settings.strokeWidth = event.detail;
    settings = { ...settings };
    console.log("📏 Brush size changed to:", settings.strokeWidth);
  }

  // Host Controls handlers
  function handleModeChange(event) {
    const newMode = event.detail;
    console.log("🔄 Mode change requested:", newMode);

    roomMode = newMode;

    // Clear tafel when mode changes
    if (tafelManager) {
      tafelManager.clearAll();
    }

    // Reset tool to pen
    activeTool = "pen";

    // Broadcast mode change
    if (websocket) {
      websocket.sendModeChange(newMode);
    }
  }

  function handleClearTafel() {
    console.log("🧹 Clear tafel requested");

    if (tafelManager) {
      tafelManager.clearAll();
    }

    // Broadcast clear
    if (websocket) {
      websocket.sendTafelClear();
    }
  }

  function handleClearMyDrawings() {
    console.log("🧹 Clear my drawings requested");

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
    console.log("📝 Tafel stroke complete:", stroke.strokeId);

    // Add user info to stroke
    stroke.userId = roomState.sessionId;
    stroke.userName = user?.displayName || "Unknown";

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
    console.log("🗑️ Tafel erase:", strokeIds);
    // Already deleted locally in Canvas.svelte, just log
  }

  // Draw permission handlers
  function handleToggleDrawUser(event) {
    const { userId, canDraw } = event.detail;
    if (websocket) {
      websocket.sendSetDrawPermission(userId, canDraw);
    }
  }

  function handleToggleDrawAll(event) {
    const { canDraw } = event.detail;
    if (websocket) {
      websocket.sendSetDrawPermissionAll(canDraw);
    }
  }

  // Host view permission handlers
  function handleToggleHostViewUser(event) {
    const { userId, hasHostView } = event.detail;
    if (websocket) {
      websocket.sendSetHostView(userId, hasHostView);
    }
  }

  function handleToggleHostViewAll(event) {
    const { hasHostView } = event.detail;
    if (websocket) {
      websocket.sendSetHostViewAll(hasHostView);
    }
  }

  // Avatar customization handler
  function handleAvatarCustomizationChange(event) {
    const customization = event.detail;
    if (websocket) {
      websocket.sendPlayerCustomize(customization);
    }
    // Reload customization in AvatarView if mounted
    if (avatarViewRef && avatarViewRef.reloadCustomization) {
      avatarViewRef.reloadCustomization();
    }
  }

  $: myUserIndex = roomState.users.findIndex((u) => u.id === roomState.sessionId);

  // Determine if current user can draw
  $: currentUserCanDraw = (() => {
    if (roomState.isHousemaster) return true;
    const me = roomState.users.find((u) => u.id === roomState.sessionId);
    return me ? me.canDraw !== false : true;
  })();

  // Determine if current user has host view
  $: currentUserHasHostView = (() => {
    if (roomState.isHousemaster) return false;
    const me = roomState.users.find((u) => u.id === roomState.sessionId);
    return me ? me.hasHostView === true : false;
  })();
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
    {#if roomMode === "avatar"}
      <!-- Avatar Mode -->
      <AvatarView
        bind:this={avatarViewRef}
        {websocket}
        isHousemaster={roomState.isHousemaster}
        hasHostView={currentUserHasHostView}
        sessionId={roomState.sessionId}
        userName={user?.displayName}
        userColor={settings.color}
        {roomCode}
        users={roomState.users}
      />
    {:else if roomMode === "quiz"}
      <!-- Quiz Mode -->
      <QuizView
        {websocket}
        isHousemaster={roomState.isHousemaster}
        hasHostView={currentUserHasHostView}
        sessionId={roomState.sessionId}
        userName={user?.displayName}
      />
    {:else}
      <!-- Drawing Modes (Trail/Tafel) -->
      <Canvas
        {settings}
        {websocket}
        isMultiplayerMode={true}
        {roomMode}
        {activeTool}
        {tafelManager}
        canDraw={currentUserCanDraw}
        on:tafelStrokeComplete={handleTafelStrokeComplete}
        on:tafelErase={handleTafelErase}
      />

      <TafelToolbar
        {activeTool}
        activeColor={settings.color}
        brushSize={settings.strokeWidth}
        {roomMode}
        on:toolChange={handleToolChange}
        on:colorChange={handleColorChange}
        on:brushSizeChange={handleBrushSizeChange}
        on:clearMyDrawings={handleClearMyDrawings}
      />
    {/if}

    <TopBar
      {roomCode}
      {roomMode}
      isHousemaster={roomState.isHousemaster}
      hasHostView={currentUserHasHostView}
      bind:settings
      bind:showQRCode={showShareModal}
      on:modeChange={handleModeChange}
      on:settingsUpdate={handleSettingsUpdate}
      on:leave={handleLeaveRoom}
    />

    {#if roomState.isHousemaster || roomMode !== "quiz"}
      <OnlineIndicator
        userCount={roomState.users.length}
        on:click={toggleUserList}
        on:avatarClick={() => showAvatarModal = true}
      />
    {/if}

    <AvatarCustomizeModal
      bind:show={showAvatarModal}
      userIndex={myUserIndex}
      on:change={handleAvatarCustomizationChange}
    />

    <UserList
      users={roomState.users}
      currentUserId={roomState.sessionId}
      show={showUserList}
      isHousemaster={roomState.isHousemaster}
      on:close={closeUserList}
      on:toggleDrawUser={handleToggleDrawUser}
      on:toggleDrawAll={handleToggleDrawAll}
      on:toggleHostViewUser={handleToggleHostViewUser}
      on:toggleHostViewAll={handleToggleHostViewAll}
    />
  {/if}
</main>

<style>
  main {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
