<script>
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  export let backendUrl;

  const dispatch = createEventDispatcher();

  let tests = {
    backendUrl: { status: 'pending', message: '', details: '', startTime: null, elapsedTime: 0 },
    health: { status: 'pending', message: '', details: '', startTime: null, elapsedTime: 0 },
    socket: { status: 'pending', message: '', details: '', startTime: null, elapsedTime: 0 }
  };

  let allTestsPassed = false;
  let errorReport = '';
  let showRetry = false;
  let timerInterval;

  onMount(() => {
    runTests();

    // Update elapsed time for running tests
    timerInterval = setInterval(() => {
      tests = { ...tests };
      Object.keys(tests).forEach(key => {
        if (tests[key].status === 'running' && tests[key].startTime) {
          tests[key].elapsedTime = Math.floor((Date.now() - tests[key].startTime) / 1000);
        }
      });
    }, 500);

    return () => clearInterval(timerInterval);
  });

  async function runTests() {
    // Test 1: Check Backend URL
    updateTest('backendUrl', 'running', 'Checking backend URL...');

    if (!backendUrl || backendUrl === 'ws://localhost:3001') {
      updateTest('backendUrl', 'failed',
        'Backend URL not configured!',
        `Expected: wss://funkhaus-websocket.onrender.com\nGot: ${backendUrl || 'undefined'}\n\nFix: Using production backend URL`
      );
      generateErrorReport();
      return;
    }

    updateTest('backendUrl', 'passed', `Using: ${backendUrl}`);

    // Test 2: Health Check (convert ws:// to http://)
    updateTest('health', 'running', 'Checking backend...');

    const httpUrl = backendUrl.replace('wss://', 'https://').replace('ws://', 'http://');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      const response = await fetch(`${httpUrl}/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === 'ok' || data.service) {
        updateTest('health', 'passed', `Backend online (${data.service || 'Funkhaus'})`);
      } else {
        throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      const isTimeout = error.name === 'AbortError';
      updateTest('health', 'failed',
        isTimeout ? 'Backend timeout (90s)!' : 'Backend not reachable!',
        `URL: ${httpUrl}/\nError: ${error.message}\n\nPossible causes:\n1. Backend not deployed on Render\n2. Backend crashed (check Render logs)\n3. Wrong URL configuration${isTimeout ? '\n4. Server cold start taking too long' : ''}`
      );
      generateErrorReport();
      showRetry = true;
      return;
    }

    // Test 3: WebSocket Connection
    updateTest('socket', 'running', 'Testing WebSocket connection...');

    let ws = null;

    try {
      ws = new WebSocket(backendUrl);

      const socketTimeout = setTimeout(() => {
        if (ws) ws.close();
        updateTest('socket', 'failed',
          'WebSocket connection timeout!',
          `URL: ${backendUrl}\nTimeout after 90 seconds\n\nPossible causes:\n1. Backend not running\n2. WebSocket blocked by firewall\n3. Wrong backend URL`
        );
        generateErrorReport();
        showRetry = true;
      }, 90000);

      ws.onopen = () => {
        clearTimeout(socketTimeout);
        updateTest('socket', 'passed', `WebSocket connected successfully`);
        ws.close();

        allTestsPassed = true;
        setTimeout(() => {
          dispatch('testsPass');
        }, 1500);
      };

      ws.onerror = (error) => {
        clearTimeout(socketTimeout);
        if (ws) ws.close();
        updateTest('socket', 'failed',
          'WebSocket connection failed!',
          `URL: ${backendUrl}\nError: Connection refused\n\nCheck:\n1. Is Funkhaus backend running?\n2. Check Render logs for errors\n3. CORS might be blocking connection`
        );
        generateErrorReport();
      };
    } catch (error) {
      updateTest('socket', 'failed',
        'WebSocket error!',
        `URL: ${backendUrl}\nError: ${error.message}`
      );
      generateErrorReport();
    }
  }

  function updateTest(testName, status, message, details = '') {
    tests[testName] = {
      ...tests[testName],
      status,
      message,
      details,
      startTime: status === 'running' ? Date.now() : tests[testName].startTime,
      elapsedTime: status !== 'running' ? 0 : tests[testName].elapsedTime
    };
    tests = { ...tests };
  }

  function generateErrorReport() {
    errorReport = `
MULTITRAIL DEBUG REPORT
=======================

Frontend URL: ${window.location.origin}
Backend URL: ${backendUrl || 'NOT SET'}
Timestamp: ${new Date().toISOString()}

TEST RESULTS:
-------------

1. Backend URL Check: ${tests.backendUrl.status.toUpperCase()}
   ${tests.backendUrl.message}
   ${tests.backendUrl.details}

2. Health Endpoint: ${tests.health.status.toUpperCase()}
   ${tests.health.message}
   ${tests.health.details}

3. WebSocket Connection: ${tests.socket.status.toUpperCase()}
   ${tests.socket.message}
   ${tests.socket.details}

NEXT STEPS:
-----------
1. Check Funkhaus Backend on Render:
   - Go to: https://render.com → funkhaus-backend
   - Status should be "Live" (green)
   - Check Logs for errors

2. Check WebSocket URL:
   - Should be: wss://funkhaus-websocket.onrender.com
   - Currently using: ${backendUrl}

3. Redeploy after changes:
   - Render: Auto-deploys on git push
`.trim();

    dispatch('testsFail', errorReport);
  }

  function copyErrorReport() {
    navigator.clipboard.writeText(errorReport);
    alert('Error report copied to clipboard!');
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'running': return '⏳';
      default: return '⚪';
    }
  }

  function getStatusClass(status) {
    switch (status) {
      case 'passed': return 'test-passed';
      case 'failed': return 'test-failed';
      case 'running': return 'test-running';
      default: return 'test-pending';
    }
  }

  function getDynamicMessage(testName, test) {
    if (test.status !== 'running') return test.message;

    const elapsed = test.elapsedTime;

    if (testName === 'health' || testName === 'socket') {
      if (elapsed < 5) {
        return test.message;
      } else if (elapsed < 20) {
        return '⏰ Server waking up (Render cold start)...';
      } else {
        return `⏰ Cold start in progress (${elapsed}s elapsed)`;
      }
    }

    return test.message;
  }

  function handleRetry() {
    showRetry = false;
    errorReport = '';
    runTests();
  }
</script>

<div class="test-screen">
  <div class="test-card">
    <h1>🔧 System Check</h1>
    <p>Testing connection to backend...</p>

    <div class="tests-container">
      <div class="test-item {getStatusClass(tests.backendUrl.status)}">
        <div class="test-header">
          <span class="test-icon">{getStatusIcon(tests.backendUrl.status)}</span>
          <span class="test-title">Backend URL</span>
        </div>
        <div class="test-message">{tests.backendUrl.message}</div>
        {#if tests.backendUrl.details}
          <div class="test-details">{tests.backendUrl.details}</div>
        {/if}
      </div>

      <div class="test-item {getStatusClass(tests.health.status)}">
        <div class="test-header">
          <span class="test-icon">{getStatusIcon(tests.health.status)}</span>
          <span class="test-title">Health Check</span>
        </div>
        <div class="test-message">{getDynamicMessage('health', tests.health)}</div>
        {#if tests.health.status === 'running'}
          <div class="progress-bar-container">
            <div class="progress-bar" style="width: {Math.min((tests.health.elapsedTime / 90) * 100, 100)}%"></div>
            <span class="progress-time">{tests.health.elapsedTime}s / 90s</span>
          </div>
        {/if}
        {#if tests.health.status === 'running' && tests.health.elapsedTime >= 5}
          <div class="cold-start-info">
            Render cold start can take up to 60 seconds
          </div>
        {/if}
        {#if tests.health.details}
          <div class="test-details">{tests.health.details}</div>
        {/if}
      </div>

      <div class="test-item {getStatusClass(tests.socket.status)}">
        <div class="test-header">
          <span class="test-icon">{getStatusIcon(tests.socket.status)}</span>
          <span class="test-title">WebSocket Connection</span>
        </div>
        <div class="test-message">{getDynamicMessage('socket', tests.socket)}</div>
        {#if tests.socket.status === 'running'}
          <div class="progress-bar-container">
            <div class="progress-bar" style="width: {Math.min((tests.socket.elapsedTime / 90) * 100, 100)}%"></div>
            <span class="progress-time">{tests.socket.elapsedTime}s / 90s</span>
          </div>
        {/if}
        {#if tests.socket.status === 'running' && tests.socket.elapsedTime >= 5}
          <div class="cold-start-info">
            Render cold start can take up to 60 seconds
          </div>
        {/if}
        {#if tests.socket.details}
          <div class="test-details">{tests.socket.details}</div>
        {/if}
      </div>
    </div>

    {#if allTestsPassed}
      <div class="success-message">
        🎉 All tests passed! Starting app...
      </div>
    {/if}

    {#if errorReport}
      <div class="error-report">
        <h3>⚠️ Connection Failed</h3>
        <p>Copy this report and check the deployment guide:</p>
        <div style="display: flex; gap: 12px;">
          <button class="btn btn-primary" on:click={copyErrorReport}>
            📋 Copy Error Report
          </button>
          {#if showRetry}
            <button class="btn btn-secondary" on:click={handleRetry}>
              🔄 Retry Tests
            </button>
          {/if}
        </div>
        <pre class="error-details">{errorReport}</pre>
      </div>
    {/if}

    <div class="test-footer">
      <small>Backend: {backendUrl || 'Not configured'}</small>
    </div>
  </div>
</div>

<style>
  @import './test-screen.css';
</style>
