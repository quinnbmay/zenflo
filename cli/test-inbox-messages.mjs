#!/usr/bin/env node

import { ApiClient } from './dist/api/api.mjs';
import { loadCredential } from './dist/api/storage.mjs';
import { configuration } from './dist/api/configuration.mjs';

async function sendTestMessages() {
    console.log('📬 Sending test inbox messages...\n');

    // Load stored credentials
    const credential = await loadCredential();
    if (!credential) {
        console.error('❌ No credentials found. Please run happy first to authenticate.');
        process.exit(1);
    }

    const api = new ApiClient(credential, configuration.serverUrl);

    const messages = [
        {
            title: '🧪 Test: Low Priority',
            message: 'This is a low priority message. When you tap it, you will see the full message in a modal with no action buttons - just informational.',
            priority: 'low'
        },
        {
            title: '📋 Test: Normal Priority',
            message: 'This is a normal priority message. It will open in a modal to show the full details, but no approval needed - just an update to keep you informed.',
            priority: 'normal'
        },
        {
            title: '⚠️ Test: High Priority - Needs Approval',
            message: 'This is a HIGH priority message that needs your input. When you open this, you will see Approve/Deny/Reply buttons. This is the "safe YOLO" mode - only high priority messages ask for approval, so you won\'t be bombarded with prompts!',
            priority: 'high'
        }
    ];

    for (const msg of messages) {
        try {
            await api.sendInboxMessage(msg);
            console.log(`✅ Sent: ${msg.title}`);
        } catch (error) {
            console.error(`❌ Failed to send "${msg.title}":`, error.message);
        }
    }

    console.log('\n📬 Done! Check your Happy app inbox.');
}

sendTestMessages().catch(console.error);
