# Claude Project Context

This file helps Claude (AI assistant) stay up-to-date with the Multitrail project.

## Project Identity

- **Name**: Multitrail
- **Version**: 1.0.0
- **Type**: Real-time multiplayer collaborative drawing app
- **Status**: Production ready

## Quick Reference

### Key Files

| File | Purpose |
|------|---------|
| `src/App.svelte` | Main orchestrator, state machine, WebSocket lifecycle |
| `src/lib/Canvas.svelte` | Drawing surface, mouse/touch/keyboard handling |
| `src/lib/canvasRenderer.js` | All drawing/rendering logic |
| `src/lib/websocket.js` | WebSocket client, Svelte store |
| `src/lib/trailManager.js` | Local user's trail state |
| `src/lib/remoteTrailsManager.js` | Remote users' trail state |
| `src/lib/remoteCursors.js` | Remote cursor positions |

### App States

```
TESTING → NAMED → ROOM_SELECT → IN_ROOM
```

### Backend URLs

- Production: `wss://funkhaus-websocket.onrender.com`
- Development: `ws://localhost:3001`
- Backend repo: Separate "funkhaus-backend" repository on Render

### Commands

```bash
npm run dev      # Start dev server (localhost:5173)
npm run build    # Production build
npm run preview  # Preview production build
```

## Architecture Notes

### Data Flow

1. User draws → `Canvas.svelte` captures input
2. Points buffered (max 10 or 32ms)
3. `websocket.sendPoints()` → Backend
4. Backend broadcasts to room
5. Other clients receive via `remoteDrawPoints` event
6. `remoteTrailsManager` stores points
7. Animation loop renders all trails

### Trail Lifecycle

- Local trails: User-configurable (1-30s, default 10s)
- Remote trails: Fixed 10 seconds
- Points have timestamps, expired points cleaned each frame

### Color Assignment

12-color palette, assigned by index when user joins room.

### Mobile Support

- Touch events separate from mouse events
- Fullscreen on room join
- Responsive breakpoints at 600px

## Common Tasks

### Adding a new drawing feature
1. Add UI in `Settings.svelte`
2. Update settings state in `App.svelte`
3. Pass to `Canvas.svelte` as prop
4. Implement rendering in `canvasRenderer.js`
5. If multiplayer-relevant, broadcast via `websocket.sendSettings()`

### Debugging multiplayer
- Console logs use emoji prefixes for filtering
- `TestScreen.svelte` validates backend connectivity
- Check `remoteTrailsManager` for user state

### Modifying trail behavior
- Local: `trailManager.js`
- Remote: `remoteTrailsManager.js`
- Rendering: `canvasRenderer.js` → `drawTrail()`

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 1.0.0 | 2026-01 | Initial stable release |

## Known Behaviors

- Render backend has cold-start delay (~90s if idle)
- Remote trails fixed at 10s regardless of local setting
- Host role is informational only (no special permissions yet)
