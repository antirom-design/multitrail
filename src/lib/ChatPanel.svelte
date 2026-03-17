<script>
  import { createEventDispatcher, afterUpdate, tick } from 'svelte';
  import { fly } from 'svelte/transition';

  export let show = false;
  export let messages = [];
  export let currentUserId = '';
  export let isHousemaster = false;
  export let websocket = null;
  export let users = [];
  export let chatMode = 'all2all';

  const dispatch = createEventDispatcher();

  let inputText = '';
  let messagesEl;
  let replyTarget = null; // { id, name } for host replying to student in all2host

  // Auto-scroll on new messages
  afterUpdate(() => {
    if (messagesEl) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  });

  function sendMessage() {
    const text = inputText.trim();
    if (!text || !websocket) return;
    websocket.sendChatMessage(text, replyTarget?.id || null);
    inputText = '';
    replyTarget = null;
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function setReplyTarget(msg) {
    if (!isHousemaster || chatMode !== 'all2host') return;
    if (msg.senderId === currentUserId) return;
    replyTarget = { id: msg.senderId, name: msg.senderName };
  }

  function clearReply() {
    replyTarget = null;
  }

  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  function getUserColor(senderId) {
    const user = users.find(u => u.id === senderId);
    return user?.color || '#aaa';
  }

  // In all2host mode, students only see their own messages + host replies to them
  $: visibleMessages = chatMode === 'all2host' && !isHousemaster
    ? messages.filter(m => m.senderId === currentUserId || m.replyTo === currentUserId || m.senderIsHost)
    : messages;

  $: isOwnMessage = (msg) => msg.senderId === currentUserId;
</script>

{#if show}
  <div class="chat-sidebar" transition:fly={{ x: 320, duration: 250 }}>
    <div class="chat-header">
      <div class="header-left">
        <h3>Chat</h3>
        {#if chatMode === 'all2host'}
          <span class="mode-badge">privat</span>
        {/if}
      </div>
      <button class="close-btn" on:click={() => dispatch('close')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <div class="chat-messages" bind:this={messagesEl}>
      {#if visibleMessages.length === 0}
        <div class="empty-state">Noch keine Nachrichten</div>
      {:else}
        {#each visibleMessages as msg (msg.id)}
          <div
            class="message"
            class:own={msg.senderId === currentUserId}
            class:clickable={isHousemaster && chatMode === 'all2host' && msg.senderId !== currentUserId}
            on:click={() => setReplyTarget(msg)}
            role={isHousemaster && chatMode === 'all2host' && msg.senderId !== currentUserId ? 'button' : undefined}
          >
            <div class="msg-header">
              <span class="sender" style="color: {msg.senderColor || getUserColor(msg.senderId)}">
                {msg.senderName}
              </span>
              <span class="time">{formatTime(msg.timestamp)}</span>
            </div>
            {#if msg.replyTo && isHousemaster}
              <div class="reply-indicator">
                &#8618; an {users.find(u => u.id === msg.replyTo)?.name || '...'}
              </div>
            {/if}
            <div class="msg-text">{msg.text}</div>
          </div>
        {/each}
      {/if}
    </div>

    {#if replyTarget}
      <div class="reply-bar">
        <span>Antwort an <strong>{replyTarget.name}</strong></span>
        <button class="reply-cancel" on:click={clearReply}>x</button>
      </div>
    {/if}

    <form class="chat-input" on:submit|preventDefault={sendMessage}>
      <input
        type="text"
        bind:value={inputText}
        on:keydown={handleKeydown}
        placeholder={replyTarget ? `An ${replyTarget.name}...` : 'Nachricht...'}
        maxlength="500"
        autocomplete="off"
      />
      <button type="submit" class="send-btn" disabled={!inputText.trim()}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </form>
  </div>
{/if}

<style>
  .chat-sidebar {
    position: fixed;
    top: 0;
    right: 0;
    width: 320px;
    height: 100%;
    background: rgba(10, 10, 15, 0.95);
    backdrop-filter: blur(20px);
    z-index: 900;
    display: flex;
    flex-direction: column;
    border-left: 1px solid rgba(255, 255, 255, 0.08);
  }

  .chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .mode-badge {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 2px 8px;
    border-radius: 4px;
    background: rgba(102, 126, 234, 0.2);
    color: #667eea;
  }

  .close-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    padding: 4px;
  }

  .close-btn:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }

  .close-btn svg {
    width: 16px;
    height: 16px;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .empty-state {
    color: rgba(255, 255, 255, 0.3);
    text-align: center;
    margin-top: 40px;
    font-size: 0.85rem;
  }

  .message {
    padding: 8px 10px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.04);
    transition: background 0.15s;
  }

  .message.own {
    background: rgba(102, 126, 234, 0.1);
  }

  .message.clickable {
    cursor: pointer;
  }

  .message.clickable:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .msg-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 2px;
  }

  .sender {
    font-size: 0.75rem;
    font-weight: 600;
  }

  .time {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.25);
  }

  .reply-indicator {
    font-size: 0.7rem;
    color: rgba(102, 126, 234, 0.7);
    margin-bottom: 2px;
  }

  .msg-text {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.9);
    line-height: 1.4;
    word-break: break-word;
  }

  .reply-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: rgba(102, 126, 234, 0.1);
    border-top: 1px solid rgba(102, 126, 234, 0.2);
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.7);
    flex-shrink: 0;
  }

  .reply-cancel {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    font-size: 1rem;
    padding: 0 4px;
  }

  .reply-cancel:hover {
    color: white;
  }

  .chat-input {
    display: flex;
    gap: 8px;
    padding: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
  }

  .chat-input input {
    flex: 1;
    padding: 10px 14px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.06);
    color: white;
    font-size: 0.85rem;
    outline: none;
    transition: border-color 0.2s;
  }

  .chat-input input::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }

  .chat-input input:focus {
    border-color: rgba(102, 126, 234, 0.5);
  }

  .send-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: #667eea;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    flex-shrink: 0;
    padding: 8px;
  }

  .send-btn:hover:not(:disabled) {
    background: #5a6fd6;
  }

  .send-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .send-btn svg {
    width: 16px;
    height: 16px;
  }

  @media (max-width: 600px) {
    .chat-sidebar {
      width: 100%;
    }
  }
</style>
