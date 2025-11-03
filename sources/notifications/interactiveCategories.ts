import * as Notifications from 'expo-notifications';

/**
 * Setup interactive notification categories for Apple Watch
 * This enables users to reply to messages directly from their wrist
 */
export async function setupInteractiveNotifications() {
    console.log('📱 Setting up interactive notifications for Apple Watch');

    // Configure default notification behavior
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
        }),
    });

    try {
        // Define interactive notification category for AI messages
        await Notifications.setNotificationCategoryAsync('ai-message', [
            {
                identifier: 'quick-reply',
                buttonTitle: '💬 Reply',
                options: {
                    opensAppToForeground: false,
                    isDestructive: false,
                    isAuthenticationRequired: false,
                },
                textInput: {
                    submitButtonTitle: 'Send',
                    placeholder: 'Your message...',
                },
            },
            {
                identifier: 'view-thread',
                buttonTitle: '👁️ View',
                options: {
                    opensAppToForeground: true,
                    isDestructive: false,
                    isAuthenticationRequired: false,
                },
            },
            {
                identifier: 'dismiss',
                buttonTitle: '✓ Dismiss',
                options: {
                    opensAppToForeground: false,
                    isDestructive: false,
                    isAuthenticationRequired: false,
                },
            },
        ]);

        console.log('✅ Interactive notification categories registered successfully');
    } catch (error) {
        console.error('❌ Failed to setup notification categories:', error);
    }
}
