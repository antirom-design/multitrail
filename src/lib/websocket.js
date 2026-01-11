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
    // Clear any existing connection
    if (ws) {
      ws.close()
    }

    ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket connected')
      update(state => ({ ...state, connected: true, sessionId }))
      clearTimeout(reconnectTimeout)
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      update(state => ({ ...state, connected: false }))

      // Auto-reconnect after 2s
      reconnectTimeout = setTimeout(() => {
        console.log('Attempting to reconnect...')
        connect(wsUrl)
      }, 2000)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        handleMessage(message)
      } catch (error) {
        console.error('Failed to parse message:', error)
      }
    }
  }

  function handleMessage(message) {
    const { type, data } = message

    switch (type) {
      case 'joined':
        update(state => ({
          ...state,
          isHousemaster: data.isHousemaster,
          rooms: data.rooms || []
        }))
        console.log('Joined room as', data.isHousemaster ? 'Housemaster' : 'Member')
        break

      case 'rooms':
        update(state => ({ ...state, rooms: data || [] }))
        break

      case 'remoteDrawPoints':
        // Dispatch custom event for Canvas to listen to
        window.dispatchEvent(new CustomEvent('remoteDrawPoints', { detail: data }))
        break

      case 'remoteCursor':
        window.dispatchEvent(new CustomEvent('remoteCursor', { detail: data }))
        break

      case 'remoteSettings':
        window.dispatchEvent(new CustomEvent('remoteSettings', { detail: data }))
        break

      case 'remoteStrokeStart':
        window.dispatchEvent(new CustomEvent('remoteStrokeStart', { detail: data }))
        break

      case 'remoteStrokeEnd':
        window.dispatchEvent(new CustomEvent('remoteStrokeEnd', { detail: data }))
        break

      case 'error':
        console.error('Server error:', message.message)
        break

      default:
        console.log('Received message:', type, data)
    }

    // Call registered handlers
    const handler = messageHandlers.get(type)
    if (handler) {
      handler(data)
    }
  }

  function send(type, data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type,
        data: { ...data, sessionId }
      }))
    } else {
      console.warn('WebSocket not connected, cannot send:', type)
    }
  }

  function joinHouse(houseCode, roomName) {
    send('join', { houseCode, roomName, sessionId })
    update(state => ({ ...state, houseCode, roomName, sessionId }))
  }

  // Drawing-specific methods
  function sendPoints(points) {
    send('drawPoints', { points })
  }

  function sendStrokeStart(strokeId) {
    send('strokeStart', { strokeId, timestamp: Date.now() })
  }

  function sendStrokeEnd(strokeId) {
    send('strokeEnd', { strokeId })
  }

  function sendCursor(x, y) {
    send('cursorMove', { x, y, timestamp: Date.now() })
  }

  function sendSettings(settings) {
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
