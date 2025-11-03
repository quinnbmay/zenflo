import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { sync } from '@/sync/sync';

/**
 * Handle user actions from notifications (including Apple Watch)
 */
export async function handleNotificationResponse(
    response: Notifications.NotificationResponse
) {
    const { actionIdentifier, notification, userText } = response;
    const { sessionId, messageId, type } = notification.request.content.data as {
        sessionId?: string;
        messageId?: string;
        type?: string;
    };

    console.log(`📱 Notification action: ${actionIdentifier}`, { sessionId, messageId, type });

    // Validate we have required data
    if (!sessionId) {
        console.error('❌ No sessionId in notification data');
        return;
    }

    try {
        switch (actionIdentifier) {
            case 'quick-reply':
                // User replied from Watch or iPhone notification
                if (userText && userText.trim()) {
                    console.log(`💬 Sending quick reply: "${userText.slice(0, 50)}..."`);

                    // Send message using existing sync method
                    await sync.sendMessage(sessionId, userText.trim());

                    // Optional: Send confirmation notification
                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title: '✓ Message Sent',
                            body: `"${userText.slice(0, 50)}${userText.length > 50 ? '...' : ''}"`,
                        },
                        trigger: null, // Immediate
                    });

                    console.log('✅ Quick reply sent successfully');
                } else {
                    console.warn('⚠️ Quick reply action with no text');
                }
                break;

            case 'view-thread':
                // User wants to view the full thread
                console.log(`👁️ Opening thread: ${sessionId}`);

                // Navigate to the session
                router.push(`/session/${sessionId}` as any);
                break;

            case 'dismiss':
                // User dismissed the notification
                console.log('✓ Notification dismissed');
                // No action needed - just acknowledge
                break;

            default:
                // User tapped the notification itself (not an action button)
                if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
                    console.log('📱 Notification tapped - opening thread');
                    router.push(`/session/${sessionId}` as any);
                } else {
                    console.warn(`⚠️ Unknown action: ${actionIdentifier}`);
                }
                break;
        }
    } catch (error) {
        console.error('❌ Error handling notification response:', error);
    }
}
