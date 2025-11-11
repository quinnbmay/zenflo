# ZenFlo Webapp Deployment - Quick Reference

**Last Updated:** 2025-11-10 PST

## One-Line Deploy

```bash
cd /Users/quinnmay/developer/zenflo/webapp && ./deploy.sh
```

## Common Commands

```bash
./deploy.sh                    # Full deployment
./deploy.sh --skip-build       # Redeploy existing build
./deploy.sh --skip-cache       # Deploy without cache purge
./deploy.sh --help             # Show help
```

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Build fails | `yarn typecheck` |
| SSH error | `ssh nas@nas-1 true` |
| Container not found | `ssh nas@nas-1 "sudo docker ps -a"` |
| Changes not showing | Hard refresh (Cmd+Shift+R) |
| Permission error | `ssh nas@nas-1 "sudo docker exec zenflo-webapp chmod -R 755 /usr/share/nginx/html"` |

## Exit Codes

- `0` - Success
- `1` - General error
- `2` - Build failed
- `3` - Package/transfer failed
- `4` - NAS deployment failed
- `5` - Cloudflare cache purge failed

## Verify Deployment

```bash
# Check site
open https://app.combinedmemory.com

# Check container logs
ssh nas@nas-1 "sudo docker logs zenflo-webapp --tail 50"

# Check files in container
ssh nas@nas-1 "sudo docker exec zenflo-webapp ls -la /usr/share/nginx/html"
```

## Post-Deployment Checklist

- [ ] Site loads correctly
- [ ] No console errors
- [ ] Authentication works
- [ ] Voice AI works
- [ ] Commit dist-web changes

## Emergency Rollback

```bash
# If needed, redeploy previous build
git checkout HEAD~1 -- webapp/dist-web
./deploy.sh --skip-build
```

## Full Documentation

See `DEPLOY.md` for complete documentation.
