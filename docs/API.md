# Secure Whisper API Reference

Protected endpoints require Authorization: Bearer <JWT>.

## Authentication

- POST /api/register — create a user and return a JWT.
- POST /api/login — authenticate by username/email and return a JWT.

## Profile and users

- GET /api/user/profile — current user profile.
- PUT /api/user/profile — update profile/settings.
- PUT /api/user/password — change password.
- GET /api/users/profile/:id — public user profile.
- GET /api/users/search — search users.

## Friends

- GET /api/friends — relationship/friend data.
- POST /api/friends/request — send a friend request.
- POST /api/friends/add — supported add-friend flow.
- POST /api/friends/respond — accept or reject a request.
- DELETE /api/friends/:id — remove a relationship.

## Messages

- POST /api/messages — create/send a text message or file attachment. File requests use `{ chatId, type: "file", fileName, content }`, where `content` is a base64 data URL; files are limited to 20 MB and encrypted before storage.
- GET /api/messages — retrieve messages.
- POST /api/messages/seen — mark messages as seen.
- DELETE /api/messages/clear — clear messages.
- POST /api/messages/:id/react — add/remove a reaction.

## Health

- GET /api/health — backend health check.

## WebSocket

The frontend derives the WebSocket endpoint from VITE_API_URL. http becomes ws and https becomes wss. The WebSocket server manages authenticated connections, chat subscriptions, message delivery, presence, and seen-state events.

The exact event payloads are implementation details in server/index.js and should remain synchronized with the frontend when the protocol changes.
