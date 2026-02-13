<script>
  import { createEventDispatcher } from 'svelte';

  export let userCount = 0;

  const dispatch = createEventDispatcher();

  function handleUsersClick() {
    dispatch('click');
  }

  function handleAvatarClick(e) {
    e.stopPropagation();
    dispatch('avatarClick');
  }
</script>

<div class="pill">
  <button class="avatar-side" on:click={handleAvatarClick} aria-label="Customize avatar">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  </button>
  <button class="online-side" on:click={handleUsersClick} aria-label="Show online users">
    <span class="dot"></span>
    <span class="count">{userCount}</span>
  </button>
</div>

<style>
  .pill {
    position: fixed;
    top: 20px;
    left: 20px;
    display: flex;
    align-items: stretch;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    border-radius: 24px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 100;
    overflow: hidden;
  }

  .avatar-side,
  .online-side {
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .avatar-side {
    padding: 10px 10px 10px 14px;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
  }

  .avatar-side:hover {
    color: white;
    background: rgba(255, 255, 255, 0.08);
  }

  .online-side {
    padding: 10px 16px 10px 12px;
    gap: 8px;
    font-size: 1rem;
    font-weight: 600;
    color: white;
  }

  .online-side:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .pill:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #10b981;
    flex-shrink: 0;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .count {
    min-width: 20px;
    text-align: center;
  }

  @media (max-width: 600px) {
    .pill {
      top: 10px;
      left: 10px;
    }

    .avatar-side {
      padding: 8px 8px 8px 12px;
    }

    .online-side {
      padding: 8px 14px 8px 10px;
      font-size: 0.9rem;
    }

    .dot {
      width: 8px;
      height: 8px;
    }
  }
</style>
