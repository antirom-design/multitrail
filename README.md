# Tools4School (t4s)

A collaborative learning platform with three integrated modes: **Multitrail**, **Tafel**, and **Quiz Mission**.

## Features

### 🎨 Three Collaborative Modes

1. **Multitrail Mode** - Ephemeral drawing with fading trails (1-30 seconds)
2. **Tafel Mode** - Persistent whiteboard for collaborative drawing
3. **Quiz Mode** - Interactive quiz game with asteroid defense theme

### 🌐 Multiplayer Features

- **Room-Based Sessions** - Create or join rooms with 6-character codes
- **Live Cursors** - See other users' cursor positions with their names
- **User Management** - Persistent names and session IDs across mode switches
- **QR Code Sharing** - Easy mobile room sharing
- **Mobile Optimized** - Full touch support with fullscreen mode

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Svelte 4, Vite 5 |
| Drawing | HTML Canvas API |
| Realtime | WebSocket |
| Backend | Funkhaus WebSocket Server (shared) |
| Deployment | Vercel (frontend), Render (backend) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173`. Uses local WebSocket backend at `ws://localhost:3001`.

### Production Build

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── App.svelte              # Main app, state machine, mode switching
├── main.js                 # Entry point
├── app.css                 # Global styles
└── lib/
    ├── Canvas.svelte       # Drawing surface (Trail/Tafel modes)
    ├── QuizView.svelte     # Quiz mode (host + student views)
    ├── TopBar.svelte       # Mode switcher, settings, room controls
    ├── TafelToolbar.svelte # Drawing tools (pen, brush, eraser)
    ├── websocket.js        # WebSocket client (unified for all modes)
    ├── canvasRenderer.js   # Rendering engine
    ├── trailManager.js     # Trail mode state
    ├── tafelManager.js     # Tafel mode state
    ├── RoomJoin.svelte     # Room selection UI
    ├── UserList.svelte     # Online users list
    └── ...
```

## Application States

1. **TESTING** - System health check (backend connectivity)
2. **NAMED** - User enters display name
3. **ROOM_SELECT** - Create or join a room
4. **IN_ROOM** - Active session with mode switching

## Modes

### Multitrail Mode

- Ephemeral drawing with configurable fade time
- Speed-based stroke width (optional)
- Line or dot drawing styles
- Real-time cursor tracking

### Tafel Mode

- Persistent whiteboard
- Pen, brush, and eraser tools
- Clear all or clear my drawings
- Synchronized across all users

### Quiz Mode

**Host View:**
- Start quiz missions with custom questions
- Asteroid defense visualization
- Real-time leaderboard
- Strike tracking

**Student View:**
- Answer quiz questions
- Earn credits and build streaks
- Send signals to host
- Progress tracking

## Backend

The backend is a separate service: **Funkhaus WebSocket Server**

| Environment | URL |
|-------------|-----|
| Production | `wss://funkhaus-websocket.onrender.com` |
| Development | `ws://localhost:3001` |

Backend handles:
- Room management (create/join with 6-char codes)
- Real-time message broadcasting
- User presence tracking
- Mode synchronization
- Quiz state management

## Mode Switching

Only the **Housemaster** (room creator) can switch modes:

1. Click the mode button in the top-right corner
2. Modes cycle: **Trail → Tafel → Quiz → Trail**
3. Confirm the mode change
4. All users in the room switch to the new mode automatically

## Configuration

Drawing settings (configurable in-app):

| Setting | Default | Range |
|---------|---------|-------|
| Trail Lifetime | 7.5s | 1-30s |
| Stroke Width | 4px | 1-20px |
| Draw Style | line | line, dots |
| Speed-Based Width | off | on/off |

## License

Private project.
