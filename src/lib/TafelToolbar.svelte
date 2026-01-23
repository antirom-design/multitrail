<script>
  import { createEventDispatcher } from 'svelte';

  export let activeTool = 'pen';
  export let activeColor = '#ffffff';

  const dispatch = createEventDispatcher();

  // Color palette matching the app's theme
  const colors = [
    '#ffffff', // white
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
    '#FF85A1'  // pink
  ];

  function selectTool(tool) {
    activeTool = tool;
    dispatch('toolChange', tool);
  }

  function selectColor(color) {
    activeColor = color;
    dispatch('colorChange', color);
  }
</script>

<div class="tafel-toolbar">
  <div class="tool-section">
    <button
      class="tool-btn"
      class:active={activeTool === 'pen'}
      on:click={() => selectTool('pen')}
      title="Pen"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 19l7-7 3 3-7 7-3-3z"/>
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
        <path d="M2 2l7.586 7.586"/>
        <circle cx="11" cy="11" r="2"/>
      </svg>
    </button>

    <button
      class="tool-btn"
      class:active={activeTool === 'brush'}
      on:click={() => selectTool('brush')}
      title="Brush (speed-based width)"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/>
        <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>
      </svg>
    </button>

    <button
      class="tool-btn eraser"
      class:active={activeTool === 'eraser'}
      on:click={() => selectTool('eraser')}
      title="Eraser (deletes whole strokes)"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 20H7L3 16c-.56-.56-.56-1.46 0-2.02l10.97-10.97c.56-.56 1.46-.56 2.02 0l5.98 5.98c.56.56.56 1.46 0 2.02L14 19"/>
        <path d="M7 20h13"/>
      </svg>
    </button>
  </div>

  <div class="divider"></div>

  <div class="color-section">
    {#each colors as color}
      <button
        class="color-btn"
        class:active={activeColor === color}
        style="background-color: {color}"
        on:click={() => selectColor(color)}
        title={color}
      />
    {/each}
  </div>
</div>

<style>
  .tafel-toolbar {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.85);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 50px;
    backdrop-filter: blur(10px);
    z-index: 1000;
  }

  .tool-section {
    display: flex;
    gap: 4px;
  }

  .tool-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid transparent;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    padding: 8px;
  }

  .tool-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .tool-btn.active {
    background: rgba(255, 255, 255, 0.3);
    border-color: white;
  }

  .tool-btn svg {
    width: 20px;
    height: 20px;
  }

  .tool-btn.eraser.active {
    background: rgba(255, 100, 100, 0.3);
    border-color: #ff6464;
  }

  .divider {
    width: 1px;
    height: 32px;
    background: rgba(255, 255, 255, 0.3);
  }

  .color-section {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    max-width: 200px;
  }

  .color-btn {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.15s;
  }

  .color-btn:hover {
    transform: scale(1.15);
  }

  .color-btn.active {
    border-color: white;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.5);
    transform: scale(1.1);
  }

  /* Mobile responsiveness */
  @media (max-width: 600px) {
    .tafel-toolbar {
      top: 10px;
      padding: 6px 12px;
      gap: 8px;
    }

    .tool-btn {
      width: 36px;
      height: 36px;
      padding: 7px;
    }

    .color-btn {
      width: 20px;
      height: 20px;
    }

    .color-section {
      max-width: 160px;
    }

    .divider {
      height: 28px;
    }
  }
</style>
