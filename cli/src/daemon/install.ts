import { install as installMac } from './mac/install';

export async function install(): Promise<void> {
    if (process.platform !== 'darwin') {
        throw new Error('Daemon installation is currently only supported on macOS');
    }

    // No sudo required - LaunchAgent installs to user directory
    await installMac();
}