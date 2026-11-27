# Secure Whisper Architecture

## High-level flow

React + TypeScript + Vite communicates with the Node.js/Express backend over HTTP and WebSockets. The backend handles authentication, persistence, encryption/decryption, and real-time delivery. MongoDB stores users, friendships, and messages.

## Frontend

The frontend contains authentication, onboarding, chat, settings, and reusable UI components. src/lib/api.ts derives the API URL from VITE_API_URL and converts http/https to ws/wss for WebSocket communication.

## Backend

server/index.js creates the Express application, connects to MongoDB through Mongoose, exposes REST endpoints, and starts a WebSocket server. Authentication uses JWT bearer tokens. Passwords are hashed with bcryptjs.

## Data model

User stores username, optional email, password hash, display name, bio, avatar, notification settings, read-receipt settings, timestamps, and last-seen state.

Friend stores requester, recipient, relationship status, compatibility fields, and timestamps.

Message stores chatId, sender, encrypted content, IV, message type, optional file metadata, reply information, reactions, read state, and timestamps.

## Message flow

1. A user creates a message in the frontend.
2. The authenticated request/WebSocket event reaches the backend.
3. The backend encrypts message text with AES-256-GCM.
4. The encrypted payload and IV are persisted in MongoDB.
5. The backend decrypts stored content when returning message data.
6. WebSocket events synchronize connected clients in real time.

## WebSocket state

The backend maintains mappings for online users, socket-to-user associations, and chat subscriptions. This supports user-directed delivery, chat broadcasts, presence, and seen-state updates.

## Security boundary

The current system is server-side encrypted messaging, not true E2EE. The backend owns the encryption key and can decrypt message content. A genuine E2EE architecture should move cryptographic operations to clients and use authenticated key exchange so the server cannot read plaintext.
