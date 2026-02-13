<script>
  import { onMount } from 'svelte';

  export let websocket = null;
  export let isHousemaster = false;
  export let hasHostView = false;
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

  // Host auto-walk state
  let hostWalkTarget = 75;
  let hostWalkPaused = false;
  let hostWalkInterval;

  // Jump state
  let jumpingPlayers = new Set();
  let starPlayers = new Set();

  // Find host sessionId from users array
  $: hostSessionId = users.find(u => u.isHousemaster)?.id || '';

  // === Avatar Customization Presets ===
  const HAIR_PRESETS = [
    { style: 'none', color: '' },
    { style: 'short', color: '#3a2a1a' },
    { style: 'short', color: '#c8a24e' },
    { style: 'long', color: '#3a2a1a' },
    { style: 'long', color: '#c8a24e' },
  ];

  const SKIN_COLORS = ['#ffd8b1', '#f0c090', '#d4a574', '#a0724a', '#6b4423'];

  const EYE_PRESETS = [
    { w: 4, h: 4, r: '1px', color: '#333' },
    { w: 5, h: 2, r: '0px', color: '#333' },
    { w: 5, h: 5, r: '50%', color: '#222' },
    { w: 3, h: 3, r: '50%', color: '#1a5276' },
    { w: 6, h: 2, r: '1px', color: '#555' },
  ];

  const SHIRT_COLORS = [null, '#d94040', '#4066d9', '#40a060', '#8040c0', '#d9b040'];
  const PANTS_COLORS = ['#4a4a4a', '#2c4a7a', '#6a4a2a', '#3a5a3a', '#1a1a1a'];

  // Load saved customization from localStorage
  const saved = JSON.parse(localStorage.getItem('multitrail_avatar') || '{}');
  let myCustomization = {
    hair: saved.hair || 0,
    skin: saved.skin || 0,
    eyes: saved.eyes || 0,
    shirt: saved.shirt || 0,
    pants: saved.pants || 0,
  };

  let playerCustomizations = {};
  let showCustomizeModal = false;

  function setCustomization(key, value) {
    myCustomization = { ...myCustomization, [key]: value };
    localStorage.setItem('multitrail_avatar', JSON.stringify(myCustomization));
    broadcastCustomization();
  }

  function broadcastCustomization() {
    if (websocket) {
      websocket.sendPlayerCustomize(myCustomization);
    }
  }

  function handlePlayerCustomize(e) {
    const { sessionId: senderId, customization } = e.detail;
    if (senderId !== sessionId) {
      playerCustomizations = { ...playerCustomizations, [senderId]: customization };
    }
  }

  $: myUserIndex = users.findIndex(u => u.id === sessionId);

  // Re-broadcast customization when user list changes so new joiners see it
  let prevUserCount = 0;
  $: if (users.length !== prevUserCount) {
    prevUserCount = users.length;
    if (users.length > 0) setTimeout(broadcastCustomization, 500);
  }

  // Resolved preview values for modal
  $: previewHair = HAIR_PRESETS[myCustomization.hair] || HAIR_PRESETS[0];
  $: previewSkin = SKIN_COLORS[myCustomization.skin] || SKIN_COLORS[0];
  $: previewEye = EYE_PRESETS[myCustomization.eyes] || EYE_PRESETS[0];
  $: previewShirt = SHIRT_COLORS[myCustomization.shirt] || (myUserIndex >= 0 ? getPlayerColor(myUserIndex) : '#667eea');
  $: previewPants = PANTS_COLORS[myCustomization.pants] || PANTS_COLORS[0];

  // === Event handlers ===
  function handlePlayerMove(e) {
    const { sessionId: senderId, position, direction } = e.detail;
    if (senderId !== sessionId) {
      playerPositions = { ...playerPositions, [senderId]: { position, direction } };
    }
  }

  function handlePlayerJump(e) {
    const { sessionId: senderId } = e.detail;
    if (senderId !== sessionId) {
      jumpingPlayers = new Set([...jumpingPlayers, senderId]);
      const jumperPos = (allPositions[senderId] || {}).position || 50;
      const hostPos = (allPositions[hostSessionId] || {}).position || 50;
      if (Math.abs(jumperPos - hostPos) < 8) {
        starPlayers = new Set([...starPlayers, senderId]);
        setTimeout(() => {
          starPlayers = new Set([...starPlayers].filter(id => id !== senderId));
        }, 800);
      }
      setTimeout(() => {
        jumpingPlayers = new Set([...jumpingPlayers].filter(id => id !== senderId));
      }, 400);
    }
  }

  onMount(() => {
    window.addEventListener('playerMove', handlePlayerMove);
    window.addEventListener('playerJump', handlePlayerJump);
    window.addEventListener('playerCustomize', handlePlayerCustomize);

    // Broadcast customization after connection is established
    setTimeout(broadcastCustomization, 1000);

    // Host auto-walk
    if (isHousemaster) {
      hostWalkTarget = 65 + Math.random() * 20;
      myDirection = 1;
      hostWalkInterval = setInterval(() => {
        if (hostWalkPaused) return;
        const speed = 0.4;
        if (myDirection > 0) {
          myPosition = Math.min(95, myPosition + speed);
          if (myPosition >= hostWalkTarget) {
            hostWalkPaused = true;
            setTimeout(() => {
              hostWalkTarget = 15 + Math.random() * 20;
              myDirection = -1;
              hostWalkPaused = false;
            }, 1000 + Math.random() * 1000);
          }
        } else {
          myPosition = Math.max(5, myPosition - speed);
          if (myPosition <= hostWalkTarget) {
            hostWalkPaused = true;
            setTimeout(() => {
              hostWalkTarget = 65 + Math.random() * 20;
              myDirection = 1;
              hostWalkPaused = false;
            }, 1000 + Math.random() * 1000);
          }
        }
        broadcastMove();
      }, 150);
    }

    return () => {
      window.removeEventListener('playerMove', handlePlayerMove);
      window.removeEventListener('playerJump', handlePlayerJump);
      window.removeEventListener('playerCustomize', handlePlayerCustomize);
      if (hostWalkInterval) clearInterval(hostWalkInterval);
    };
  });

  function jump() {
    jumpingPlayers = new Set([...jumpingPlayers, sessionId]);
    if (websocket) websocket.sendPlayerJump();
    const myPos = myPosition;
    const hostPos = (allPositions[hostSessionId] || {}).position || 50;
    if (Math.abs(myPos - hostPos) < 8) {
      starPlayers = new Set([...starPlayers, sessionId]);
      setTimeout(() => {
        starPlayers = new Set([...starPlayers].filter(id => id !== sessionId));
      }, 800);
    }
    setTimeout(() => {
      jumpingPlayers = new Set([...jumpingPlayers].filter(id => id !== sessionId));
    }, 400);
  }

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
    {#if isHousemaster || hasHostView}
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
            {@const cust = isMe ? myCustomization : (playerCustomizations[player.id] || { hair: 0, skin: 0, eyes: 0, shirt: 0, pants: 0 })}
            {@const hair = HAIR_PRESETS[cust.hair] || HAIR_PRESETS[0]}
            {@const skin = SKIN_COLORS[cust.skin] || SKIN_COLORS[0]}
            {@const eye = EYE_PRESETS[cust.eyes] || EYE_PRESETS[0]}
            {@const shirt = SHIRT_COLORS[cust.shirt] || getPlayerColor(index)}
            {@const pants = PANTS_COLORS[cust.pants] || PANTS_COLORS[0]}
            <div
              class="arena-character"
              class:facing-left={pos.direction < 0}
              class:is-me={isMe}
              class:jumping={jumpingPlayers.has(player.id)}
              style="left: {pos.position}%; --char-color: {shirt}; --skin-color: {skin}; --eye-w: {eye.w}px; --eye-h: {eye.h}px; --eye-r: {eye.r}; --eye-color: {eye.color}; --pants-color: {pants};"
            >
              <div class="pixel-char">
                {#if hair.style !== 'none'}
                  <div class="hair hair-{hair.style}" style="background: {hair.color}"></div>
                {/if}
                <div class="head"></div>
                <div class="body"></div>
                <div class="legs"></div>
              </div>
              <div class="name-tag" class:me={isMe}>{player.name}</div>
              {#if starPlayers.has(player.id)}
                <div class="star-burst">★</div>
              {/if}
            </div>
          {/each}
        {/if}
        <div class="ground"></div>
      </div>

      {#if !isHousemaster && !hasHostView}
        <div class="controls">
          <button class="arrow-btn" on:click={moveLeft}>◀</button>
          <button class="arrow-btn jump-btn" on:click={jump}>⬆</button>
          <button class="arrow-btn" on:click={moveRight}>▶</button>
        </div>
      {/if}

      <button class="customize-btn" on:click={() => showCustomizeModal = true}>MyAvatar</button>
    </div>
  </div>
</div>

{#if showCustomizeModal}
<div class="customize-overlay" on:click={() => showCustomizeModal = false}>
  <div class="customize-modal" on:click|stopPropagation>
    <div class="preview-area">
      <div class="arena-character preview-char" style="--char-color: {previewShirt}; --skin-color: {previewSkin}; --eye-w: {previewEye.w}px; --eye-h: {previewEye.h}px; --eye-r: {previewEye.r}; --eye-color: {previewEye.color}; --pants-color: {previewPants};">
        <div class="pixel-char">
          {#if previewHair.style !== 'none'}
            <div class="hair hair-{previewHair.style}" style="background: {previewHair.color}"></div>
          {/if}
          <div class="head"></div>
          <div class="body"></div>
          <div class="legs"></div>
        </div>
      </div>
    </div>

    <div class="option-group">
      <span class="option-label">Haare</span>
      <div class="option-row">
        {#each HAIR_PRESETS as hp, i}
          <button class="swatch" class:selected={myCustomization.hair === i} on:click={() => setCustomization('hair', i)}>
            {#if hp.style === 'none'}
              <span class="swatch-text">-</span>
            {:else}
              <span class="hair-sw hair-sw-{hp.style}" style="background: {hp.color}"></span>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <div class="option-group">
      <span class="option-label">Haut</span>
      <div class="option-row">
        {#each SKIN_COLORS as color, i}
          <button class="swatch color-sw" class:selected={myCustomization.skin === i} style="--sw-color: {color}" on:click={() => setCustomization('skin', i)}></button>
        {/each}
      </div>
    </div>

    <div class="option-group">
      <span class="option-label">Augen</span>
      <div class="option-row">
        {#each EYE_PRESETS as ep, i}
          <button class="swatch eye-sw" class:selected={myCustomization.eyes === i} on:click={() => setCustomization('eyes', i)}>
            <span class="eye-pair">
              <span class="eye-dot" style="width: {ep.w}px; height: {ep.h}px; background: {ep.color}; border-radius: {ep.r};"></span>
              <span class="eye-dot" style="width: {ep.w}px; height: {ep.h}px; background: {ep.color}; border-radius: {ep.r};"></span>
            </span>
          </button>
        {/each}
      </div>
    </div>

    <div class="option-group">
      <span class="option-label">Pulli</span>
      <div class="option-row">
        {#each SHIRT_COLORS as color, i}
          <button class="swatch color-sw" class:selected={myCustomization.shirt === i} style="--sw-color: {color || (myUserIndex >= 0 ? getPlayerColor(myUserIndex) : '#667eea')}" on:click={() => setCustomization('shirt', i)}>
            {#if !color}<span class="swatch-text">A</span>{/if}
          </button>
        {/each}
      </div>
    </div>

    <div class="option-group">
      <span class="option-label">Hose</span>
      <div class="option-row">
        {#each PANTS_COLORS as color, i}
          <button class="swatch color-sw" class:selected={myCustomization.pants === i} style="--sw-color: {color}" on:click={() => setCustomization('pants', i)}></button>
        {/each}
      </div>
    </div>

    <button class="done-btn" on:click={() => showCustomizeModal = false}>Fertig</button>
  </div>
</div>
{/if}

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

  /* --- Hair --- */
  .hair {
    position: absolute;
    z-index: 1;
    image-rendering: pixelated;
  }

  .hair-short {
    top: -3px;
    left: 6px;
    width: 20px;
    height: 7px;
    border-radius: 3px 3px 0 0;
  }

  .hair-long {
    top: -4px;
    left: 4px;
    width: 24px;
    height: 14px;
    border-radius: 4px 4px 2px 2px;
  }

  .arena-character .head {
    width: 20px;
    height: 20px;
    background: var(--skin-color, #ffd8b1);
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
    width: var(--eye-w, 4px);
    height: var(--eye-h, 4px);
    background: var(--eye-color, #333);
    box-shadow: 8px 0 0 var(--eye-color, #333);
    border-radius: var(--eye-r, 1px);
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
    background: var(--pants-color, #4a4a4a);
    box-shadow: 12px 0 0 var(--pants-color, #4a4a4a);
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

  .jump-btn {
    font-size: 1.6rem;
  }

  /* Jump animation */
  .arena-character.jumping .pixel-char {
    animation: jump-arc 0.4s ease-out;
  }

  @keyframes jump-arc {
    0% { transform: translateY(0); }
    40% { transform: translateY(-40px); }
    100% { transform: translateY(0); }
  }

  /* Star burst */
  .star-burst {
    position: absolute;
    top: -40px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 20px;
    color: #ffc107;
    animation: star-float 0.8s ease-out forwards;
    pointer-events: none;
  }

  @keyframes star-float {
    0% { opacity: 1; transform: translateX(-50%) translateY(0) scale(0.5); }
    50% { opacity: 1; transform: translateX(-50%) translateY(-20px) scale(1.2); }
    100% { opacity: 0; transform: translateX(-50%) translateY(-35px) scale(0.8); }
  }

  /* === CUSTOMIZE BUTTON === */
  .customize-btn {
    display: block;
    margin: 12px auto 0;
    padding: 8px 20px;
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 10px;
    background: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.7);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .customize-btn:hover {
    background: rgba(255,255,255,0.15);
    color: white;
  }

  /* === CUSTOMIZE MODAL === */
  .customize-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .customize-modal {
    background: #1e1e3a;
    border-radius: 20px;
    padding: 24px;
    max-width: 340px;
    width: 100%;
    max-height: 85vh;
    overflow-y: auto;
    border: 1px solid rgba(255,255,255,0.1);
  }

  .preview-area {
    display: flex;
    justify-content: center;
    padding: 10px 0 8px;
    min-height: 180px;
    align-items: center;
  }

  .preview-char {
    position: static !important;
    transform: scale(3) !important;
    transform-origin: center center;
    bottom: auto !important;
  }

  .option-group {
    margin-bottom: 14px;
  }

  .option-label {
    display: block;
    font-size: 0.7rem;
    color: rgba(255,255,255,0.45);
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .option-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .swatch {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: 2px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.05);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.1s ease;
    padding: 0;
  }

  .swatch:hover {
    border-color: rgba(255,255,255,0.3);
  }

  .swatch.selected {
    border-color: #667eea;
    box-shadow: 0 0 8px rgba(102, 126, 234, 0.4);
  }

  .color-sw {
    background: var(--sw-color) !important;
  }

  .swatch-text {
    color: rgba(255,255,255,0.6);
    font-size: 0.8rem;
    font-weight: 600;
  }

  .hair-sw {
    display: block;
    border-radius: 2px;
  }

  .hair-sw-short {
    width: 18px;
    height: 6px;
    border-radius: 3px 3px 0 0;
  }

  .hair-sw-long {
    width: 20px;
    height: 10px;
    border-radius: 3px 3px 2px 2px;
  }

  .eye-sw {
    background: rgba(255,255,255,0.1) !important;
  }

  .eye-pair {
    display: flex;
    gap: 3px;
    align-items: center;
  }

  .eye-dot {
    display: block;
  }

  .done-btn {
    width: 100%;
    margin-top: 18px;
    padding: 12px;
    border: none;
    border-radius: 12px;
    background: #667eea;
    color: white;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .done-btn:hover {
    background: #5a6fd6;
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
