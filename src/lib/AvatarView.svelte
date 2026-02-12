<script>
  import { onMount } from 'svelte';

  export let websocket = null;
  export let isHousemaster = false;
  export let sessionId = '';
  export let userName = '';
  export let userColor = '#667eea';
  export let roomCode = '';
  export let users = [];

  // Local character state
  let myPosition = 50;
  let myDirection = 1;

  // All player positions (keyed by sessionId)
  let playerPositions = {};

  function handlePlayerMove(e) {
    const { sessionId: senderId, position, direction } = e.detail;
    if (senderId !== sessionId) {
      playerPositions = { ...playerPositions, [senderId]: { position, direction } };
    }
  }

  onMount(() => {
    window.addEventListener('playerMove', handlePlayerMove);
    return () => {
      window.removeEventListener('playerMove', handlePlayerMove);
    };
  });

  function moveLeft() {
    myDirection = -1;
    myPosition = Math.max(5, myPosition - 8);
    broadcastMove();
  }

  function moveRight() {
    myDirection = 1;
    myPosition = Math.min(95, myPosition + 8);
    broadcastMove();
  }

  function broadcastMove() {
    if (websocket) {
      websocket.sendPlayerMove(myPosition, myDirection);
    }
  }

  // Reactive merged positions so Svelte re-renders on local movement
  $: allPositions = (() => {
    const merged = { ...playerPositions };
    merged[sessionId] = { position: myPosition, direction: myDirection };
    return merged;
  })();

  function getPlayerPosition(playerId) {
    return allPositions[playerId] || { position: 50, direction: 1 };
  }

  // Consistent color: use index in the users array (same order for everyone)
  const COLOR_PALETTE = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E2', '#F8B739', '#52C77A', '#FF85A1', '#95E1D3'
  ];

  function getPlayerColor(index) {
    return COLOR_PALETTE[index % COLOR_PALETTE.length];
  }

  $: shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?join=${roomCode}`
    : '';
  $: qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}&bgcolor=1a1a1a&color=ffffff`;
</script>

<div class="avatar-view">
  <div class="layout">
    {#if isHousemaster}
      <div class="qr-section">
        <div class="qr-container">
          <img src={qrCodeUrl} alt="QR Code" class="qr-code" />
        </div>
        <div class="room-code-display">{roomCode}</div>
        <p class="hint">Scan to join</p>
      </div>
    {/if}

    <div class="arena-section">
      <h3 class="arena-label">Players ({users.length})</h3>
      <div class="players-arena">
        {#if users.length === 0}
          <div class="empty-arena">
            <p>Waiting for players...</p>
          </div>
        {:else}
          {#each users as player, index (player.id)}
            {@const pos = allPositions[player.id] || { position: 50, direction: 1 }}
            {@const isMe = player.id === sessionId}
            <div
              class="arena-character"
              class:facing-left={pos.direction < 0}
              class:is-me={isMe}
              style="left: {pos.position}%; --char-color: {getPlayerColor(index)};"
            >
              <div class="pixel-char">
                <div class="head"></div>
                <div class="body"></div>
                <div class="legs"></div>
              </div>
              <div class="name-tag" class:me={isMe}>{player.name}</div>
            </div>
          {/each}
        {/if}
        <div class="ground"></div>
      </div>

      {#if !isHousemaster}
        <div class="controls">
          <button class="arrow-btn" on:click={moveLeft}>◀</button>
          <button class="arrow-btn" on:click={moveRight}>▶</button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .avatar-view {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    padding: 20px;
    overflow-y: auto;
  }

  .layout {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 40px;
  }

  @media (min-width: 768px) {
    .layout {
      flex-direction: row;
      gap: 60px;
    }
  }

  /* === QR SECTION (host only) === */
  .qr-section {
    text-align: center;
  }

  .qr-container {
    background: white;
    padding: 16px;
    border-radius: 16px;
    display: inline-block;
  }

  .qr-code {
    width: 180px;
    height: 180px;
    display: block;
  }

  .room-code-display {
    margin-top: 16px;
    font-size: 2.5rem;
    font-weight: 700;
    font-family: monospace;
    letter-spacing: 8px;
    color: #667eea;
  }

  .hint {
    margin-top: 8px;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.5);
  }

  /* === ARENA (shared by all) === */
  .arena-section {
    min-width: 350px;
    max-width: 600px;
    width: 100%;
  }

  .arena-label {
    margin: 0 0 16px 0;
    font-size: 1.1rem;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.8);
  }

  .players-arena {
    position: relative;
    height: 220px;
    background: linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 100%);
    border-radius: 16px;
    overflow: hidden;
  }

  .ground {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 20px;
    background: linear-gradient(180deg, #2a2a4a 0%, #1a1a2e 100%);
  }

  .empty-arena {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.3);
  }

  .arena-character {
    position: absolute;
    bottom: 25px;
    transform: translateX(-50%);
    transition: left 0.15s ease-out;
  }

  .arena-character.facing-left {
    transform: translateX(-50%) scaleX(-1);
  }

  .arena-character .pixel-char {
    width: 32px;
    height: 48px;
    position: relative;
    image-rendering: pixelated;
  }

  .arena-character .head {
    width: 20px;
    height: 20px;
    background: #ffd8b1;
    border-radius: 4px;
    position: absolute;
    top: 0;
    left: 6px;
    box-shadow:
      inset 4px 4px 0 rgba(255,255,255,0.3),
      inset -2px -2px 0 rgba(0,0,0,0.2);
  }

  .arena-character .head::before {
    content: '';
    position: absolute;
    top: 7px;
    left: 4px;
    width: 4px;
    height: 4px;
    background: #333;
    box-shadow: 8px 0 0 #333;
    border-radius: 1px;
  }

  .arena-character .body {
    width: 26px;
    height: 18px;
    background: var(--char-color);
    position: absolute;
    top: 18px;
    left: 3px;
    border-radius: 3px;
    box-shadow:
      inset 3px 3px 0 rgba(255,255,255,0.3),
      inset -2px -2px 0 rgba(0,0,0,0.2);
  }

  .arena-character .legs {
    position: absolute;
    top: 34px;
    left: 6px;
    width: 8px;
    height: 14px;
    background: #4a4a4a;
    box-shadow: 12px 0 0 #4a4a4a;
    border-radius: 0 0 3px 3px;
    animation: walk 0.4s steps(2) infinite;
  }

  @keyframes walk {
    0% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }

  .arena-character.facing-left .name-tag {
    transform: translateX(-50%) scaleX(-1);
  }

  .name-tag {
    position: absolute;
    top: -28px;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    font-size: 11px;
    color: white;
    background: rgba(0,0,0,0.7);
    padding: 3px 8px;
    border-radius: 6px;
  }

  .name-tag.me {
    background: rgba(102, 126, 234, 0.8);
  }

  .arena-character.is-me .pixel-char {
    filter: drop-shadow(0 0 6px rgba(102, 126, 234, 0.5));
  }

  /* === CONTROLS (students only) === */
  .controls {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-top: 16px;
  }

  .arrow-btn {
    width: 70px;
    height: 70px;
    border: 2px solid rgba(255,255,255,0.2);
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
    color: white;
    font-size: 2rem;
    cursor: pointer;
    transition: all 0.1s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .arrow-btn:active {
    transform: scale(0.95);
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.4), rgba(102, 126, 234, 0.2));
  }

  @media (max-width: 600px) {
    .qr-code {
      width: 140px;
      height: 140px;
    }

    .room-code-display {
      font-size: 1.8rem;
      letter-spacing: 6px;
    }

    .arena-section {
      min-width: unset;
    }
  }
</style>
