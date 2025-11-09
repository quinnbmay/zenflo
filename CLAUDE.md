# Happy Webapp - Web Application
**Last Updated:** 2025-11-07 PST
**Shared Docs:** `/Users/quinnmay/developer/happy/SHARED.md`

---

## Essential Commands

### Development
- `yarn start` - Start the Vite development server
- `yarn build` - Build for production
- `yarn typecheck` - Run TypeScript type checking after all changes

### Testing
- `yarn test` - Run tests in watch mode

---

## Deployment

### Railway Auto-Deploy
- **URL:** https://app.combinedmemory.com
- **Process:** Push to `main` → Railway auto-deploys (2-3 min)
- **Build:** Uses pre-built `dist-railway` folder
- ❌ **DO NOT** rebuild - Railway uses committed build artifacts

### Deployment Process
1. Make changes locally
2. Run `yarn build` if needed
3. Run `yarn typecheck` to verify
4. Commit: `git add . && git commit -m "description"`
5. Push: `git push origin main`
6. Railway auto-deploys
7. Verify at https://app.combinedmemory.com

### Critical Rules
- Everything deploys on Railway
- **NEVER** manually trigger rebuilds on Railway
- Pre-built `dist-railway` folder is source of truth
- If build needed, do it locally and commit

---

## Web-Specific Notes

### Platform Target
- **Primary:** Modern web browsers (Chrome, Safari, Firefox, Edge)
- **Mobile Web:** Responsive design, but native app preferred
- **Not supported:** IE11, outdated browsers

### Web-Specific Features
- **Service Workers:** For offline capability
- **PWA Support:** Install as app on desktop/mobile
- **WebRTC:** For voice features (see SHARED.md Voice Agent section)
- **Web APIs:** `navigator.mediaDevices`, `localStorage`, etc.

### Performance Considerations
- Lazy load routes with React.lazy()
- Code split large dependencies
- Optimize bundle size (check with `yarn build`)
- Use React.memo() for expensive components
- Minimize re-renders with proper dependency arrays

### Browser Compatibility
- Use polyfills for newer APIs if needed
- Test on Safari (different behavior than Chrome)
- Check mobile responsive breakpoints
- Verify touch interactions work correctly

---

## Web vs Native Differences

### Files with `.web.tsx` Suffix
When you see `.web.tsx` files, they are web-specific implementations:
- Example: `RealtimeVoiceSession.web.tsx` (uses `@elevenlabs/react`)
- Native version: `RealtimeVoiceSession.tsx` (uses `@elevenlabs/react-native`)

### Common Web-Only Patterns
- `navigator.mediaDevices.getUserMedia()` for microphone access
- `window.localStorage` for persistence
- `document.` APIs for DOM manipulation
- CSS media queries for responsive design

---

## For Complete Documentation

See `/Users/quinnmay/developer/happy/SHARED.md` for:
- Architecture Overview
- Voice Agent (ElevenLabs) Implementation
- Internationalization (i18n) Guidelines
- Unistyles Styling Guide
- Platform-Specific Code Patterns
- Development Guidelines
- Custom Header Component
- Important Files Reference
