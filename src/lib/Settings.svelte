<script>
  import { createEventDispatcher } from 'svelte';

  export let settings = {
    lifetimeMs: 15000,
    strokeWidth: 4,
    color: '#ffffff',
    drawStyle: 'line'
  };

  const dispatch = createEventDispatcher();

  function updateSettings() {
    dispatch('update', settings);
  }

  let isOpen = false;

  function togglePanel() {
    isOpen = !isOpen;
  }
</script>

<div class="settings-container">
  <button class="toggle-btn" on:click={togglePanel}>
    {isOpen ? '✕' : '⚙'}
  </button>

  {#if isOpen}
    <div class="panel">
      <h2>Settings</h2>

      <div class="control">
        <label>
          Trail Lifetime: {(settings.lifetimeMs / 1000).toFixed(1)}s
          <input
            type="range"
            min="1000"
            max="30000"
            step="500"
            bind:value={settings.lifetimeMs}
            on:input={updateSettings}
          />
        </label>
      </div>

      <div class="control">
        <label>
          Stroke Width: {settings.strokeWidth}px
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            bind:value={settings.strokeWidth}
            on:input={updateSettings}
          />
        </label>
      </div>

      <div class="control">
        <label>
          Color
          <input
            type="color"
            bind:value={settings.color}
            on:input={updateSettings}
          />
          <span class="color-value">{settings.color}</span>
        </label>
      </div>

      <div class="control">
        <label>
          Draw Style
          <select bind:value={settings.drawStyle} on:change={updateSettings}>
            <option value="line">Connected Line</option>
            <option value="dots">Dots</option>
          </select>
        </label>
      </div>

      <div class="values-display">
        <h3>Current Values:</h3>
        <pre>{JSON.stringify(settings, null, 2)}</pre>
      </div>
    </div>
  {/if}
</div>

<style>
  .settings-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
  }

  .toggle-btn {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.3);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    font-size: 24px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(10px);
    transition: all 0.2s;
  }

  .toggle-btn:hover {
    background: rgba(0, 0, 0, 0.9);
    border-color: rgba(255, 255, 255, 0.5);
  }

  .panel {
    position: absolute;
    top: 60px;
    right: 0;
    width: 320px;
    max-height: 80vh;
    overflow-y: auto;
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 20px;
    color: white;
    backdrop-filter: blur(10px);
  }

  h2 {
    margin: 0 0 20px 0;
    font-size: 1.5rem;
    font-weight: 300;
  }

  h3 {
    margin: 20px 0 10px 0;
    font-size: 1rem;
    font-weight: 400;
  }

  .control {
    margin-bottom: 20px;
  }

  label {
    display: block;
    font-size: 0.9rem;
    margin-bottom: 8px;
    opacity: 0.9;
  }

  input[type="range"] {
    width: 100%;
    margin-top: 8px;
    accent-color: white;
  }

  input[type="color"] {
    width: 60px;
    height: 40px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    cursor: pointer;
    background: transparent;
    margin-top: 8px;
  }

  select {
    width: 100%;
    padding: 8px;
    margin-top: 8px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    color: white;
    font-size: 0.9rem;
    cursor: pointer;
  }

  select option {
    background: #1a1a1a;
  }

  .color-value {
    margin-left: 10px;
    font-family: monospace;
    opacity: 0.7;
  }

  .values-display {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
  }

  pre {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 12px;
    font-size: 0.85rem;
    overflow-x: auto;
    margin: 0;
  }

  /* Mobile responsiveness */
  @media (max-width: 600px) {
    .settings-container {
      top: 10px;
      right: 10px;
    }

    .toggle-btn {
      width: 45px;
      height: 45px;
      font-size: 20px;
    }

    .panel {
      width: calc(100vw - 40px);
      max-width: 320px;
    }
  }
</style>
