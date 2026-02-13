<script>
  import { createEventDispatcher } from 'svelte';

  export let users = []; // Array of { id, name, isHousemaster, canDraw }
  export let currentUserId = null;
  export let show = false;
  export let isHousemaster = false;

  const dispatch = createEventDispatcher();

  $: allStudentsLocked = users.filter(u => !u.isHousemaster).every(u => !u.canDraw);
  $: allStudentsHostView = users.filter(u => !u.isHousemaster).every(u => u.hasHostView);
  $: hasStudents = users.some(u => !u.isHousemaster);

  function handleClose() {
    dispatch('close');
  }

  function handleBackdropClick() {
    handleClose();
  }

  function handleContentClick(e) {
    e.stopPropagation();
  }

  function toggleDrawUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user || user.isHousemaster) return;
    dispatch('toggleDrawUser', { userId, canDraw: !user.canDraw });
  }

  function toggleDrawAll() {
    // If any student can draw, lock all. If all locked, unlock all.
    const newCanDraw = allStudentsLocked;
    dispatch('toggleDrawAll', { canDraw: newCanDraw });
  }

  function toggleHostViewUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user || user.isHousemaster) return;
    dispatch('toggleHostViewUser', { userId, hasHostView: !user.hasHostView });
  }

  function toggleHostViewAll() {
    const newHostView = !allStudentsHostView;
    dispatch('toggleHostViewAll', { hasHostView: newHostView });
  }
</script>

{#if show}
  <div class="overlay" on:click={handleBackdropClick} role="dialog" aria-modal="true">
    <div class="user-list" on:click={handleContentClick} role="document">
      <div class="header">
        <h3>Online ({users.length})</h3>
        <div class="header-actions">
          {#if isHousemaster && hasStudents}
            <button
              class="lock-all-btn"
              class:active={allStudentsHostView}
              on:click={toggleHostViewAll}
              title={allStudentsHostView ? 'Disable all host view' : 'Enable all host view'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>{allStudentsHostView ? 'Unview All' : 'View All'}</span>
            </button>
            <button
              class="lock-all-btn"
              class:locked={allStudentsLocked}
              on:click={toggleDrawAll}
              title={allStudentsLocked ? 'Unlock all drawing' : 'Lock all drawing'}
            >
              {#if allStudentsLocked}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Unlock All</span>
              {:else}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Lock All</span>
              {/if}
            </button>
          {/if}
          <button class="close-btn" on:click={handleClose} aria-label="Close">x</button>
        </div>
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
            {#if isHousemaster && !user.isHousemaster}
              <button
                class="draw-toggle hostview-toggle"
                class:active={user.hasHostView}
                on:click|stopPropagation={() => toggleHostViewUser(user.id)}
                title={user.hasHostView ? 'Disable host view' : 'Enable host view'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  {#if user.hasHostView}
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  {:else}
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  {/if}
                </svg>
              </button>
              <button
                class="draw-toggle"
                class:locked={!user.canDraw}
                on:click|stopPropagation={() => toggleDrawUser(user.id)}
                title={user.canDraw ? 'Block drawing' : 'Allow drawing'}
              >
                {#if user.canDraw}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
                {:else}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                {/if}
              </button>
            {:else if !isHousemaster && !user.isHousemaster && user.canDraw === false}
              <span class="draw-status locked">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
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

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
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

  .lock-all-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    transition: all 0.2s;
  }

  .lock-all-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .lock-all-btn.locked {
    background: rgba(255, 107, 107, 0.15);
    border-color: rgba(255, 107, 107, 0.3);
    color: #ff6b6b;
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

  .draw-toggle {
    margin-left: 8px;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: none;
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .draw-toggle:hover {
    background: rgba(16, 185, 129, 0.25);
  }

  .draw-toggle.locked {
    background: rgba(255, 107, 107, 0.15);
    color: #ff6b6b;
  }

  .draw-toggle.locked:hover {
    background: rgba(255, 107, 107, 0.25);
  }

  .hostview-toggle {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.4);
  }

  .hostview-toggle:hover {
    background: rgba(102, 126, 234, 0.15);
    color: rgba(102, 126, 234, 0.8);
  }

  .hostview-toggle.active {
    background: rgba(102, 126, 234, 0.2);
    color: #667eea;
  }

  .hostview-toggle.active:hover {
    background: rgba(102, 126, 234, 0.3);
  }

  .lock-all-btn.active {
    background: rgba(102, 126, 234, 0.15);
    border-color: rgba(102, 126, 234, 0.3);
    color: #667eea;
  }

  .draw-status {
    margin-left: 8px;
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .draw-status.locked {
    color: rgba(255, 107, 107, 0.6);
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
