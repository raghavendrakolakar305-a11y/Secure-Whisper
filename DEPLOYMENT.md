# Deployment Guide for Secure Whisper

This guide covers deploying the frontend to Vercel and the persistent API/WebSocket backend to Render.

## Project Structure

- **Frontend**: React + Vite application in the root directory
- **Backend**: Express + MongoDB server in the `server/` directory

## Prerequisites

- A MongoDB Atlas cluster and connection string
- GitHub repository access
- Vercel and Render accounts

## 1. Deploy the backend to Render

1. In Render, choose **New → Blueprint** and select this GitHub repository.
2. Render reads `render.yaml` and creates the `securechat-backend` web service.
3. Set `MONGODB_URI` to the MongoDB Atlas connection string in the service's environment settings. Ensure Atlas allows connections from Render.
4. Keep the generated `JWT_SECRET` and `ENCRYPTION_KEY` values private.
5. Wait for the service to become live and verify `https://<backend-host>/api/health` returns `{"ok":true}`.

Render's Blueprint does not provision MongoDB. Use MongoDB Atlas or another MongoDB-compatible managed service.

## 2. Deploy the frontend to Vercel

1. In Vercel, import this GitHub repository. Keep the project root as the root directory.
2. Use the Vite framework preset, build command `npm run build`, and output directory `dist` (also configured in `vercel.json`).
3. Add the environment variable `VITE_API_URL` with the full HTTPS URL of the Render backend, for example `https://securechat-backend.onrender.com`.
4. Deploy or redeploy after setting the variable. The frontend derives the secure WebSocket URL from this API URL.

## 3. Post-deployment checks

- Backend health check returns `{"ok":true}`.
- Frontend routes such as `/chat` load directly or after refresh.
- Registration and login work.
- WebSocket connections work and messages send/receive in real time.

## Troubleshooting

### CORS Errors
- Ensure backend CORS allows frontend origin
- Check environment variables are set correctly

### WebSocket Connection Failed
- Verify WebSocket URL uses `wss://` (not `ws://`) in production
- Check firewall/network settings
- Ensure Render service supports WebSockets

### MongoDB Connection Issues
- Verify MONGODB_URI environment variable
- Check database access permissions
- Ensure IP whitelist is configured if needed

### Environment Variables Not Loading
- For Vite: Variables must start with `VITE_`
- Restart services after changing environment variables
- Verify in deployment platform dashboard

## Local Development

1. Install dependencies:
   ```bash
   npm install
   cd server && npm install
   ```

2. Start MongoDB locally (or use cloud)

3. Run backend:
   ```bash
   cd server
   npm start
   ```

4. Run frontend:
   ```bash
   npm run dev
   ```

5. Access:
   - Frontend: http://localhost:8080
   - Backend: http://localhost:4000

## Security Notes

- **Never commit** `.env` files (already in .gitignore)
- Use strong, randomly generated secrets for production
- JWT_SECRET should be at least 32 characters
- ENCRYPTION_KEY must be exactly 32 bytes for AES-256
- Use HTTPS in production (automatically handled by Render)

## Support

For issues or questions:
1. Check Render service logs
2. Check browser console for frontend errors
3. Verify environment variables are set
4. Ensure MongoDB is accessible from backend service

