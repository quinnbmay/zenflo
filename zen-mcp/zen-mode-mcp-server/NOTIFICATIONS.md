# Zen Mode Notification Service

Background daemon that sends Telegram notifications when tasks are created or updated.

## Quick Start

### 1. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

Required variables:
- `HAPPY_AUTH_TOKEN` - Your Happy auth token
- `HAPPY_SECRET_KEY` - Your Happy secret key
- `TELEGRAM_BOT_TOKEN` - ZenFlo bot token (8137149580:AAEHbDqQt98w3JRd_Tf5fJoGTnrADmwL1QA)
- `TELEGRAM_CHAT_ID` - Your Telegram chat ID

### 2. Get Your Telegram Chat ID

1. Open Telegram and message [@ZenFlo_bot](https://t.me/ZenFlo_bot)
2. Send any message (like "hello")
3. Visit this URL in your browser:
   ```
   https://api.telegram.org/bot8137149580:AAEHbDqQt98w3JRd_Tf5fJoGTnrADmwL1QA/getUpdates
   ```
4. Look for `"chat":{"id":12345678,...}` and copy the ID number
5. Add it to your `.env` file as `TELEGRAM_CHAT_ID`

### 3. Build and Start

```bash
# Build the service
npm run build

# Start as background daemon
npm run notifications:start
```

## Managing the Service

### Start/Stop/Restart
```bash
npm run notifications:start    # Start the daemon
npm run notifications:stop     # Stop the daemon
npm run notifications:restart  # Restart the daemon
```

### View Logs
```bash
npm run notifications:logs     # Stream live logs
pm2 logs zen-notifications     # Alternative
```

### Check Status
```bash
npm run notifications:status   # Check if running
pm2 list                       # Show all PM2 processes
```

### Delete Service
```bash
npm run notifications:delete   # Remove from PM2
```

## What It Does

The notification service:
1. Connects to Happy backend via WebSocket
2. Listens for task changes in real-time
3. Sends Telegram notifications with:
   - Task title, status, priority
   - Linked sessions (if any)
   - Inline action buttons:
     - 🎯 **Work on This** - Opens task workflow
     - 📱 **Open in Happy** - Deep link to mobile app
     - 🔕 **Dismiss** - Closes notification

## Notification Format

```
🔥 ⏳ Implement AI task breakdown
Priority: HIGH
Status: TODO

👥 2 linked session(s):
  • Break down: Implement AI... (5m ago)
  • Clarify: How should... (12m ago)
```

**Emojis:**
- Priority: 🔥 URGENT, ⚡ HIGH, 📌 MEDIUM, 💡 LOW
- Status: ⏳ TODO, 🔨 IN_PROGRESS, ✅ DONE, 🚫 CANCELLED

## Architecture

```
Happy Backend (WebSocket)
    ↓
Notification Service (PM2 daemon)
    ↓
Telegram Bot API
    ↓
Your Telegram (@ZenFlo_bot)
```

## Troubleshooting

### Service won't start
```bash
# Check logs for errors
npm run notifications:logs

# Verify environment variables
cat .env

# Check if already running
pm2 list
```

### Not receiving notifications
1. Verify bot token is correct
2. Verify chat ID is correct (number, not username)
3. Check service logs: `npm run notifications:logs`
4. Make sure you've messaged the bot first

### Test the service
Create a task via MCP or mobile app and watch for Telegram notification.

## Auto-Start on System Boot

To start the service automatically when your computer boots:

```bash
# Save PM2 process list
pm2 save

# Generate startup script
pm2 startup

# Follow the instructions PM2 prints
```

## Files

- `src/notification-service.ts` - Main service code
- `src/websocket-client.ts` - WebSocket connection handler
- `ecosystem.config.js` - PM2 configuration
- `logs/` - Log files (created automatically)
- `.env` - Environment variables (create from .env.example)

## Security Notes

⚠️ Keep these secret:
- `TELEGRAM_BOT_TOKEN` - Anyone with this can control your bot
- `HAPPY_AUTH_TOKEN` - Full access to your Happy account
- `HAPPY_SECRET_KEY` - Can decrypt all your data

Never commit `.env` to git (already in .gitignore)!
