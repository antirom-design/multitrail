<script>
  import { createEventDispatcher } from 'svelte';

  export let activeTool = 'pen';
  export let activeColor = '#ffffff';

  const dispatch = createEventDispatcher();

  // 8 colors for clean mobile UI
  const colors = [
    '#ffffff', // white
    '#FF6B6B', // red
    '#F8B739', // orange
    '#F7DC6F', // yellow
    '#52C77A', // green
    '#45B7D1', // blue
    '#BB8FCE', // purple
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

  function clearMyDrawings() {
    dispatch('clearMyDrawings');
  }
</script>

<div class="tafel-toolbar">
  <button
    class="tool-btn"
    class:active={activeTool === 'pen'}
    on:click={() => selectTool('pen')}
    title="Pen"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 19l7-7 3 3-7 7-3-3z"/>
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
    </svg>
  </button>

  <button
    class="tool-btn"
    class:active={activeTool === 'brush'}
    on:click={() => selectTool('brush')}
    title="Brush"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/>
      <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>
    </svg>
  </button>

  <button
    class="tool-btn"
    class:active={activeTool === 'eraser'}
    on:click={() => selectTool('eraser')}
    title="Eraser"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M20 20H7L3 16c-.56-.56-.56-1.46 0-2.02l10.97-10.97c.56-.56 1.46-.56 2.02 0l5.98 5.98c.56.56.56 1.46 0 2.02L14 19"/>
    </svg>
  </button>

  <button
    class="tool-btn clear-btn"
    on:click={clearMyDrawings}
    title="Clear my drawings"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 6h18"/>
      <path d="M8 6V4h8v2"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
    </svg>
  </button>

  <div class="divider"></div>

  {#each colors as color}
    <button
      class="color-btn"
      class:active={activeColor === color}
      style="background-color: {color}"
      on:click={() => selectColor(color)}
    />
  {/each}
</div>

<style>
  .tafel-toolbar {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 20px;
    backdrop-filter: blur(10px);
    z-index: 1000;
  }

  .tool-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    padding: 6px;
  }

  .tool-btn:hover {
    color: white;
    background: rgba(255, 255, 255, 0.15);
  }

  .tool-btn.active {
    color: white;
    background: rgba(255, 255, 255, 0.25);
  }

  .tool-btn svg {
    width: 18px;
    height: 18px;
  }

  .tool-btn.clear-btn:hover {
    color: #ff6b6b;
  }

  .divider {
    width: 1px;
    height: 20px;
    background: rgba(255, 255, 255, 0.2);
    margin: 0 2px;
  }

  .color-btn {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.1s;
    flex-shrink: 0;
  }

  .color-btn:hover {
    transform: scale(1.15);
  }

  .color-btn.active {
    border-color: white;
    transform: scale(1.1);
  }

  @media (max-width: 600px) {
    .tafel-toolbar {
      bottom: 12px;
      gap: 4px;
      padding: 5px 8px;
    }

    .tool-btn {
      width: 28px;
      height: 28px;
      padding: 5px;
    }

    .tool-btn svg {
      width: 16px;
      height: 16px;
    }

    .color-btn {
      width: 18px;
      height: 18px;
    }

    .divider {
      height: 16px;
    }
  }
</style>
