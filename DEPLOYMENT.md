# STChat - Deployment Guide

A production-ready, end-to-end encrypted chat application.

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Deploy Backend to Render.io](#deploy-backend-to-renderio)
4. [Deploy Frontend to Netlify](#deploy-frontend-to-netlify)
5. [Set Up Uptime Monitoring](#set-up-uptime-monitoring)
6. [Environment Variables Reference](#environment-variables-reference)
7. [E2EE Security](#e2ee-security)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────┐         WebSocket (WSS)         ┌─────────────────┐
│                 │ ─────────────────────────────▶  │                 │
│  React Client   │                                 │  Node.js Server │
│  (Netlify)      │ ◀─────────────────────────────  │  (Render.io)    │
│                 │                                 │                 │
└─────────────────┘                                 └─────────────────┘
```

---

## Prerequisites

- **Git** repository with your code
- **Render.io** account (free tier available)
- **Netlify** account (free tier available)
- **UptimeRobot** account (free, for keeping server awake)

---

## Deploy Backend to Render.io

### Step 1: Push Code to GitHub/GitLab

Ensure your `server` folder is in a Git repository.

### Step 2: Create New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **Web Service**
3. Connect your GitHub/GitLab repository
4. Configure:
   - **Name**: `stchat-server`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Instance Type**: Free

### Step 3: Add Environment Variables

In Render dashboard → Environment:
```
HOST = 0.0.0.0
ALLOWED_ORIGINS = https://YOUR-NETLIFY-APP.netlify.app
```

### Step 4: Deploy

Click **Create Web Service**. Wait for deployment to complete.

Your server URL will be: `https://stchat-server.onrender.com`

> ⚠️ **Note**: Free tier services sleep after 15 minutes of inactivity. See [Uptime Monitoring](#set-up-uptime-monitoring) to prevent this.

---

## Deploy Frontend to Netlify

### Step 1: Create Environment File

Create `.env` in the `client` folder:
```env
VITE_WS_URL=wss://YOUR-RENDER-APP.onrender.com
```

Replace with your actual Render.io URL.

### Step 2: Build the Frontend

```bash
cd client
npm install
npm run build
```

### Step 3: Deploy to Netlify

**Option A: Netlify CLI**
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=dist
```

**Option B: Netlify Dashboard**
1. Go to [Netlify](https://app.netlify.com)
2. Drag and drop the `client/dist` folder
3. Or connect your Git repository for auto-deploys

### Step 4: Configure Environment Variables in Netlify

1. Go to **Site settings** → **Environment variables**
2. Add: `VITE_WS_URL` = `wss://YOUR-RENDER-APP.onrender.com`
3. Trigger a redeploy

---

## Set Up Uptime Monitoring

Render's free tier sleeps after 15 minutes. Use UptimeRobot to keep it awake.

### Step 1: Create UptimeRobot Account

1. Go to [UptimeRobot](https://uptimerobot.com)
2. Sign up for free

### Step 2: Add Monitor

1. Click **Add New Monitor**
2. Configure:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: STChat Server
   - **URL**: `https://YOUR-RENDER-APP.onrender.com/health`
   - **Monitoring Interval**: 5 minutes

3. Click **Create Monitor**

This will ping your server every 5 minutes, preventing it from sleeping.

---

## Environment Variables Reference

### Client (Netlify)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_WS_URL` | WebSocket URL to backend | `wss://stchat-server.onrender.com` |

### Server (Render.io)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | Auto-set by Render |
| `HOST` | Bind address | `0.0.0.0` |
| `ALLOWED_ORIGINS` | CORS origins | Your Netlify URL |

---

## E2EE Security

STChat uses **AES-256-GCM** End-to-End Encryption:

- ✅ Messages encrypted in browser before sending
- ✅ Server only sees encrypted ciphertext
- ✅ Unique IV for each message
- ✅ Works automatically on HTTPS (Render + Netlify)

> **Note**: E2EE requires HTTPS. It won't work on local network HTTP connections.

---

## Troubleshooting

### "WebSocket connection failed"

1. Check CORS: Add your Netlify URL to `ALLOWED_ORIGINS`
2. Check URL: Ensure `VITE_WS_URL` uses `wss://` (not `ws://`)
3. Check deployment: Verify Render shows "Live"

### Server sleeping / first load slow

1. Set up UptimeRobot as described above
2. The loading screen includes a Snake game for users to play while waiting

### Build fails on Netlify

1. Ensure `VITE_WS_URL` is set in environment variables
2. The variable must start with `VITE_` to be exposed to Vite

### E2EE not working

- E2EE only works over HTTPS (production)
- Check browser console for "Room key" messages

---

## 🎉 Deployment Complete!

Your STChat is now live with:
- ✅ End-to-End Encryption
- ✅ Auto-reconnection
- ✅ Uptime monitoring
- ✅ Loading screen game
