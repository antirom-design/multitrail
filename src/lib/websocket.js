/**
 * WebSocket Store for Multiplayer Drawing
 * Svelte store-based WebSocket manager
 */

import { writable } from 'svelte/store'

export function createWebSocket() {
  const { subscribe, set, update } = writable({
    connected: false,
    sessionId: null,
    houseCode: null,
    roomName: null,
    rooms: [],
    isHousemaster: false
  })

  let ws = null
  let reconnectTimeout = null
  let sessionId = generateSessionId()
  let messageHandlers = new Map()

  function connect(wsUrl) {
    console.log('🔌 websocket.js: connect() called with URL:', wsUrl);

    // Clear any existing connection
    if (ws) {
      console.log('🔌 Closing existing WebSocket connection...');
      ws.close()
    }

    console.log('🔌 Creating new WebSocket connection...');
    ws = new WebSocket(wsUrl)
    console.log('🔌 WebSocket object created:', ws);

    ws.onopen = () => {
      console.log('✅ WebSocket connected! Session ID:', sessionId)
      update(state => {
        const newState = { ...state, connected: true, sessionId };
        console.log('📡 Updating store state:', newState);
        return newState;
      })
      clearTimeout(reconnectTimeout)
    }

    ws.onclose = () => {
      console.log('❌ WebSocket disconnected')
      update(state => ({ ...state, connected: false }))

      // Auto-reconnect after 2s
      reconnectTimeout = setTimeout(() => {
        console.log('🔄 Attempting to reconnect...')
        connect(wsUrl)
      }, 2000)
    }

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error)
    }

    ws.onmessage = (event) => {
      console.log('📨 Received WebSocket message:', event.data);
      try {
        const message = JSON.parse(event.data)
        console.log('📨 Parsed message:', message);
        handleMessage(message)
      } catch (error) {
        console.error('❌ Failed to parse message:', error)
      }
    }

    console.log('✅ WebSocket event handlers configured');
  }

  function handleMessage(message) {
    const { type, data } = message
    console.log('🔄 handleMessage: type =', type, 'data =', data);

    switch (type) {
      case 'joined':
        console.log('✅ Joined room as', data.isHousemaster ? 'Housemaster' : 'Member');
        update(state => ({
          ...state,
          isHousemaster: data.isHousemaster,
          rooms: data.rooms || []
        }))
        break

      case 'rooms':
        console.log('👥 Received rooms update:', data);
        update(state => ({ ...state, rooms: data || [] }))
        break

      case 'remoteDrawPoints':
        console.log('📍 Dispatching remoteDrawPoints event:', data);
        window.dispatchEvent(new CustomEvent('remoteDrawPoints', { detail: data }))
        break

      case 'remoteCursor':
        console.log('🖱️ Dispatching remoteCursor event:', data);
        window.dispatchEvent(new CustomEvent('remoteCursor', { detail: data }))
        break

      case 'remoteSettings':
        console.log('⚙️ Dispatching remoteSettings event:', data);
        window.dispatchEvent(new CustomEvent('remoteSettings', { detail: data }))
        break

      case 'remoteStrokeStart':
        console.log('🎨 Dispatching remoteStrokeStart event:', data);
        window.dispatchEvent(new CustomEvent('remoteStrokeStart', { detail: data }))
        break

      case 'remoteStrokeEnd':
        console.log('🎨 Dispatching remoteStrokeEnd event:', data);
        window.dispatchEvent(new CustomEvent('remoteStrokeEnd', { detail: data }))
        break

      case 'error':
        console.error('❌ Server error:', message.message)
        break

      default:
        console.log('ℹ️ Received message:', type, data)
    }

    // Call registered handlers
    const handler = messageHandlers.get(type)
    if (handler) {
      console.log('🔧 Calling registered handler for:', type);
      handler(data)
    }
  }

  function send(type, data) {
    console.log('📤 send() called - type:', type, 'data:', data);
    console.log('📤 WebSocket state:', ws ? ws.readyState : 'null', '(OPEN =', WebSocket.OPEN, ')');

    if (ws && ws.readyState === WebSocket.OPEN) {
      const message = {
        type,
        data: { ...data, sessionId }
      };
      console.log('📤 Sending message:', message);
      ws.send(JSON.stringify(message))
      console.log('✅ Message sent');
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send:', type);
      console.warn('⚠️ ws:', ws, 'readyState:', ws ? ws.readyState : 'null');
    }
  }

  function joinHouse(houseCode, roomName) {
    console.log('🏠 joinHouse() called - houseCode:', houseCode, 'roomName:', roomName, 'sessionId:', sessionId);
    send('join', { houseCode, roomName, sessionId })
    update(state => {
      const newState = { ...state, houseCode, roomName, sessionId };
      console.log('🏠 Updated state:', newState);
      return newState;
    })
  }

  // Drawing-specific methods
  function sendPoints(points) {
    console.log('📍 sendPoints() called with', points.length, 'points');
    send('drawPoints', { points })
  }

  function sendStrokeStart(strokeId) {
    console.log('🎨 sendStrokeStart() called - strokeId:', strokeId);
    send('strokeStart', { strokeId, timestamp: Date.now() })
  }

  function sendStrokeEnd(strokeId) {
    console.log('🎨 sendStrokeEnd() called - strokeId:', strokeId);
    send('strokeEnd', { strokeId })
  }

  function sendCursor(x, y) {
    console.log('🖱️ sendCursor() called - x:', x, 'y:', y);
    send('cursorMove', { x, y, timestamp: Date.now() })
  }

  function sendSettings(settings) {
    console.log('⚙️ sendSettings() called:', settings);
    send('settingsUpdate', { settings })
  }

  function disconnect() {
    if (ws) {
      clearTimeout(reconnectTimeout)
      ws.close()
      ws = null
    }
    set({
      connected: false,
      sessionId: null,
      houseCode: null,
      roomName: null,
      rooms: [],
      isHousemaster: false
    })
  }

  function on(messageType, handler) {
    messageHandlers.set(messageType, handler)
  }

  return {
    subscribe,
    connect,
    joinHouse,
    sendPoints,
    sendStrokeStart,
    sendStrokeEnd,
    sendCursor,
    sendSettings,
    disconnect,
    on
  }
}

function generateSessionId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
