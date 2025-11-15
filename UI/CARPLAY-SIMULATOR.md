# Testing ZenFlo in CarPlay Simulator

## Quick Start

1. **Build and run** the iOS app:
   ```bash
   yarn ios --simulator "iPhone 16"
   ```

2. **Open CarPlay window** in the running Simulator:
   - Go to **I/O** → **External Displays** → **CarPlay**
   - A horizontal CarPlay window will appear

3. **Interact with ZenFlo CarPlay**:
   - You'll see the main menu with:
     - Voice (Talk to Max)
     - Tasks (In Progress, TODO)
     - Sessions (Active, Recent)

## CarPlay UI Design

The CarPlay interface uses a horizontal layout matching the tablet design:

- **List-based navigation** (CarPlay standard)
- **Horizontal split-screen feel** from list + detail views
- **Voice-first** interaction for Max assistant
- **Task management** from Zen Mode
- **Session controls** for active coding sessions

## Architecture

### Files
- `sources/carplay/index.ts` - Main CarPlay integration
- `sources/app/_layout.tsx` - CarPlay initialization (line 202-206)

### CarPlay Templates
- **ListTemplate** - Main navigation and all screens
- Horizontal layout automatically provided by CarPlay
- Similar to tablet's sidebar + content area pattern

## Development Notes

### No Apple Entitlement Needed (Simulator Only)
- CarPlay works in simulator without Apple approval
- Production deployment requires Apple entitlement (~1 month wait)

### Current Status
- ✅ Simulator testing ready
- ✅ TypeScript compilation passing
- ✅ Pod dependencies installed
- 🚧 Voice integration TODO (connect to ElevenLabs)
- 🚧 Real task data TODO (connect to Zen Mode store)

### Next Steps
1. Test basic navigation in simulator
2. Connect to actual Zen Mode tasks
3. Integrate Max voice assistant
4. Add session data from sync store

## Troubleshooting

### CarPlay window doesn't appear
1. Make sure simulator is running
2. Try **I/O → External Displays → CarPlay** again
3. Check console for CarPlay initialization logs

### App crashes on CarPlay connect
- Check console logs for errors
- Verify `react-native-carplay` pod is installed
- Rebuild: `yarn ios --simulator "iPhone 16"`

## References

- [Apple CarPlay Documentation](https://developer.apple.com/carplay/)
- [react-native-carplay](https://github.com/birkir/react-native-carplay)
- ZenFlo tablet UI: `sources/components/MainView.tsx`

---
Created: 2025-11-13
Status: Prototype ready for simulator testing
