<script>
  import { onMount, onDestroy } from 'svelte';
  import IdleCharacter from './IdleCharacter.svelte';

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
      playerPositions[senderId] = { position, direction };
      playerPositions = playerPositions;
    }
  }

  onMount(() => {
    window.addEventListener('playerMove', handlePlayerMove);
    return () => {
      window.removeEventListener('playerMove', handlePlayerMove);
    };
  });

  function handleMove(event) {
    const { direction } = event.detail;
    myDirection = direction;
    myPosition = Math.max(10, Math.min(90, myPosition + direction * 8));

    // Broadcast to others
    if (websocket) {
      websocket.sendPlayerMove(myPosition, myDirection);
    }
  }

  function getPlayerPosition(playerId) {
    if (playerId === sessionId) {
      return { position: myPosition, direction: myDirection };
    }
    return playerPositions[playerId] || { position: 50, direction: 1 };
  }

  // Use the same palette as App.svelte
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
  {#if isHousemaster}
    <!-- HOST VIEW: Arena + QR code -->
    <div class="host-layout">
      <div class="qr-section">
        <div class="qr-container">
          <img src={qrCodeUrl} alt="QR Code" class="qr-code" />
        </div>
        <div class="room-code-display">{roomCode}</div>
        <p class="hint">Scan to join</p>
      </div>

      <div class="arena-section">
        <h3 class="arena-label">Players ({users.length})</h3>
        <div class="players-arena">
          {#if users.length === 0}
            <div class="empty-arena">
              <p>Waiting for players...</p>
            </div>
          {:else}
            {#each users as player, index (player.id)}
              {@const pos = getPlayerPosition(player.id)}
              <div
                class="arena-character"
                class:facing-left={pos.direction < 0}
                style="left: {pos.position}%; --char-color: {getPlayerColor(index)};"
              >
                <div class="pixel-char">
                  <div class="head"></div>
                  <div class="body"></div>
                  <div class="legs"></div>
                </div>
                <div class="name-tag">{player.name}</div>
              </div>
            {/each}
          {/if}
          <div class="ground"></div>
        </div>
      </div>
    </div>
  {:else}
    <!-- STUDENT VIEW: My character + arena -->
    <div class="student-layout">
      <div class="my-character-section">
        <IdleCharacter
          playerName={userName}
          position={myPosition}
          direction={myDirection}
          color={userColor}
          isLocal={true}
          on:move={handleMove}
        />
      </div>

      {#if users.length > 1}
        <div class="others-section">
          <p class="others-label">Others ({users.length - 1})</p>
          <div class="others-grid">
            {#each users.filter(p => p.id !== sessionId) as player, index (player.id)}
              {@const pos = getPlayerPosition(player.id)}
              <div class="player-card">
                <div class="mini-character-area">
                  <div
                    class="mini-character"
                    class:facing-left={pos.direction < 0}
                    style="left: {pos.position}%; --char-color: {getPlayerColor(index)};"
                  >
                    <div class="mini-pixel">
                      <div class="mini-head"></div>
                      <div class="mini-body"></div>
                    </div>
                  </div>
                </div>
                <span class="player-name">{player.name}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
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

  /* === HOST LAYOUT === */
  .host-layout {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 40px;
  }

  @media (min-width: 768px) {
    .host-layout {
      flex-direction: row;
      gap: 60px;
    }
  }

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

  .arena-section {
    min-width: 350px;
    max-width: 500px;
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
    height: 200px;
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

  /* === STUDENT LAYOUT === */
  .student-layout {
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .my-character-section {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 16px;
  }

  .others-section {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    padding: 12px;
  }

  .others-label {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
    margin: 0 0 12px 0;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .others-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .player-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .mini-character-area {
    position: relative;
    width: 100%;
    height: 30px;
    overflow: hidden;
  }

  .mini-character {
    position: absolute;
    bottom: 2px;
    transform: translateX(-50%);
    transition: left 0.15s ease-out;
  }

  .mini-character.facing-left {
    transform: translateX(-50%) scaleX(-1);
  }

  .mini-pixel {
    width: 12px;
    height: 18px;
    position: relative;
  }

  .mini-head {
    width: 8px;
    height: 8px;
    background: #ffd8b1;
    border-radius: 2px;
    position: absolute;
    top: 0;
    left: 2px;
  }

  .mini-body {
    width: 10px;
    height: 8px;
    background: var(--char-color);
    position: absolute;
    top: 7px;
    left: 1px;
    border-radius: 1px;
  }

  .player-name {
    font-size: 0.75rem;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
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
