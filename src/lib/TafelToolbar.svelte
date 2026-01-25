<script>
  import { createEventDispatcher } from 'svelte';

  export let activeTool = 'pen';
  export let activeColor = '#ffffff';
  export let brushSize = 4; // small=2, medium=4, large=8

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

  const sizes = [
    { value: 2, label: 'S' },
    { value: 4, label: 'M' },
    { value: 8, label: 'L' }
  ];

  let showSizePicker = false;
  let sizePickerTool = null;
  let longPressTimer = null;

  function selectTool(tool) {
    activeTool = tool;
    dispatch('toolChange', tool);
  }

  function selectColor(color) {
    activeColor = color;
    dispatch('colorChange', color);
  }

  function selectSize(size) {
    brushSize = size;
    dispatch('brushSizeChange', size);
    showSizePicker = false;
    sizePickerTool = null;
  }

  function clearMyDrawings() {
    dispatch('clearMyDrawings');
  }

  function handleToolDown(tool, e) {
    // Start long press timer
    longPressTimer = setTimeout(() => {
      if (tool === 'pen' || tool === 'brush') {
        sizePickerTool = tool;
        showSizePicker = true;
      }
    }, 500);
  }

  function handleToolUp(tool) {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    // If size picker not shown, it was a normal click
    if (!showSizePicker) {
      selectTool(tool);
    }
  }

  function handleToolLeave() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function closeSizePicker() {
    showSizePicker = false;
    sizePickerTool = null;
  }
</script>

<div class="tafel-toolbar">
  <button
    class="tool-btn"
    class:active={activeTool === 'pen'}
    on:mousedown={(e) => handleToolDown('pen', e)}
    on:mouseup={() => handleToolUp('pen')}
    on:mouseleave={handleToolLeave}
    on:touchstart={(e) => handleToolDown('pen', e)}
    on:touchend={() => handleToolUp('pen')}
    title="Pen (hold for size)"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 19l7-7 3 3-7 7-3-3z"/>
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
    </svg>
    {#if activeTool === 'pen'}
      <span class="size-dot" style="width: {brushSize + 2}px; height: {brushSize + 2}px;"></span>
    {/if}
  </button>

  <button
    class="tool-btn"
    class:active={activeTool === 'brush'}
    on:mousedown={(e) => handleToolDown('brush', e)}
    on:mouseup={() => handleToolUp('brush')}
    on:mouseleave={handleToolLeave}
    on:touchstart={(e) => handleToolDown('brush', e)}
    on:touchend={() => handleToolUp('brush')}
    title="Brush (hold for size)"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/>
      <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>
    </svg>
    {#if activeTool === 'brush'}
      <span class="size-dot" style="width: {brushSize + 2}px; height: {brushSize + 2}px;"></span>
    {/if}
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
    class="action-btn"
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

<!-- Size picker popup -->
{#if showSizePicker}
  <div class="size-picker-overlay" on:click={closeSizePicker}></div>
  <div class="size-picker">
    <span class="size-label">Size:</span>
    {#each sizes as size}
      <button
        class="size-btn"
        class:active={brushSize === size.value}
        on:click={() => selectSize(size.value)}
      >
        <span class="size-preview" style="width: {size.value + 4}px; height: {size.value + 4}px;"></span>
        <span>{size.label}</span>
      </button>
    {/each}
  </div>
{/if}

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
    position: relative;
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

  .action-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    padding: 6px;
  }

  .action-btn:hover {
    color: #ff6b6b;
    background: rgba(255, 107, 107, 0.15);
  }

  .action-btn svg {
    width: 18px;
    height: 18px;
  }

  .size-dot {
    position: absolute;
    bottom: 2px;
    right: 2px;
    background: white;
    border-radius: 50%;
    min-width: 4px;
    min-height: 4px;
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

  /* Size picker */
  .size-picker-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1001;
  }

  .size-picker {
    position: fixed;
    bottom: 70px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.85);
    border-radius: 16px;
    backdrop-filter: blur(10px);
    z-index: 1002;
  }

  .size-label {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.8rem;
    margin-right: 4px;
  }

  .size-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid transparent;
    border-radius: 10px;
    color: white;
    cursor: pointer;
    transition: all 0.15s;
    font-size: 0.75rem;
  }

  .size-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .size-btn.active {
    background: rgba(255, 255, 255, 0.25);
    border-color: white;
  }

  .size-preview {
    background: white;
    border-radius: 50%;
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

    .action-btn {
      width: 28px;
      height: 28px;
      padding: 5px;
    }

    .action-btn svg {
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

    .size-picker {
      bottom: 60px;
    }
  }
</style>
