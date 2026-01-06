# Multiplayer Room System

This document describes the new 2-player multiplayer room system implemented using Socket.IO.

## Overview

The multiplayer system allows players to:
1. Create a room and get a unique 6-character room code
2. Join a friend's room using the room code
3. Share an invite link that automatically opens the join modal
4. Start a 2-player game when both players are ready

## Features

### Room Creation
- Click "Create Room" button
- Server generates unique 6-character room code (A-Z, 0-9, excluding O/0/I/1)
- Player automatically becomes the host
- Room code and invite link are displayed

### Room Joining
- Click "Join Room" button or use invite link
- Enter 6-character room code
- Automatically join the room if it exists and has space
- Real-time updates when players join/leave

### Invite System
- Copyable room code
- Shareable invite link with format: `/multiplayer?room=CODE`
- Clicking invite link automatically opens join modal with code pre-filled

### Game Management
- Host can start game when 2 players are present
- Automatic host reassignment if original host leaves
- Room cleanup when empty

## Technical Implementation

### Frontend (React)
- **Multiplayer.js**: Main component handling room creation/joining
- **SocketContext.js**: Socket.IO connection and event management
- Real-time updates using Socket.IO events

### Backend (Node.js + Socket.IO)
- **roomSocket.js**: Handles room-specific socket events
- **gameSocket.js**: Main socket handler (includes room functionality)
- In-memory room storage (no database required)
- JWT authentication for socket connections

### Socket Events

#### Client → Server
- `createRoom`: Create new room
- `joinRoom`: Join existing room
- `leaveRoom`: Leave current room
- `startGame`: Start game (host only)

#### Server → Client
- `roomCreated`: Room successfully created
- `roomJoined`: Successfully joined room
- `playerJoined`: Another player joined
- `playerLeft`: Player left room
- `gameStarted`: Game is starting
- `error`: Error message

## Usage Flow

### Player A (Host)
1. Navigate to `/multiplayer`
2. Click "Create Room"
3. Get room code (e.g., "ABC123")
4. Share code or invite link with Player B

### Player B (Guest)
1. Receive room code or invite link
2. Navigate to `/multiplayer` (or click link)
3. Click "Join Room" (or modal opens automatically)
4. Enter room code
5. Join room successfully

### Starting Game
1. Both players must be in room
2. Host clicks "Start Game"
3. All players redirected to game page

## Environment Variables

```env
# Frontend
REACT_APP_SOCKET_URL=http://localhost:5000

# Backend
JWT_SECRET=your-secret-key
```

## Security Features

- JWT authentication required for socket connections
- Room codes are unique and randomly generated
- Players can only join rooms they have codes for
- Host privileges for game management

## Limitations

- Rooms are stored in memory (lost on server restart)
- Maximum 2 players per room
- No persistent room history
- No spectator mode

## Future Enhancements

- Database persistence for rooms
- Support for more than 2 players
- Room settings and customization
- Spectator mode
- Room discovery and public rooms
- Chat functionality
- Room moderation tools
