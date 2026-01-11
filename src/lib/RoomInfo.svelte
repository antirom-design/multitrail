<script>
  export let roomCode = '';

  let copied = false;

  function copyCode() {
    navigator.clipboard.writeText(roomCode);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      copyCode();
    }
  }
</script>

<div class="room-info" on:click={copyCode} on:keypress={handleKeyPress} role="button" tabindex="0">
  <div class="code-display">
    <span class="label">Room Code:</span>
    <span class="code">{roomCode}</span>
    <span class="copy-hint">{copied ? '✓ Copied!' : 'Click to copy'}</span>
  </div>
</div>

<style>
  .room-info {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    padding: 12px 24px;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 100;
  }

  .room-info:hover {
    background: rgba(0, 0, 0, 0.9);
    transform: translateX(-50%) translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  }

  .room-info:active {
    transform: translateX(-50%) translateY(0);
  }

  .code-display {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .label {
    opacity: 0.7;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .code {
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    font-family: 'Courier New', monospace;
    color: #667eea;
    background: rgba(102, 126, 234, 0.2);
    padding: 4px 12px;
    border-radius: 6px;
  }

  .copy-hint {
    font-size: 0.75rem;
    opacity: 0.5;
    font-style: italic;
  }

  /* Mobile responsiveness */
  @media (max-width: 600px) {
    .room-info {
      bottom: 10px;
      padding: 10px 16px;
      max-width: calc(100vw - 40px);
    }

    .code-display {
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
    }

    .label {
      font-size: 0.75rem;
    }

    .code {
      font-size: 1.2rem;
      letter-spacing: 0.1em;
      padding: 3px 10px;
    }

    .copy-hint {
      font-size: 0.7rem;
      width: 100%;
      text-align: center;
    }
  }
</style>
