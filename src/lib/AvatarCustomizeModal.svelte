<script>
  import { createEventDispatcher } from 'svelte';

  export let show = false;
  export let userIndex = 0;

  const dispatch = createEventDispatcher();

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

  const COLOR_PALETTE = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E2', '#F8B739', '#52C77A', '#FF85A1', '#95E1D3'
  ];

  function getPlayerColor(index) {
    return COLOR_PALETTE[index % COLOR_PALETTE.length];
  }

  const saved = JSON.parse(localStorage.getItem('multitrail_avatar') || '{}');
  let customization = {
    hair: saved.hair || 0,
    skin: saved.skin || 0,
    eyes: saved.eyes || 0,
    shirt: saved.shirt || 0,
    pants: saved.pants || 0,
  };

  function set(key, value) {
    customization = { ...customization, [key]: value };
    localStorage.setItem('multitrail_avatar', JSON.stringify(customization));
    dispatch('change', customization);
  }

  function close() {
    show = false;
    dispatch('close');
  }

  $: hair = HAIR_PRESETS[customization.hair] || HAIR_PRESETS[0];
  $: skin = SKIN_COLORS[customization.skin] || SKIN_COLORS[0];
  $: eye = EYE_PRESETS[customization.eyes] || EYE_PRESETS[0];
  $: shirt = SHIRT_COLORS[customization.shirt] || (userIndex >= 0 ? getPlayerColor(userIndex) : '#667eea');
  $: pants = PANTS_COLORS[customization.pants] || PANTS_COLORS[0];
</script>

{#if show}
<div class="customize-overlay" on:click={close} role="dialog" aria-modal="true">
  <div class="customize-modal" on:click|stopPropagation role="document">
    <div class="preview-area">
      <div class="arena-character preview-char" style="--char-color: {shirt}; --skin-color: {skin}; --eye-w: {eye.w}px; --eye-h: {eye.h}px; --eye-r: {eye.r}; --eye-color: {eye.color}; --pants-color: {pants};">
        <div class="pixel-char">
          {#if hair.style !== 'none'}
            <div class="hair hair-{hair.style}" style="background: {hair.color}"></div>
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
          <button class="swatch" class:selected={customization.hair === i} on:click={() => set('hair', i)}>
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
          <button class="swatch color-sw" class:selected={customization.skin === i} style="--sw-color: {color}" on:click={() => set('skin', i)}></button>
        {/each}
      </div>
    </div>

    <div class="option-group">
      <span class="option-label">Augen</span>
      <div class="option-row">
        {#each EYE_PRESETS as ep, i}
          <button class="swatch eye-sw" class:selected={customization.eyes === i} on:click={() => set('eyes', i)}>
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
          <button class="swatch color-sw" class:selected={customization.shirt === i} style="--sw-color: {color || (userIndex >= 0 ? getPlayerColor(userIndex) : '#667eea')}" on:click={() => set('shirt', i)}>
            {#if !color}<span class="swatch-text">A</span>{/if}
          </button>
        {/each}
      </div>
    </div>

    <div class="option-group">
      <span class="option-label">Hose</span>
      <div class="option-row">
        {#each PANTS_COLORS as color, i}
          <button class="swatch color-sw" class:selected={customization.pants === i} style="--sw-color: {color}" on:click={() => set('pants', i)}></button>
        {/each}
      </div>
    </div>

    <button class="done-btn" on:click={close}>Fertig</button>
  </div>
</div>
{/if}

<style>
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

  .arena-character {
    position: relative;
  }

  .preview-char {
    position: static !important;
    transform: scale(3) !important;
    transform-origin: center center;
    bottom: auto !important;
  }

  .arena-character .pixel-char {
    width: 32px;
    height: 48px;
    position: relative;
    image-rendering: pixelated;
  }

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
</style>
