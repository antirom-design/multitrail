<script>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let displayName = '';

  function handleSubmit(e) {
    e.preventDefault();
    if (displayName.trim()) {
      dispatch('submit', displayName.trim());
    }
  }
</script>

<div class="name-input-screen">
  <div class="name-card">
    <h1>Welcome to Multitrail</h1>
    <p>Enter your name to start drawing</p>

    <form on:submit={handleSubmit}>
      <input
        type="text"
        bind:value={displayName}
        placeholder="Your name"
        maxlength="20"
        autocomplete="off"
        autofocus
      />

      <button type="submit" disabled={!displayName.trim()}>
        Continue
      </button>
    </form>
  </div>
</div>

<style>
  .name-input-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .name-card {
    background: white;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    padding: 48px 40px;
    max-width: 400px;
    width: 100%;
    text-align: center;
  }

  h1 {
    font-size: 32px;
    color: #333;
    margin: 0 0 12px 0;
    font-weight: 300;
  }

  p {
    color: #666;
    margin: 0 0 32px 0;
    font-size: 16px;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  input {
    width: 100%;
    padding: 16px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 16px;
    transition: all 0.2s;
    box-sizing: border-box;
  }

  input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  button {
    width: 100%;
    padding: 16px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  button:hover:not(:disabled) {
    background: #5568d3;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }

  button:active:not(:disabled) {
    transform: translateY(0);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    .name-input-screen {
      padding: 0;
    }

    .name-card {
      border-radius: 0;
      padding: 32px 24px;
      max-width: 100%;
    }

    h1 {
      font-size: 28px;
    }

    p {
      font-size: 14px;
    }
  }
</style>
