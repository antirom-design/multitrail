/**
 * WebSocket Store for Multiplayer Drawing
 * Svelte store-based WebSocket manager
 */

import { writable } from 'svelte/store'

export function createWebSocket(existingSessionId = null) {
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
  let sessionId = existingSessionId || generateSessionId()
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
      try {
        const message = JSON.parse(event.data)
        handleMessage(message)
      } catch (error) {
        console.error('❌ Failed to parse message:', error)
      }
    }

    console.log('✅ WebSocket event handlers configured');
  }

  function handleMessage(message) {
    const { type, data } = message

    switch (type) {
      case 'joined':
        console.log('✅ Joined room as', data.isHousemaster ? 'Housemaster' : 'Member');
        console.log('📋 Room mode:', data.mode, 'Tafel strokes:', data.tafelStrokes?.length || 0);
        update(state => ({
          ...state,
          isHousemaster: data.isHousemaster,
          rooms: data.rooms || []
        }))
        // Dispatch initial state event for mode, tafel strokes, chat, and hand queue
        window.dispatchEvent(new CustomEvent('roomInitialState', {
          detail: {
            mode: data.mode || 'trail',
            tafelStrokes: data.tafelStrokes || [],
            chatMessages: data.chatMessages || [],
            handQueue: data.handQueue || [],
            chatMode: data.chatMode || 'all2all'
          }
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

      case 'modeChange':
        console.log('🔄 Dispatching modeChange event:', data);
        window.dispatchEvent(new CustomEvent('modeChange', { detail: data }))
        break

      case 'roomLifetimeChange':
        console.log('⏱️ Dispatching roomLifetimeChange event:', data);
        window.dispatchEvent(new CustomEvent('roomLifetimeChange', { detail: data }))
        break

      case 'tafelStroke':
        console.log('📝 Dispatching tafelStroke event:', data);
        window.dispatchEvent(new CustomEvent('tafelStroke', { detail: data }))
        break

      case 'tafelDrawing':
        // Live drawing points from remote user
        window.dispatchEvent(new CustomEvent('tafelDrawing', { detail: data }))
        break

      case 'tafelErase':
        console.log('🗑️ Dispatching tafelErase event:', data);
        window.dispatchEvent(new CustomEvent('tafelErase', { detail: data }))
        break

      case 'tafelClear':
        console.log('🧹 Dispatching tafelClear event:', data);
        window.dispatchEvent(new CustomEvent('tafelClear', { detail: data }))
        break

      case 'tafelClearMine':
        console.log('🧹 Dispatching tafelClearMine event:', data);
        window.dispatchEvent(new CustomEvent('tafelClearMine', { detail: data }))
        break

      case 'tafelSync':
        console.log('📥 Dispatching tafelSync event:', data);
        window.dispatchEvent(new CustomEvent('tafelSync', { detail: data }))
        break

      case 'userColorChange':
        console.log('🎨 Dispatching userColorChange event:', data);
        window.dispatchEvent(new CustomEvent('userColorChange', { detail: data }))
        break

      case 'playerMove':
        window.dispatchEvent(new CustomEvent('playerMove', { detail: data }))
        break

      case 'playerJump':
        window.dispatchEvent(new CustomEvent('playerJump', { detail: data }))
        break

      case 'playerCustomize':
        window.dispatchEvent(new CustomEvent('playerCustomize', { detail: data }))
        break

      // Quiz-specific events
      case 'quizMissionStarted':
        console.log('🎮 Dispatching quizMissionStarted event:', data);
        window.dispatchEvent(new CustomEvent('quizMissionStarted', { detail: data }))
        break

      case 'quizResult':
        console.log('📊 Dispatching quizResult event:', data);
        window.dispatchEvent(new CustomEvent('quizResult', { detail: data }))
        break

      case 'towerShot':
        console.log('🔫 Dispatching towerShot event:', data);
        window.dispatchEvent(new CustomEvent('towerShot', { detail: data }))
        break

      case 'pulse':
        console.log('📡 Dispatching pulse event:', data);
        window.dispatchEvent(new CustomEvent('pulse', { detail: data }))
        break

      case 'quizMissionEnded':
        console.log('🏁 Dispatching quizMissionEnded event:', data);
        window.dispatchEvent(new CustomEvent('quizMissionEnded', { detail: data }))
        break

      // Chat events
      case 'chatMessage':
        window.dispatchEvent(new CustomEvent('chatMessage', { detail: data }))
        break

      case 'chatModeChanged':
        window.dispatchEvent(new CustomEvent('chatModeChanged', { detail: data }))
        break

      // Hand-raise events
      case 'handRaised':
        window.dispatchEvent(new CustomEvent('handRaised', { detail: data }))
        break

      case 'handLowered':
        window.dispatchEvent(new CustomEvent('handLowered', { detail: data }))
        break

      case 'handCalledOn':
        window.dispatchEvent(new CustomEvent('handCalledOn', { detail: data }))
        break

      case 'allHandsLowered':
        window.dispatchEvent(new CustomEvent('allHandsLowered', { detail: data }))
        break

      case 'chatViewPushed':
        window.dispatchEvent(new CustomEvent('chatViewPushed', { detail: data }))
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

  function sendStrokeStart(strokeId, color) {
    console.log('🎨 sendStrokeStart() called - strokeId:', strokeId, 'color:', color);
    send('strokeStart', { strokeId, timestamp: Date.now(), color })
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

  // Tafel mode methods
  function sendModeChange(mode) {
    console.log('🔄 sendModeChange() called - mode:', mode);
    send('modeChange', { mode })
  }

  function sendRoomLifetimeChange(lifetimeMs) {
    console.log('⏱️ sendRoomLifetimeChange() called - lifetimeMs:', lifetimeMs);
    send('roomLifetimeChange', { lifetimeMs })
  }

  function sendTafelStroke(stroke) {
    console.log('📝 sendTafelStroke() called:', stroke.strokeId);
    send('tafelStroke', { stroke })
  }

  function sendTafelDrawing(strokeId, points, strokeInfo) {
    // Stream live drawing points in tafel mode
    send('tafelDrawing', { strokeId, points, strokeInfo })
  }

  function sendTafelErase(strokeIds) {
    console.log('🗑️ sendTafelErase() called - strokeIds:', strokeIds);
    send('tafelErase', { strokeIds })
  }

  function sendTafelClear() {
    console.log('🧹 sendTafelClear() called');
    send('tafelClear', {})
  }

  function sendTafelClearMine() {
    console.log('🧹 sendTafelClearMine() called');
    send('tafelClearMine', {})
  }

  function sendUserColorChange(color) {
    console.log('🎨 sendUserColorChange() called - color:', color);
    send('userColorChange', { color })
  }

  // Draw permission methods
  function sendSetDrawPermission(targetSessionId, canDraw) {
    send('setDrawPermission', { targetSessionId, canDraw })
  }

  function sendSetDrawPermissionAll(canDraw) {
    send('setDrawPermission', { all: true, canDraw })
  }

  // Host view permission methods
  function sendSetHostView(targetSessionId, hasHostView) {
    send('setHostView', { targetSessionId, hasHostView })
  }

  function sendSetHostViewAll(hasHostView) {
    send('setHostView', { all: true, hasHostView })
  }

  // Avatar mode methods
  function sendPlayerMove(position, direction, floor = 0) {
    send('playerMove', { position, direction, floor })
  }

  function sendPlayerJump() {
    send('playerJump', {})
  }

  function sendPlayerCustomize(customization) {
    send('playerCustomize', { customization })
  }

  // Chat methods
  function sendChatMessage(text, replyTo = null) {
    send('chatMessage', { text, replyTo })
  }

  function sendSetChatPermission(targetSessionId, canChat) {
    send('setChatPermission', { targetSessionId, canChat })
  }

  function sendSetChatPermissionAll(canChat) {
    send('setChatPermission', { all: true, canChat })
  }

  function sendSetChatMode(mode) {
    send('setChatMode', { mode })
  }

  // Hand-raise methods
  function sendRaiseHand() {
    send('raiseHand', {})
  }

  function sendLowerHand() {
    send('lowerHand', {})
  }

  function sendCallOnStudent(targetSessionId) {
    send('callOnStudent', { targetSessionId })
  }

  function sendLowerAllHands() {
    send('lowerAllHands', {})
  }

  // Quiz mode methods
  function startQuizMission(sessionId, questions) {
    console.log('🎮 startQuizMission() called with', questions.length, 'questions');
    send('startQuizMission', { sessionId, questions })
  }

  function submitQuizAnswer(sessionId, questionId, answerIndex) {
    console.log('📝 submitQuizAnswer() called - questionId:', questionId, 'answerIndex:', answerIndex);
    send('submitQuizAnswer', { sessionId, questionId, answerIndex })
  }

  function endQuizMission(sessionId) {
    console.log('🏁 endQuizMission() called');
    send('endQuizMission', { sessionId })
  }

  function updateQuizSettings(sessionId, settings) {
    console.log('⚙️ updateQuizSettings() called:', settings);
    send('updateQuizSettings', { sessionId, settings })
  }

  function sendPulse(sessionId) {
    console.log('📡 sendPulse() called');
    send('pulse', { sessionId })
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
    sendModeChange,
    sendRoomLifetimeChange,
    sendTafelStroke,
    sendTafelDrawing,
    sendTafelErase,
    sendTafelClear,
    sendTafelClearMine,
    sendUserColorChange,
    sendSetDrawPermission,
    sendSetDrawPermissionAll,
    sendSetHostView,
    sendSetHostViewAll,
    sendPlayerMove,
    sendPlayerJump,
    sendPlayerCustomize,
    sendChatMessage,
    sendSetChatPermission,
    sendSetChatPermissionAll,
    sendSetChatMode,
    sendRaiseHand,
    sendLowerHand,
    sendCallOnStudent,
    sendLowerAllHands,
    startQuizMission,
    submitQuizAnswer,
    endQuizMission,
    updateQuizSettings,
    sendPulse,
    disconnect,
    on
  }
}

function generateSessionId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
