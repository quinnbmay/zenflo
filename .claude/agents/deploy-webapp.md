---
name: deploy-webapp
description: "[DEPRECATED] Web deployment now handled via GitHub Actions"
tools:
  - Read
---

**⚠️ THIS AGENT IS DEPRECATED ⚠️**

## Web Deployment Has Changed

The webapp workspace has been removed. Web deployment is now part of the **UI** workspace and is handled automatically via GitHub Actions.

## New Web Deployment Process

Web deployment now happens automatically when you push changes to the `UI/**` directory on the `main` branch.

### Automated Deployment

```bash
# Make changes in UI/ directory
cd UI/
# ... make your changes ...

# Commit and push to main
git add .
git commit -m "feat: Your web changes"
git push origin main
```

The GitHub Actions workflow at `.github/workflows/deploy-web.yml` will:
1. Build the web version using `yarn build` or `npx expo export:web`
2. Deploy to the configured target

### Manual Web Build (Testing)

If you need to test the web build locally:

```bash
cd UI/
yarn build  # Build web version
# Output will be in dist-web/
```

### Workflow Configuration

The deployment workflow is defined in:
- `.github/workflows/deploy-web.yml`

This workflow triggers on:
- Pushes to `main` branch with changes in `UI/**`
- Manual workflow dispatch

## Migration Notes

- **Old:** Separate `webapp/` workspace with `webapp/deploy.sh`
- **New:** Unified `UI/` workspace handling iOS, Android, AND Web
- **Deployment:** GitHub Actions instead of manual script

## For More Information

- See `UI/CLAUDE.md` for UI workspace documentation
- See `.github/workflows/deploy-web.yml` for workflow configuration
- See main `CLAUDE.md` for overall deployment architecture

---

**This agent is kept for reference but should NOT be used for deployments.**
