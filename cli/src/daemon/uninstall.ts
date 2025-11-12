import { uninstall as uninstallMac } from './mac/uninstall';

export async function uninstall(): Promise<void> {
    if (process.platform !== 'darwin') {
        throw new Error('Daemon uninstallation is currently only supported on macOS');
    }

    // No sudo required - LaunchAgent is in user directory
    await uninstallMac();
}