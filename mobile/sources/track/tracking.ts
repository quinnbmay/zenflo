import { config } from '@/config';
import PostHog from 'posthog-react-native';

function initializeTracking(): PostHog | null {
    try {
        if (config.postHogKey) {
            const instance = new PostHog(config.postHogKey, {
                host: 'https://us.i.posthog.com',
                captureAppLifecycleEvents: true,
            });
            console.log('[tracking] PostHog initialized successfully');
            return instance;
        } else {
            console.log('[tracking] PostHog not initialized - no API key provided');
            return null;
        }
    } catch (error) {
        console.error('[tracking] Failed to initialize PostHog:', error);
        return null;
    }
}

// Export null or the actual instance - this makes truthiness checks work correctly
export const tracking = initializeTracking();