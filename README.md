# Secure Whisper

Secure Whisper is a full-stack real-time messaging application built with React, TypeScript, Node.js, Express, MongoDB, JWT authentication, WebSockets, and AES-256-GCM encrypted message storage.

> Security note: the current implementation performs message encryption and decryption on the backend using an environment-held key. It therefore provides encrypted message storage, but it is **not true end-to-end encryption (E2EE)** because the server can decrypt message content.

## Highlights

- User registration and login
- JWT-based authenticated API requests
- bcrypt password hashing
- Real-time messaging with WebSockets
- Online presence and chat subscriptions
- Friend search, requests, acceptance/rejection, and removal
- AES-256-GCM encrypted message payloads at rest
- Message reactions and replies
- Read/seen state
- Optional file metadata for message attachments
- Profile, notification, and read-receipt settings
- Responsive React UI
- Tailwind CSS, Radix UI, and shadcn/ui-style components
- MongoDB persistence through Mongoose
- Render deployment configuration
- CI, dependency update automation, and release packaging workflow

## Architecture

Frontend: React + TypeScript + Vite

        HTTP / WebSocket
              |
              v
Backend: Node.js + Express + ws
              |
       JWT / bcrypt / AES-256-GCM
              |
              v
Database: MongoDB + Mongoose

The frontend derives its REST and WebSocket base URLs from VITE_API_URL. In development it defaults to http://localhost:4000.

## Technology Stack

### Frontend

- React 18
- TypeScript
- Vite
- React Router
- TanStack Query
- Tailwind CSS
- Radix UI
- shadcn/ui patterns
- React Hook Form
- Zod
- Lucide React

### Backend

- Node.js
- Express
- MongoDB
- Mongoose
- JSON Web Tokens
- bcryptjs
- ws WebSocket server
- dotenv
- CORS

## Project Structure

- src/ — React application
- src/pages/ — authentication, onboarding, chat, settings, and other pages
- src/components/ — reusable UI components
- src/hooks/ — React hooks
- src/lib/ — API and utility modules
- server/ — Express and WebSocket backend
- server/models/ — User, Friend, and Message MongoDB models
- server/index.js — backend entry point and API/WebSocket implementation
- server/db.js — database utilities
- server/generate-keys.js — key-generation utility
- render.yaml — deployment configuration
- DEPLOYMENT.md — deployment guide
- docs/ — architecture, API, and release documentation
- .github/workflows/ — CI and release automation

## Local Development

### Requirements

- Node.js 20+
- npm
- MongoDB local instance or MongoDB-compatible hosted database

### Frontend

From the repository root:

    npm install
    npm run dev

Vite normally starts the development server on its configured local port.

### Backend

In a second terminal:

    cd server
    npm install
    npm start

The backend defaults to port 4000.

### Environment variables

Create server/.env from server/.env.example and provide:

    PORT=4000
    JWT_SECRET=replace_with_a_strong_secret
    ENCRYPTION_KEY=replace_with_a_32_byte_key
    MONGODB_URI=mongodb://127.0.0.1:27017/securewhisper

Never commit server/.env or real production secrets.

## API

The backend exposes REST endpoints under /api, including authentication, profile, user search, friend management, message operations, reactions, and health checks.

See docs/API.md for the endpoint inventory.

## Real-Time Messaging

The application uses WebSockets for real-time communication. The backend tracks connected sockets, online users, and chat subscriptions so messages and presence-related events can be delivered to connected clients.

For production HTTPS deployments, the frontend converts the API URL from https:// to wss:// for WebSocket connections.

## Encryption and Security Model

Messages are encrypted with AES-256-GCM using a 32-byte server-side key. Each encrypted message stores an encrypted payload and initialization vector. Authentication uses JWTs, and passwords are hashed with bcrypt.

This architecture does not qualify as true E2EE because the backend has the encryption key and performs decryption.

### Future E2EE roadmap

- Client-side encryption/decryption
- Public-key key exchange
- Per-conversation encryption keys
- Secure key rotation and recovery
- Attachment encryption before upload
- Stronger production security controls and auditing

## Deployment

The repository includes render.yaml and DEPLOYMENT.md for Render-based deployment. Configure the frontend with VITE_API_URL and the backend with JWT_SECRET, ENCRYPTION_KEY, PORT, and MONGODB_URI.

## Quality and Automation

CI is configured under .github/workflows/ci.yml. It installs dependencies, runs the frontend linter, builds the frontend, and installs backend dependencies.

Dependabot configuration is included under .github/dependabot.yml for monthly npm dependency update checks.

## Releases and Packages

Release automation is provided by .github/workflows/release.yml. A semantic version tag such as v1.0.0 triggers a GitHub Release containing:

- secure-whisper-source-<tag>.zip — source/configuration package without secrets, dependencies, or local database files
- secure-whisper-frontend-<tag>.zip — production frontend build

See docs/RELEASES.md for the release process.

## Documentation

- DEPLOYMENT.md — deployment and troubleshooting
- docs/API.md — REST and WebSocket API inventory
- docs/ARCHITECTURE.md — architecture and security boundary
- docs/RELEASES.md — release and package process
- SECURITY.md — security policy and responsible disclosure
- CONTRIBUTING.md — contribution workflow
- CHANGELOG.md — project history

## Important Repository Hygiene

The repository intentionally excludes local environment files, database files, node_modules, build output, and other generated/private data. Do not upload credentials or production secrets.

## License

MIT License. See LICENSE.
