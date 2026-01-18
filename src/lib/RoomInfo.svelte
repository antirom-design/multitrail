<script>
  export let roomCode = '';

  let copied = false;
  let showQRCode = false;

  function copyCode(e) {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(shareUrl);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  function handleCodeKeyPress(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      copyCode(e);
    }
  }

  function toggleQRCode(e) {
    e.stopPropagation();
    showQRCode = !showQRCode;
  }

  function closeQRCode(e) {
    if (e) e.stopPropagation();
    showQRCode = false;
  }

  // Generate share URL
  $: shareUrl = `${window.location.origin}?join=${roomCode}`;
  $: qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`;
</script>

<div class="room-info">
  <span class="label">Room:</span>
  <span class="code" on:click={copyCode} on:keypress={handleCodeKeyPress} role="button" tabindex="0">{roomCode}</span>
  <span class="copy-hint">{copied ? '✓' : '📋'}</span>
  <button
    class="share-btn"
    on:click={toggleQRCode}
    aria-label="Share QR Code"
    title="Show QR Code"
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
      <polyline points="16 6 12 2 8 6"/>
      <line x1="12" y1="2" x2="12" y2="15"/>
    </svg>
  </button>
</div>

{#if showQRCode}
  <div class="qr-modal" on:click={closeQRCode} role="dialog" aria-modal="true">
    <div class="qr-content" on:click={(e) => e.stopPropagation()}>
      <button class="close-btn" on:click={closeQRCode} aria-label="Close">×</button>
      <h3>Scan to Join</h3>
      <div class="qr-code">
        <img src={qrCodeUrl} alt="QR Code to join room {roomCode}" />
      </div>
      <p class="share-url">{shareUrl}</p>
      <p class="hint">Scan this code to join the room</p>
    </div>
  </div>
{/if}

<style>
  .room-info {
    position: fixed;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    padding: 8px 16px;
    color: white;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
  }

  .label {
    opacity: 0.7;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .code {
    font-weight: 600;
    letter-spacing: 0.1em;
    font-family: 'Courier New', monospace;
    color: #667eea;
    cursor: pointer;
    padding: 2px 8px;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .code:hover {
    background: rgba(102, 126, 234, 0.2);
  }

  .copy-hint {
    font-size: 1rem;
    opacity: 0.7;
    cursor: pointer;
  }

  .share-btn {
    background: rgba(102, 126, 234, 0.3);
    border: none;
    border-radius: 50%;
    padding: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #667eea;
    transition: all 0.2s;
  }

  .share-btn:hover {
    background: rgba(102, 126, 234, 0.5);
  }

  .share-btn svg {
    display: block;
  }

  .qr-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .qr-content {
    background: white;
    border-radius: 16px;
    padding: 32px;
    max-width: 400px;
    width: calc(100vw - 40px);
    text-align: center;
    position: relative;
    animation: slideUp 0.3s;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .close-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    background: none;
    border: none;
    font-size: 32px;
    cursor: pointer;
    color: #666;
    line-height: 1;
    padding: 4px 8px;
    transition: color 0.2s;
  }

  .close-btn:hover {
    color: #000;
  }

  .qr-content h3 {
    margin: 0 0 20px 0;
    font-size: 1.5rem;
    color: #333;
    font-weight: 600;
  }

  .qr-code {
    background: white;
    padding: 16px;
    border-radius: 12px;
    display: inline-block;
    margin-bottom: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .qr-code img {
    display: block;
    width: 300px;
    height: 300px;
    max-width: 100%;
  }

  .share-url {
    font-size: 0.9rem;
    color: #667eea;
    margin: 12px 0;
    word-break: break-all;
    font-family: 'Courier New', monospace;
    background: rgba(102, 126, 234, 0.1);
    padding: 8px 12px;
    border-radius: 6px;
  }

  .hint {
    font-size: 0.85rem;
    color: #666;
    margin: 8px 0 0 0;
  }

  /* Mobile responsiveness */
  @media (max-width: 600px) {
    .room-info {
      bottom: 8px;
      padding: 6px 12px;
      font-size: 0.85rem;
      gap: 6px;
    }

    .label {
      font-size: 0.8rem;
    }

    .code {
      font-size: 0.85rem;
    }

    .share-btn {
      padding: 4px;
    }

    .share-btn svg {
      width: 16px;
      height: 16px;
    }
  }
</style>
