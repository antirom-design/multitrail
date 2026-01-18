<script>
  import { createEventDispatcher } from 'svelte';

  export let users = []; // Array of { id, name, isHousemaster }
  export let currentUserId = null;
  export let show = false;

  const dispatch = createEventDispatcher();

  function handleClose() {
    dispatch('close');
  }

  function handleBackdropClick() {
    handleClose();
  }

  function handleContentClick(e) {
    e.stopPropagation();
  }
</script>

{#if show}
  <div class="overlay" on:click={handleBackdropClick} role="dialog" aria-modal="true">
    <div class="user-list" on:click={handleContentClick} role="document">
      <div class="header">
        <h3>Online ({users.length})</h3>
        <button class="close-btn" on:click={handleClose} aria-label="Close">×</button>
      </div>
      <ul>
        {#each users as user}
          <li class:current={user.id === currentUserId}>
            <span class="indicator"></span>
            <span class="name">{user.name}</span>
            {#if user.isHousemaster}
              <span class="badge">Host</span>
            {/if}
            {#if user.id === currentUserId}
              <span class="badge you">You</span>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
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

  .user-list {
    background: rgba(0, 0, 0, 0.95);
    backdrop-filter: blur(20px);
    border-radius: 16px;
    padding: 20px;
    color: white;
    min-width: 300px;
    max-width: 400px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    animation: slideUp 0.3s;
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

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .close-btn {
    background: none;
    border: none;
    color: white;
    font-size: 32px;
    cursor: pointer;
    line-height: 1;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.2s;
  }

  .close-btn:hover {
    opacity: 0.7;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    display: flex;
    align-items: center;
    padding: 12px;
    margin-bottom: 6px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    transition: background 0.2s;
  }

  li:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  li.current {
    background: rgba(102, 126, 234, 0.3);
    font-weight: 600;
  }

  .indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #10b981;
    margin-right: 12px;
    flex-shrink: 0;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
  }

  .name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 1rem;
  }

  .badge {
    margin-left: 8px;
    padding: 3px 10px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    flex-shrink: 0;
  }

  .badge.you {
    background: rgba(102, 126, 234, 0.7);
  }

  /* Mobile responsiveness */
  @media (max-width: 600px) {
    .user-list {
      min-width: 0;
      width: calc(100vw - 40px);
      max-width: 400px;
      padding: 16px;
    }

    h3 {
      font-size: 1rem;
    }

    .name {
      font-size: 0.9rem;
    }

    li {
      padding: 10px;
    }
  }
</style>
