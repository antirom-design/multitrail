<script>
  import { createEventDispatcher, onMount } from "svelte";
  import { fly, fade } from "svelte/transition";

  export let roomCode = "";
  export let roomMode = "trail";
  export let isHousemaster = false;
  export let settings = {};
  export let showQRCode = false;

  const dispatch = createEventDispatcher();

  let copied = false;
  let urlCopied = false;
  let showSettings = false;
  let showLeaveConfirm = false;
  let showModeMenu = false;
  let menuTimeout = null;

  function resetMenuTimer() {
    if (menuTimeout) clearTimeout(menuTimeout);
    menuTimeout = setTimeout(() => {
      showModeMenu = false;
    }, 3000);
  }

  function toggleModeMenu(e) {
    if (e) e.stopPropagation();
    showModeMenu = !showModeMenu;
    if (showModeMenu) resetMenuTimer();
  }

  function handleModeChange(mode) {
    dispatch("modeChange", mode);
    showModeMenu = false;
    if (menuTimeout) clearTimeout(menuTimeout);
  }

  onMount(() => {
    return () => {
      if (menuTimeout) clearTimeout(menuTimeout);
    };
  });

  function requestLeave() {
    showLeaveConfirm = true;
  }

  function confirmLeave() {
    showLeaveConfirm = false;
    dispatch("leave");
  }

  function cancelLeave() {
    showLeaveConfirm = false;
  }

  function copyCode(e) {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(shareUrl);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  function copyUrl(e) {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(shareUrl);
    urlCopied = true;
    setTimeout(() => (urlCopied = false), 2000);
  }

  function toggleQRCode(e) {
    e.stopPropagation();
    showQRCode = !showQRCode;
    showSettings = false;
  }

  function closeQRCode() {
    showQRCode = false;
  }

  function toggleSettings(e) {
    e.stopPropagation();
    showSettings = !showSettings;
    showQRCode = false;
  }

  function updateSettings() {
    dispatch("settingsUpdate", settings);
  }

  $: shareUrl = `${window.location.origin}?join=${roomCode}`;
  $: qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`;
</script>

<div class="top-bar">
  <!-- Room code and share -->
  <div class="room-section">
    {#if isHousemaster || roomMode !== "quiz"}
      <span class="code" on:click={copyCode} role="button" tabindex="0"
        >{roomCode}</span
      >
    {/if}
    <button
      class="icon-btn"
      class:active={copied}
      on:click={copyCode}
      title="Copy link"
    >
      {#if copied}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      {:else}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      {/if}
    </button>
    <button class="icon-btn" on:click={toggleQRCode} title="Share QR">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
    </button>
  </div>

  <div class="divider"></div>

  <!-- Mode selection (for housemaster) -->
  {#if isHousemaster}
    <div class="mode-container" on:mousemove={resetMenuTimer}>
      <button
        class="icon-btn mode-trigger"
        class:active={showModeMenu}
        on:click={toggleModeMenu}
        title="Change Mode"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
      </button>

      {#if showModeMenu}
        <div
          class="mode-menu glass"
          in:fly={{ x: 20, duration: 200 }}
          out:fade={{ duration: 150 }}
        >
          <button
            class="mode-item {roomMode === 'trail' ? 'active' : ''}"
            on:click={() => handleModeChange("trail")}
          >
            <div class="mode-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span>Multitrail</span>
          </button>

          <button
            class="mode-item {roomMode === 'tafel' ? 'active' : ''} tafel"
            on:click={() => handleModeChange("tafel")}
          >
            <div class="mode-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>
            <span>Tafel</span>
          </button>

          <button
            class="mode-item {roomMode === 'quiz' ? 'active' : ''} quiz"
            on:click={() => handleModeChange("quiz")}
          >
            <div class="mode-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <span>Quiz Mission</span>
          </button>
        </div>
      {/if}
    </div>
    <div class="divider"></div>
  {/if}

  {#if isHousemaster || roomMode !== "quiz"}
    <button
      class="icon-btn"
      class:active={showSettings}
      on:click={toggleSettings}
      title="Settings"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="12" cy="12" r="3" />
        <path
          d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"
        />
      </svg>
    </button>
    <div class="divider"></div>
  {/if}

  <!-- Leave button -->
  <button class="icon-btn leave-btn" on:click={requestLeave} title="Leave Room">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  </button>
</div>

<!-- Settings panel -->
{#if showSettings}
  <div class="settings-panel">
    <div class="settings-header">
      <span>Settings</span>
      <button class="close-btn" on:click={() => (showSettings = false)}
        >x</button
      >
    </div>

    {#if roomMode === "trail"}
      <div class="setting">
        <label>Trail: {(settings.lifetimeMs / 1000).toFixed(1)}s</label>
        <input
          type="range"
          min="1000"
          max="30000"
          step="500"
          bind:value={settings.lifetimeMs}
          on:input={updateSettings}
        />
      </div>
    {/if}

    <div class="setting">
      <label>Width: {settings.strokeWidth}px</label>
      <input
        type="range"
        min="1"
        max="20"
        bind:value={settings.strokeWidth}
        on:input={updateSettings}
      />
    </div>

    <div class="setting">
      <label>Color</label>
      <input
        type="color"
        bind:value={settings.color}
        on:input={updateSettings}
      />
    </div>

    {#if roomMode === "trail"}
      <div class="setting">
        <label>Style</label>
        <select bind:value={settings.drawStyle} on:change={updateSettings}>
          <option value="line">Line</option>
          <option value="dots">Dots</option>
        </select>
      </div>

      <div class="setting checkbox">
        <input
          type="checkbox"
          id="speed"
          bind:checked={settings.speedSettings.enabled}
          on:change={updateSettings}
        />
        <label for="speed">Speed width</label>
      </div>

      {#if settings.speedSettings.enabled}
        <div class="setting indent">
          <label>Min: {settings.speedSettings.minWidth}px</label>
          <input
            type="range"
            min="1"
            max="20"
            bind:value={settings.speedSettings.minWidth}
            on:input={updateSettings}
          />
        </div>
        <div class="setting indent">
          <label>Max: {settings.speedSettings.maxWidth}px</label>
          <input
            type="range"
            min="1"
            max="40"
            bind:value={settings.speedSettings.maxWidth}
            on:input={updateSettings}
          />
        </div>
      {/if}
    {/if}
  </div>
{/if}

<!-- Leave confirmation modal -->
{#if showLeaveConfirm}
  <div class="confirm-modal" on:click={cancelLeave} role="dialog">
    <div class="confirm-content" on:click|stopPropagation role="alertdialog">
      <h3>Leave Room?</h3>
      <p>Are you sure you want to leave this room?</p>
      <div class="confirm-buttons">
        <button class="cancel-btn" on:click={cancelLeave}>Cancel</button>
        <button class="confirm-btn leave" on:click={confirmLeave}>Leave</button>
      </div>
    </div>
  </div>
{/if}

<!-- QR Code modal -->
{#if showQRCode}
  <div class="qr-modal" on:click={closeQRCode} role="dialog">
    <div class="qr-content" on:click|stopPropagation>
      <button class="modal-close" on:click={closeQRCode}>x</button>
      <h3>Scan to Join</h3>
      <img src={qrCodeUrl} alt="QR Code" />
      <p
        class="share-url"
        class:copied={urlCopied}
        on:click={copyUrl}
        role="button"
        tabindex="0"
        title="Click to copy"
      >
        {urlCopied ? "Copied!" : shareUrl}
      </p>
    </div>
  </div>
{/if}

<style>
  .top-bar {
    position: fixed;
    top: 12px;
    right: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 20px;
    backdrop-filter: blur(10px);
    z-index: 1000;
  }

  .room-section {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .code {
    font-family: "Courier New", monospace;
    font-weight: 600;
    font-size: 0.85rem;
    color: #667eea;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .code:hover {
    background: rgba(102, 126, 234, 0.2);
  }

  .icon-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    padding: 5px;
  }

  .icon-btn:hover {
    color: white;
    background: rgba(255, 255, 255, 0.15);
  }

  .icon-btn.active {
    color: #4ecdc4;
  }

  .icon-btn.leave-btn:hover {
    color: #ff6b6b;
    background: rgba(255, 107, 107, 0.15);
  }

  .icon-btn svg {
    width: 16px;
    height: 16px;
  }

  .divider {
    width: 1px;
    height: 18px;
    background: rgba(255, 255, 255, 0.2);
    margin: 0 2px;
  }

  .mode-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .mode-menu {
    position: absolute;
    top: 40px;
    right: 0;
    background: rgba(15, 23, 42, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 160px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  }

  .mode-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .mode-item:hover {
    background: rgba(255, 255, 255, 0.05);
    color: white;
  }

  .mode-item.active {
    background: rgba(102, 126, 234, 0.15);
    color: #667eea;
  }

  .mode-item.tafel.active {
    background: rgba(76, 175, 80, 0.15);
    color: #4caf50;
  }

  .mode-item.quiz.active {
    background: rgba(255, 193, 7, 0.15);
    color: #ffc107;
  }

  .mode-icon {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mode-icon svg {
    width: 16px;
    height: 16px;
  }

  /* Settings panel */
  .settings-panel {
    position: fixed;
    top: 52px;
    right: 12px;
    width: 220px;
    background: rgba(0, 0, 0, 0.85);
    border-radius: 12px;
    padding: 12px;
    backdrop-filter: blur(10px);
    z-index: 1000;
    color: white;
  }

  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    font-weight: 500;
  }

  .close-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    font-size: 18px;
    cursor: pointer;
    padding: 0 4px;
  }

  .setting {
    margin-bottom: 12px;
  }

  .setting.indent {
    margin-left: 16px;
    margin-bottom: 8px;
  }

  .setting.checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .setting.checkbox input {
    width: 16px;
    height: 16px;
  }

  .setting label {
    display: block;
    font-size: 0.8rem;
    opacity: 0.8;
    margin-bottom: 4px;
  }

  .setting.checkbox label {
    margin-bottom: 0;
  }

  .setting input[type="range"] {
    width: 100%;
    accent-color: #667eea;
  }

  .setting input[type="color"] {
    width: 100%;
    height: 32px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .setting select {
    width: 100%;
    padding: 6px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    color: white;
    font-size: 0.85rem;
  }

  .setting select option {
    background: #1a1a1a;
  }

  /* QR Modal */
  .qr-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }

  .qr-content {
    background: white;
    border-radius: 16px;
    padding: 24px;
    text-align: center;
    position: relative;
    max-width: 340px;
  }

  .modal-close {
    position: absolute;
    top: 8px;
    right: 12px;
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
  }

  .qr-content h3 {
    margin: 0 0 16px 0;
    color: #333;
  }

  .qr-content img {
    width: 200px;
    height: 200px;
    display: block;
    margin: 0 auto 12px;
  }

  .share-url {
    font-size: 0.75rem;
    color: #667eea;
    word-break: break-all;
    background: rgba(102, 126, 234, 0.1);
    padding: 8px;
    border-radius: 4px;
    margin: 0;
    cursor: pointer;
    transition: all 0.2s;
  }

  .share-url:hover {
    background: rgba(102, 126, 234, 0.2);
  }

  .share-url.copied {
    background: rgba(78, 205, 196, 0.2);
    color: #4ecdc4;
  }

  /* Confirmation modal */
  .confirm-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }

  .confirm-content {
    background: rgba(30, 30, 30, 0.95);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    padding: 24px;
    max-width: 300px;
    text-align: center;
    backdrop-filter: blur(20px);
  }

  .confirm-content h3 {
    margin: 0 0 8px 0;
    color: white;
    font-size: 1.1rem;
  }

  .confirm-content p {
    margin: 0 0 20px 0;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
  }

  .confirm-buttons {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  .cancel-btn,
  .confirm-btn {
    padding: 10px 20px;
    border-radius: 20px;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
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
    background: #667eea;
    color: white;
  }

  .confirm-btn:hover {
    background: #5a6fd6;
  }

  .confirm-btn.leave {
    background: #ff6b6b;
  }

  .confirm-btn.leave:hover {
    background: #e55555;
  }

  @media (max-width: 600px) {
    .top-bar {
      top: 8px;
      right: 8px;
      padding: 5px 8px;
      gap: 4px;
    }

    .code {
      font-size: 0.75rem;
    }

    .icon-btn,
    .mode-btn {
      width: 26px;
      height: 26px;
      padding: 4px;
    }

    .icon-btn svg,
    .mode-btn svg {
      width: 14px;
      height: 14px;
    }

    .settings-panel {
      top: 46px;
      right: 8px;
      width: 200px;
    }

    .qr-content img {
      width: 160px;
      height: 160px;
    }
  }
</style>
