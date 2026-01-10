<script>
  export let users = []; // Array of { id, name, isHousemaster }
  export let currentUserId = null;
</script>

<div class="user-list">
  <h3>Online ({users.length})</h3>
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

<style>
  .user-list {
    position: fixed;
    top: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    padding: 16px;
    color: white;
    min-width: 200px;
    max-width: 250px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 100;
  }

  h3 {
    margin: 0 0 12px 0;
    font-size: 0.9rem;
    font-weight: 600;
    opacity: 0.8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    display: flex;
    align-items: center;
    padding: 8px;
    margin-bottom: 4px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    transition: background 0.2s;
  }

  li:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  li.current {
    background: rgba(255, 255, 255, 0.15);
    font-weight: 600;
  }

  .indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10b981;
    margin-right: 10px;
    flex-shrink: 0;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
  }

  .name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.9rem;
  }

  .badge {
    margin-left: 8px;
    padding: 2px 8px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    flex-shrink: 0;
  }

  .badge.you {
    background: rgba(102, 126, 234, 0.6);
  }

  /* Mobile responsiveness */
  @media (max-width: 600px) {
    .user-list {
      top: 10px;
      left: 10px;
      min-width: 150px;
      max-width: 180px;
      padding: 12px;
    }

    h3 {
      font-size: 0.8rem;
    }

    .name {
      font-size: 0.85rem;
    }

    li {
      padding: 6px;
    }
  }
</style>
