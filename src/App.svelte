<script>
  import Canvas from './lib/Canvas.svelte';
  import Settings from './lib/Settings.svelte';

  let settings = {
    lifetimeMs: 15000,
    strokeWidth: 4,
    color: '#ffffff',
    drawStyle: 'line'
  };

  function handleSettingsUpdate(event) {
    settings = { ...event.detail };
  }
</script>

<main>
  <Canvas {settings} />
  <Settings bind:settings on:update={handleSettingsUpdate} />
</main>

<style>
  main {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
