<script>
  import { createEventDispatcher } from 'svelte';

  export let userCount = 0;

  const dispatch = createEventDispatcher();

  function handleClick() {
    dispatch('click');
  }
</script>

<button class="online-indicator" on:click={handleClick} aria-label="Show online users">
  <span class="dot"></span>
  <span class="count">{userCount}</span>
</button>

<style>
  .online-indicator {
    position: fixed;
    top: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    border: none;
    border-radius: 24px;
    padding: 10px 16px;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 100;
    font-size: 1rem;
    font-weight: 600;
  }

  .online-indicator:hover {
    background: rgba(0, 0, 0, 0.9);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  }

  .online-indicator:active {
    transform: translateY(0);
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

  /* Mobile responsiveness */
  @media (max-width: 600px) {
    .online-indicator {
      top: 10px;
      left: 10px;
      padding: 8px 14px;
      font-size: 0.9rem;
    }

    .dot {
      width: 8px;
      height: 8px;
    }
  }
</style>
