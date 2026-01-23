# Multitrail v1.0.0

A real-time multiplayer collaborative drawing application where users create and share ephemeral visual trails together.

## Features

- **Collaborative Canvas** - Draw together in real-time with multiple users
- **Ephemeral Trails** - Drawings fade away after a configurable time (1-30 seconds)
- **Room-Based Sessions** - Create or join rooms with 6-character codes
- **Live Cursors** - See other users' cursor positions with their names
- **Speed-Based Drawing** - Optional stroke width that varies with drawing speed
- **Text Input** - Type directly on the canvas
- **QR Code Sharing** - Easy mobile room sharing
- **Mobile Optimized** - Full touch support with fullscreen mode

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Svelte 4, Vite 5 |
| Drawing | HTML Canvas API |
| Realtime | WebSocket |
| Backend | Funkhaus WebSocket Server (external) |
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
├── App.svelte              # Main app, state machine
├── main.js                 # Entry point
├── app.css                 # Global styles
└── lib/
    ├── Canvas.svelte       # Drawing surface, input handling
    ├── canvasRenderer.js   # Rendering engine
    ├── trailManager.js     # Local trail state
    ├── remoteTrailsManager.js  # Remote users' trails
    ├── remoteCursors.js    # Remote cursor tracking
    ├── websocket.js        # WebSocket client (Svelte store)
    ├── Settings.svelte     # Configuration panel
    ├── RoomJoin.svelte     # Room selection UI
    ├── RoomInfo.svelte     # Share & QR code
    ├── UserList.svelte     # Online users list
    ├── OnlineIndicator.svelte  # User count badge
    ├── NameInput.svelte    # Name entry screen
    └── TestScreen.svelte   # System diagnostics
```

## Application States

1. **TESTING** - System health check (backend connectivity)
2. **NAMED** - User enters display name
3. **ROOM_SELECT** - Create or join a room
4. **IN_ROOM** - Active drawing session

## Configuration

Drawing settings (configurable in-app):

| Setting | Default | Range |
|---------|---------|-------|
| Trail Lifetime | 10s | 1-30s |
| Stroke Width | 3px | 1-40px |
| Draw Style | line | line, dots |
| Speed-Based Width | off | on/off |
| Text Size | 24px | 8-72px |

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
- Drawing point synchronization

## WebSocket Protocol

### Client Messages

| Type | Purpose |
|------|---------|
| `join` | Join a room |
| `drawPoints` | Send drawing points batch |
| `cursorMove` | Send cursor position |
| `settingsUpdate` | Broadcast user settings |
| `strokeStart/End` | Signal stroke boundaries |

### Server Messages

| Type | Purpose |
|------|---------|
| `joined` | Confirm room join, host status |
| `rooms` | Current user list |
| `remoteDrawPoints` | Other users' drawing points |
| `remoteCursor` | Other users' cursor positions |
| `remoteSettings` | Other users' settings |

## License

Private project.
