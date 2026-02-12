<script>
  import { createEventDispatcher } from 'svelte';

  export let playerName = '';
  export let direction = 1; // 1 = right, -1 = left
  export let position = 50; // 0-100 percentage
  export let color = '#667eea';
  export let isLocal = false;

  const dispatch = createEventDispatcher();

  $: facingRight = direction > 0;

  function moveLeft() {
    dispatch('move', { direction: -1 });
  }

  function moveRight() {
    dispatch('move', { direction: 1 });
  }
</script>

<div class="idle-container">
  <div class="character-area">
    <div
      class="character"
      class:facing-left={!facingRight}
      style="left: {position}%; --char-color: {color};"
    >
      <div class="pixel-char">
        <div class="head"></div>
        <div class="body"></div>
        <div class="legs walking"></div>
      </div>
      <div class="name-tag">{playerName}</div>
    </div>
  </div>

  {#if isLocal}
    <div class="controls">
      <button class="arrow-btn left" on:click={moveLeft}>
        ◀
      </button>
      <button class="arrow-btn right" on:click={moveRight}>
        ▶
      </button>
    </div>
  {/if}
</div>

<style>
  .idle-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
  }

  .character-area {
    position: relative;
    height: 80px;
    background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.2) 100%);
    border-radius: 12px;
    overflow: hidden;
  }

  .character {
    position: absolute;
    bottom: 10px;
    transform: translateX(-50%);
    transition: left 0.15s ease-out;
  }

  .character.facing-left {
    transform: translateX(-50%) scaleX(-1);
  }

  .pixel-char {
    width: 24px;
    height: 36px;
    position: relative;
    image-rendering: pixelated;
  }

  .head {
    width: 16px;
    height: 16px;
    background: #ffd8b1;
    border-radius: 4px;
    position: absolute;
    top: 0;
    left: 4px;
    box-shadow:
      inset 4px 4px 0 rgba(255,255,255,0.3),
      inset -2px -2px 0 rgba(0,0,0,0.2);
  }

  .head::before {
    content: '';
    position: absolute;
    top: 6px;
    left: 3px;
    width: 3px;
    height: 3px;
    background: #333;
    box-shadow: 7px 0 0 #333;
    border-radius: 1px;
  }

  .body {
    width: 20px;
    height: 14px;
    background: var(--char-color);
    position: absolute;
    top: 14px;
    left: 2px;
    border-radius: 2px;
    box-shadow:
      inset 2px 2px 0 rgba(255,255,255,0.3),
      inset -2px -2px 0 rgba(0,0,0,0.2);
  }

  .legs {
    position: absolute;
    top: 26px;
    left: 4px;
    width: 6px;
    height: 10px;
    background: #4a4a4a;
    box-shadow: 10px 0 0 #4a4a4a;
    border-radius: 0 0 2px 2px;
  }

  .legs.walking {
    animation: walk 0.3s steps(2) infinite;
  }

  @keyframes walk {
    0% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }

  .name-tag {
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%) scaleX(1);
    white-space: nowrap;
    font-size: 10px;
    color: white;
    background: rgba(0,0,0,0.6);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .character.facing-left .name-tag {
    transform: translateX(-50%) scaleX(-1);
  }

  .controls {
    display: flex;
    justify-content: center;
    gap: 20px;
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
</style>
