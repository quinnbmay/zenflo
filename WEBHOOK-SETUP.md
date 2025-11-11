# GitHub Webhook Auto-Deployment Setup

**Created:** 2025-11-10 PST
**Status:** ✅ Backend configured, Cloudflare DNS setup required

## Overview

Automatic backend deployment is configured on NAS. When you push to `main` branch, GitHub will trigger a webhook that automatically pulls changes and rebuilds the Docker container.

## Components

### 1. Webhook Server (Running on NAS)
- **Location:** `/home/nas/scripts/webhook-server.js`
- **Port:** 9876 (localhost only)
- **Service:** `github-webhook.service` (systemd)
- **Status:** ✅ Active and running

**Check status:**
```bash
ssh nas@nas-1 "sudo systemctl status github-webhook"
```

**View logs:**
```bash
ssh nas@nas-1 "sudo journalctl -u github-webhook -f"
```

### 2. Deployment Script
- **Location:** `/home/nas/scripts/deploy-backend.sh`
- **Triggered by:** Webhook server
- **Actions:**
  1. Fetches latest changes from GitHub
  2. Pulls `main` branch
  3. Rebuilds `zenflo-server` Docker container
  4. Verifies container is running
- **Logs:** `/home/nas/logs/deploy-backend.log`

### 3. Nginx Reverse Proxy
- **Port:** 8877 (exposed to Cloudflare Tunnel)
- **Endpoint:** `/github-webhook`
- **Forwards to:** `http://localhost:9876/webhook`

## Configuration

### Webhook Secret
```
zenflo-7b8b9ff97a77e0e1a66016b40c1ade51
```

**Important:** Keep this secret secure. It's used to verify GitHub webhook signatures.

### Cloudflare Tunnel Setup (Required)

You need to add a DNS route in Cloudflare's dashboard:

1. **Go to:** https://dash.cloudflare.com
2. **Select:** combinedmemory.com domain
3. **Navigate to:** Zero Trust → Tunnels → happy-server tunnel
4. **Add Public Hostname:**
   - **Subdomain:** `webhook`
   - **Domain:** `combinedmemory.com`
   - **Service:** `http://localhost:8877`
   - **Path:** `/github-webhook`

This will make the webhook accessible at: `https://webhook.combinedmemory.com/github-webhook`

### GitHub Repository Webhook Setup

1. **Go to:** https://github.com/quinnbmay/zenflo/settings/hooks
2. **Click:** "Add webhook"
3. **Configure:**
   - **Payload URL:** `https://webhook.combinedmemory.com/github-webhook`
   - **Content type:** `application/json`
   - **Secret:** `zenflo-7b8b9ff97a77e0e1a66016b40c1ade51`
   - **Which events:** Select "Just the push event"
   - **Active:** ✅ Checked
4. **Click:** "Add webhook"

## Testing

### Test Webhook Locally (on NAS)
```bash
ssh nas@nas-1
curl -X POST http://localhost:9876/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$(echo -n '{"ref":"refs/heads/main"}' | openssl dgst -sha256 -hmac 'zenflo-7b8b9ff97a77e0e1a66016b40c1ade51' | sed 's/^.* //')" \
  -d '{"ref":"refs/heads/main","pusher":{"name":"test"}}'
```

### Test Deployment Script
```bash
ssh nas@nas-1 "/home/nas/scripts/deploy-backend.sh"
```

### Monitor Deployment
```bash
# Watch webhook logs
ssh nas@nas-1 "sudo journalctl -u github-webhook -f"

# Watch deployment logs
ssh nas@nas-1 "tail -f /home/nas/logs/deploy-backend.log"

# Check container status
ssh nas@nas-1 "sudo docker ps | grep zenflo-server"
```

## Workflow

1. **Developer pushes to main:**
   ```bash
   git push origin main
   ```

2. **GitHub sends webhook:**
   - POST to `https://webhook.combinedmemory.com/github-webhook`
   - Includes HMAC signature for verification

3. **Webhook server receives and verifies:**
   - Validates signature
   - Checks if push to `main` branch
   - Triggers deployment script

4. **Deployment script runs:**
   - Pulls latest changes
   - Rebuilds Docker container
   - Logs all actions

5. **Backend auto-updates:**
   - New code deployed automatically
   - Zero downtime (Docker handles graceful restart)

## Troubleshooting

### Webhook not triggering

**Check GitHub webhook deliveries:**
- Go to: https://github.com/quinnbmay/zenflo/settings/hooks
- Click on your webhook
- View "Recent Deliveries" tab
- Check for error responses

**Check webhook server:**
```bash
ssh nas@nas-1 "sudo systemctl status github-webhook"
ssh nas@nas-1 "sudo journalctl -u github-webhook -n 50"
```

### Deployment fails

**Check deployment logs:**
```bash
ssh nas@nas-1 "tail -50 /home/nas/logs/deploy-backend.log"
```

**Check Docker container:**
```bash
ssh nas@nas-1 "sudo docker logs zenflo-server --tail 50"
```

**Manual deployment:**
```bash
ssh nas@nas-1
cd 'developer/infrastructure/Zenflo Server/zenflo-server'
git pull origin main
sudo docker compose up -d --build zenflo-server
```

### Restart services

```bash
# Restart webhook server
ssh nas@nas-1 "sudo systemctl restart github-webhook"

# Restart nginx
ssh nas@nas-1 "sudo systemctl restart nginx"

# Restart Cloudflare tunnel
ssh nas@nas-1 "sudo systemctl restart cloudflared"
```

## Security

- ✅ Webhook signatures verified using HMAC-SHA256
- ✅ Only `main` branch pushes trigger deployment
- ✅ Webhook server runs as limited user (`nas`)
- ✅ HTTPS enforced via Cloudflare Tunnel
- ✅ No public port exposure (localhost only)

## Files

### On NAS:
- `/home/nas/scripts/webhook-server.js` - Node.js webhook server
- `/home/nas/scripts/deploy-backend.sh` - Deployment automation
- `/home/nas/logs/deploy-backend.log` - Deployment logs
- `/etc/systemd/system/github-webhook.service` - Systemd service
- `/etc/nginx/sites-available/webhook` - Nginx reverse proxy config

### In Repository:
- `WEBHOOK-SETUP.md` - This documentation
- `backend/deploy.sh` - Manual deployment script (still available)

## Manual Deployment (Still Available)

If you prefer manual deployment or webhook is down:

```bash
cd /Users/quinnmay/developer/zenflo/backend
./deploy.sh git
```

Or SSH directly:

```bash
ssh nas@nas-1
cd 'developer/infrastructure/Zenflo Server/zenflo-server'
git pull origin main
sudo docker compose up -d --build zenflo-server
```

## Next Steps

1. ✅ Webhook server configured and running
2. ✅ Deployment script created and tested
3. ✅ Nginx reverse proxy configured
4. ⏳ **TODO:** Add DNS route in Cloudflare dashboard (webhook.combinedmemory.com)
5. ⏳ **TODO:** Configure GitHub webhook in repository settings
6. ⏳ **TODO:** Test end-to-end deployment

Once steps 4-6 are complete, pushing to `main` will automatically deploy the backend!
