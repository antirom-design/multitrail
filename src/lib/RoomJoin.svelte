<script>
  import { createEventDispatcher } from 'svelte';

  export let displayName;

  const dispatch = createEventDispatcher();

  let roomCode = '';
  let isEditingName = false;
  let newName = displayName;

  function handleCreate() {
    dispatch('createRoom');
  }

  function handleJoin(e) {
    e.preventDefault();
    if (roomCode.length === 6) {
      dispatch('joinRoom', roomCode.toUpperCase());
    }
  }

  function startEditName() {
    isEditingName = true;
    newName = displayName;
  }

  function cancelEditName() {
    isEditingName = false;
    newName = displayName;
  }

  function saveNewName(e) {
    e.preventDefault();
    if (newName.trim()) {
      dispatch('changeName', newName.trim());
      isEditingName = false;
    }
  }
</script>

<div class="join-screen">
  <div class="content">
    {#if isEditingName}
      <form on:submit={saveNewName} class="name-edit-form">
        <h2>Change your name</h2>
        <input
          type="text"
          bind:value={newName}
          placeholder="Your name"
          maxlength="20"
          autocomplete="off"
          autofocus
        />
        <div class="button-group">
          <button type="submit" class="primary" disabled={!newName.trim()}>
            Save
          </button>
          <button type="button" class="secondary" on:click={cancelEditName}>
            Cancel
          </button>
        </div>
      </form>
    {:else}
      <button class="edit-name-btn" on:click={startEditName} aria-label="Edit name">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <h1>Hey, {displayName}!</h1>
      <p>Create a new room or join an existing one</p>
    {/if}

    {#if !isEditingName}
    <div class="form">
      <button class="primary" on:click={handleCreate}>
        Create New Room
      </button>

      <div class="divider">
        <span class="or-text">or join existing</span>
      </div>

      <form on:submit={handleJoin}>
        <div class="join-group">
          <input
            type="text"
            bind:value={roomCode}
            placeholder="XJ9L2W"
            maxlength="6"
            autocomplete="off"
            style="text-transform: uppercase; text-align: center; font-size: 20px; letter-spacing: 2px;"
          />
          <button
            type="submit"
            disabled={roomCode.length !== 6}
          >
            Join Room
          </button>
        </div>
      </form>
    </div>
    {/if}
  </div>
</div>

<style>
  .join-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .content {
    text-align: center;
  }

  .edit-name-btn {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: white;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    opacity: 0.6;
    margin-bottom: 8px;
  }

  .edit-name-btn:hover {
    opacity: 1;
    transform: scale(1.15);
  }

  .edit-name-btn svg {
    display: block;
  }

  h1 {
    font-size: 3rem;
    margin: 0 0 0.5rem 0;
    font-weight: 300;
  }

  h2 {
    font-size: 2rem;
    margin: 0 0 1.5rem 0;
    font-weight: 300;
  }

  p {
    font-size: 1.2rem;
    margin: 0 0 3rem 0;
    opacity: 0.9;
    font-weight: 300;
  }

  .name-edit-form {
    background: rgba(255, 255, 255, 0.1);
    padding: 2.5rem;
    border-radius: 16px;
    backdrop-filter: blur(10px);
    min-width: 400px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }

  .name-edit-form input {
    width: 100%;
    padding: 14px 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 1rem;
    transition: all 0.2s;
    box-sizing: border-box;
    margin-bottom: 1rem;
  }

  .name-edit-form input:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.6);
    background: rgba(255, 255, 255, 0.15);
  }

  .name-edit-form input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  .button-group {
    display: flex;
    gap: 12px;
  }

  .button-group button {
    flex: 1;
  }

  .form {
    background: rgba(255, 255, 255, 0.1);
    padding: 2.5rem;
    border-radius: 16px;
    backdrop-filter: blur(10px);
    min-width: 400px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }

  button {
    padding: 14px 28px;
    border: none;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid rgba(255, 255, 255, 0.3);
    width: 100%;
  }

  button.primary {
    background: rgba(255, 255, 255, 0.9);
    color: #667eea;
    border-color: transparent;
  }

  button.secondary {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
  }

  button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  button.primary:hover:not(:disabled) {
    background: white;
  }

  button.secondary:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
  }

  button:active:not(:disabled) {
    transform: translateY(0);
  }

  button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .divider {
    margin: 1.5rem 0;
    text-align: center;
  }

  .or-text {
    opacity: 0.7;
    font-size: 0.9rem;
  }

  .join-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  input {
    width: 100%;
    padding: 14px 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 1rem;
    transition: all 0.2s;
    box-sizing: border-box;
  }

  input:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.6);
    background: rgba(255, 255, 255, 0.15);
  }

  input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  form {
    margin: 0;
  }

  /* Mobile responsiveness */
  @media (max-width: 600px) {
    h1 {
      font-size: 2.5rem;
    }

    h2 {
      font-size: 1.5rem;
    }

    p {
      font-size: 1rem;
      margin-bottom: 2rem;
    }

    .form {
      min-width: 0;
      width: calc(100vw - 40px);
      padding: 2rem 1.5rem;
    }

    .name-edit-form {
      min-width: 0;
      width: calc(100vw - 40px);
      padding: 2rem 1.5rem;
    }

    .edit-name-btn svg {
      width: 14px;
      height: 14px;
    }
  }
</style>
