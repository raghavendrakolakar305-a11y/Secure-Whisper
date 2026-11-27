# Contributing to Secure Whisper

Thank you for contributing.

## Development setup

1. Install Node.js 20 or newer.
2. Run npm install in the project root.
3. Run npm install inside server/.
4. Create server/.env from server/.env.example.
5. Start MongoDB.
6. Start the backend with cd server && npm start.
7. Start the frontend with npm run dev.

## Pull requests

- Keep changes focused and reviewable.
- Never commit .env files, database files, node_modules, or build output.
- Run npm run lint and npm run build before opening a pull request.
- Update documentation when configuration or behavior changes.
- Explain security-sensitive changes clearly.

## Commit style

Prefer concise messages such as feat: add message reactions, fix: websocket reconnect, docs: improve deployment guide, or chore: update dependencies.
