<script>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let roomCode = '';
  let userName = '';
  let errorMessage = '';

  function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  function handleCreate() {
    errorMessage = '';
    if (!userName.trim()) {
      errorMessage = 'Please enter your name';
      return;
    }
    const code = generateRoomCode();
    dispatch('join', { roomCode: code, userName: userName.trim() });
  }

  function handleJoin() {
    errorMessage = '';
    if (!userName.trim()) {
      errorMessage = 'Please enter your name';
      return;
    }
    if (!roomCode.trim()) {
      errorMessage = 'Please enter a room code';
      return;
    }
    dispatch('join', { roomCode: roomCode.trim().toUpperCase(), userName: userName.trim() });
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter') {
      if (roomCode.trim()) {
        handleJoin();
      } else {
        handleCreate();
      }
    }
  }
</script>

<div class="join-screen">
  <div class="content">
    <h1>Multitrail</h1>
    <p class="subtitle">Multiplayer Drawing</p>

    <div class="form">
      <input
        type="text"
        placeholder="Your name"
        bind:value={userName}
        on:keypress={handleKeyPress}
        maxlength="20"
        autocomplete="off"
      />

      <div class="divider">
        <button class="primary" on:click={handleCreate} disabled={!userName.trim()}>
          Create New Room
        </button>

        <span class="or-text">or join existing</span>

        <div class="join-group">
          <input
            type="text"
            placeholder="Room code"
            bind:value={roomCode}
            on:keypress={handleKeyPress}
            maxlength="6"
            autocomplete="off"
          />
          <button on:click={handleJoin} disabled={!userName.trim() || !roomCode.trim()}>
            Join Room
          </button>
        </div>
      </div>

      {#if errorMessage}
        <div class="error">{errorMessage}</div>
      {/if}
    </div>
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

  h1 {
    font-size: 4rem;
    margin: 0 0 0.5rem 0;
    font-weight: 300;
    letter-spacing: 0.1em;
  }

  .subtitle {
    font-size: 1.2rem;
    margin: 0 0 3rem 0;
    opacity: 0.9;
    font-weight: 300;
  }

  .form {
    background: rgba(255, 255, 255, 0.1);
    padding: 2.5rem;
    border-radius: 16px;
    backdrop-filter: blur(10px);
    min-width: 400px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }

  input {
    width: 100%;
    padding: 14px 16px;
    margin-bottom: 1rem;
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
  }

  button.primary {
    background: rgba(255, 255, 255, 0.9);
    color: #667eea;
    border-color: transparent;
  }

  button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  button.primary:hover:not(:disabled) {
    background: white;
  }

  button:active:not(:disabled) {
    transform: translateY(0);
  }

  button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .divider {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    align-items: stretch;
    margin-top: 0.5rem;
  }

  .or-text {
    opacity: 0.7;
    font-size: 0.9rem;
    text-align: center;
  }

  .join-group {
    display: flex;
    gap: 0.75rem;
  }

  .join-group input {
    flex: 1;
    margin-bottom: 0;
    text-transform: uppercase;
  }

  .join-group button {
    white-space: nowrap;
  }

  .error {
    margin-top: 1rem;
    padding: 12px;
    background: rgba(255, 59, 48, 0.2);
    border: 1px solid rgba(255, 59, 48, 0.4);
    border-radius: 6px;
    color: white;
    font-size: 0.9rem;
  }

  /* Mobile responsiveness */
  @media (max-width: 600px) {
    h1 {
      font-size: 2.5rem;
    }

    .subtitle {
      font-size: 1rem;
      margin-bottom: 2rem;
    }

    .form {
      min-width: 0;
      width: calc(100vw - 40px);
      padding: 2rem 1.5rem;
    }

    .join-group {
      flex-direction: column;
      gap: 0.5rem;
    }

    .join-group input {
      margin-bottom: 0.5rem;
    }
  }
</style>
