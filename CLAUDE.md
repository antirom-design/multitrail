# Claude Project Context

This file helps Claude (AI assistant) stay up-to-date with the Multitrail project.

## Project Identity

- **Name**: Multitrail
- **Version**: 1.2.0
- **Type**: Real-time multiplayer classroom tool (drawing + quiz + avatar)
- **Status**: Production, actively iterating

## Quick Reference

### Key Files

| File | Purpose |
|------|---------|
| `src/App.svelte` | Main orchestrator, state machine, WebSocket lifecycle, mode routing |
| `src/lib/Canvas.svelte` | Drawing surface, mouse/touch/keyboard handling |
| `src/lib/canvasRenderer.js` | All drawing/rendering logic |
| `src/lib/websocket.js` | WebSocket client, Svelte store, accepts sessionId for reload persistence |
| `src/lib/trailManager.js` | Local user's trail state |
| `src/lib/remoteTrailsManager.js` | Remote users' trail state |
| `src/lib/remoteCursors.js` | Remote cursor positions |
| `src/lib/AvatarView.svelte` | Avatar mode: shared arena for host + students, 8-bit pixel characters |
| `src/lib/IdleCharacter.svelte` | Reusable 8-bit pixel character component (CSS art, walking animation) |
| `src/lib/QuizView.svelte` | Quiz mode interface |
| `src/lib/TopBar.svelte` | Room code, share, mode menu (host), settings, leave |
| `src/lib/TafelToolbar.svelte` | Drawing tools for trail/tafel modes |

### Room Modes

The host switches modes via TopBar menu. Mode is broadcast to all clients via WebSocket.

| Mode | Value | Description |
|------|-------|-------------|
| Avatar | `'avatar'` | Interactive 8-bit character arena (default/home screen) |
| Tafel | `'tafel'` | Persistent whiteboard drawing |
| Multitrail | `'trail'` | Collaborative drawing with fading trails |
| Quiz Mission | `'quiz'` | Host-controlled quiz game |

### App States

```
TESTING → NAMED → ROOM_SELECT → IN_ROOM
```

### Deployment

| Target | URL | Method |
|--------|-----|--------|
| Frontend (Vercel) | tools4school on Vercel | `vercel --prod` |
| Backend (Render) | `wss://funkhaus-websocket.onrender.com` | Auto-deploy on push to main |
| Backend repo | `/Users/antirom/workspace_vibe/funkhaus` | Separate repo, same workspace |
| Sibling project | `/Users/antirom/workspace_vibe/classcore` | ClassCore (source of avatar feature) |

### Commands

```bash
npm run dev      # Start dev server (localhost:5173)
npm run build    # Production build
npm run preview  # Preview production build
vercel --prod    # Deploy frontend to Vercel
```

## Architecture Notes

### Mode System

- `roomMode` variable in App.svelte: `'trail'` | `'tafel'` | `'quiz'` | `'avatar'`
- Host changes mode via TopBar → `handleModeChange()` → `websocket.sendModeChange()`
- Backend broadcasts `modeChange` to all clients (including sender)
- Clients receive via window event → `handleRemoteModeChange()` updates `roomMode`
- Mode persisted in sessionStorage for reload recovery

### Avatar Mode Details

- Ported from ClassCore sibling project (same codebase base)
- **Both host and students see the same arena** with identical characters
- Characters colored by index in the server's user list (consistent across all clients)
- Students get left/right arrow controls below the arena
- Host gets QR code + room code beside the arena
- Own character highlighted with blue glow + blue name tag
- Movement broadcast via `websocket.sendPlayerMove(position, direction)`
- Backend relays `playerMove` to all other clients in room
- Svelte reactivity: `allPositions` reactive map merges local + remote positions; `playerPositions` must be reassigned as new object (spread) to trigger updates

### Session Persistence (Reload Resistance)

Stored in **sessionStorage** (survives reload, not new tab):
- `multitrail_session_id` — WebSocket identity, passed to `createWebSocket(sessionId)`
- `multitrail_app_state` — current app state
- `multitrail_room_code` — active room
- `multitrail_room_mode` — current mode
- `multitrail_color` — user's color

Stored in **localStorage** (survives everything):
- `multitrail_last_name` — display name

On reload: App.svelte restores all values → sets `appState = IN_ROOM` → websocket reconnects with **same sessionId** → server recognizes returning user, preserves room + housemaster status.

**Critical**: `createWebSocket(sessionId)` must receive the stored sessionId. Without it, the server sees a new user on every reload.

### Data Flow (Drawing)

1. User draws → `Canvas.svelte` captures input
2. Points buffered (max 10 or 32ms)
3. `websocket.sendPoints()` → Backend
4. Backend broadcasts to room
5. Other clients receive via `remoteDrawPoints` event
6. `remoteTrailsManager` stores points
7. Animation loop renders all trails

### WebSocket Message Types

| Client sends | Backend relays as | Purpose |
|---|---|---|
| `drawPoints` | `remoteDrawPoints` | Trail/tafel drawing points |
| `cursorMove` | `remoteCursor` | Cursor position |
| `modeChange` | `modeChange` | Room mode switch (to all) |
| `playerMove` | `playerMove` | Avatar position + direction |
| `tafelStroke` | `tafelStroke` | Completed tafel stroke |
| `tafelClear` | `tafelClear` | Clear all tafel strokes |
| `setDrawPermission` | `rooms` (updated list) | Host toggles draw permission for user(s) |

### Color Assignment

12-color palette, assigned by index in the server's user list. Same order for all clients.

### Mobile Support

- Touch events separate from mouse events
- Fullscreen on room join
- Responsive breakpoints at 600px

## Common Tasks

### Adding a new mode
1. Add mode string to `roomMode` options in App.svelte
2. Create `YourModeView.svelte` component
3. Add `{:else if roomMode === 'yourmode'}` block in App.svelte's IN_ROOM section
4. Add button to TopBar.svelte's mode menu with icon + active color
5. Add any new WebSocket message types to both `websocket.js` and backend `server/index.js`

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
- Backend repo at `../funkhaus/server/index.js` — message handler is a big switch statement

### Svelte Reactivity Gotchas
- Object mutation (`obj[key] = val; obj = obj`) does NOT reliably trigger reactive updates
- Always reassign as new object: `obj = { ...obj, [key]: val }`
- Function calls in templates don't track dependencies — use reactive `$:` statements or reference reactive variables directly in `{#each}` blocks

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 1.0.0 | 2026-01 | Initial stable release |
| 1.1.0 | 2026-02 | Avatar mode, reload persistence, session identity fix |
| 1.2.0 | 2026-02 | Avatar as default mode, host draw permission controls |

## Known Behaviors

- Render backend has cold-start delay (~90s if idle)
- Remote trails fixed at 10s regardless of local setting
- Host role controls mode switching; students follow
- Avatar positions are ephemeral (not persisted on server or sessionStorage)
- `IdleCharacter.svelte` exists but is not currently used (avatar controls are inline in AvatarView)

### Draw Permission System

- Host can lock/unlock drawing per-user or all-at-once via UserList overlay
- User data shape: `{ id, name, isHousemaster, canDraw }` (canDraw defaults to true)
- Enforced both client-side (Canvas ignores input) and server-side (backend rejects drawPoints)
- Permissions persist across mode changes (not reset on modeChange)
- Host (housemaster) always has canDraw=true
- `setDrawPermission` message: `{ targetSessionId, canDraw }` or `{ all: true, canDraw }`
- Server broadcasts updated rooms list after permission change

## Current Status / Open Items

- Avatar mode is functional but beta — needs real-world testing with multiple clients
- Reload persistence was just implemented — needs verification that sessionId reuse works correctly with the backend (server should recognize returning user, not create duplicate)
- Avatar customization ("tune your avatar" as reward) is the intended next step but not yet built
- No backend persistence of avatar positions — if all clients leave, positions reset
