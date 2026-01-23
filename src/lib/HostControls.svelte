<script>
  import { createEventDispatcher } from 'svelte';

  export let roomMode = 'trail'; // 'trail' or 'tafel'
  export let isHousemaster = false;

  const dispatch = createEventDispatcher();

  let showClearConfirm = false;

  function toggleMode() {
    const newMode = roomMode === 'trail' ? 'tafel' : 'trail';
    dispatch('modeChange', newMode);
  }

  function handleClearClick() {
    showClearConfirm = true;
  }

  function confirmClear() {
    showClearConfirm = false;
    dispatch('clearTafel');
  }

  function cancelClear() {
    showClearConfirm = false;
  }
</script>

{#if isHousemaster}
  <div class="host-controls">
    <button
      class="mode-toggle"
      class:tafel-mode={roomMode === 'tafel'}
      on:click={toggleMode}
      title={roomMode === 'trail' ? 'Switch to Tafel mode' : 'Switch to Trail mode'}
    >
      <span class="mode-icon">
        {#if roomMode === 'trail'}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
        {/if}
      </span>
      <span class="mode-label">{roomMode === 'trail' ? 'Trail' : 'Tafel'}</span>
    </button>

    {#if roomMode === 'tafel'}
      <button
        class="clear-btn"
        on:click={handleClearClick}
        title="Clear the board"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
        <span>Tafel löschen</span>
      </button>
    {/if}
  </div>

  {#if showClearConfirm}
    <div class="confirm-overlay" on:click={cancelClear} on:keydown={cancelClear} role="dialog">
      <div class="confirm-dialog" on:click|stopPropagation on:keydown|stopPropagation role="alertdialog">
        <h3>Tafel löschen?</h3>
        <p>Alle Zeichnungen werden gelöscht.</p>
        <div class="confirm-buttons">
          <button class="cancel-btn" on:click={cancelClear}>Abbrechen</button>
          <button class="confirm-btn" on:click={confirmClear}>Löschen</button>
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .host-controls {
    position: fixed;
    bottom: 20px;
    left: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 100;
  }

  .mode-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 25px;
    color: white;
    cursor: pointer;
    backdrop-filter: blur(10px);
    transition: all 0.2s;
    font-size: 14px;
  }

  .mode-toggle:hover {
    background: rgba(0, 0, 0, 0.9);
    border-color: rgba(255, 255, 255, 0.5);
  }

  .mode-toggle.tafel-mode {
    background: rgba(76, 175, 80, 0.8);
    border-color: rgba(76, 175, 80, 0.8);
  }

  .mode-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mode-icon svg {
    width: 18px;
    height: 18px;
  }

  .mode-label {
    font-weight: 500;
  }

  .clear-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: rgba(255, 59, 48, 0.8);
    border: 2px solid rgba(255, 59, 48, 0.8);
    border-radius: 25px;
    color: white;
    cursor: pointer;
    backdrop-filter: blur(10px);
    transition: all 0.2s;
    font-size: 14px;
  }

  .clear-btn:hover {
    background: rgba(255, 59, 48, 1);
    transform: translateY(-1px);
  }

  .clear-btn svg {
    width: 16px;
    height: 16px;
  }

  /* Confirmation overlay */
  .confirm-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }

  .confirm-dialog {
    background: rgba(30, 30, 30, 0.95);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    padding: 24px;
    max-width: 320px;
    text-align: center;
    backdrop-filter: blur(20px);
  }

  .confirm-dialog h3 {
    margin: 0 0 12px 0;
    color: white;
    font-size: 1.25rem;
  }

  .confirm-dialog p {
    margin: 0 0 20px 0;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.95rem;
  }

  .confirm-buttons {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  .cancel-btn,
  .confirm-btn {
    padding: 10px 24px;
    border-radius: 20px;
    border: none;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    transition: all 0.15s;
  }

  .cancel-btn {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }

  .cancel-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .confirm-btn {
    background: rgba(255, 59, 48, 0.9);
    color: white;
  }

  .confirm-btn:hover {
    background: rgba(255, 59, 48, 1);
  }

  /* Mobile responsiveness */
  @media (max-width: 600px) {
    .host-controls {
      bottom: 10px;
      left: 10px;
    }

    .mode-toggle,
    .clear-btn {
      padding: 8px 12px;
      font-size: 13px;
    }

    .mode-icon svg,
    .clear-btn svg {
      width: 16px;
      height: 16px;
    }
  }
</style>
