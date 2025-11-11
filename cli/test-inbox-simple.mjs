#!/usr/bin/env node

import axios from 'axios';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function sendTestMessages() {
    console.log('📬 Sending test inbox messages...\n');

    // Load token from access key file
    const credPath = join(homedir(), '.happy', 'access.key');
    let token;

    try {
        const cred = JSON.parse(readFileSync(credPath, 'utf8'));
        token = cred.token;
    } catch (error) {
        console.error('❌ No credentials found. Please run happy first to authenticate.');
        console.error(`   Tried to read: ${credPath}`);
        process.exit(1);
    }

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
            await axios.post(
                'https://zenflo.combinedmemory.com/v1/inbox/claude-message',
                msg,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 5000
                }
            );
            console.log(`✅ Sent: ${msg.title}`);
        } catch (error) {
            console.error(`❌ Failed: ${msg.title}`);
            console.error(`   Error: ${error.response?.data?.error || error.message}`);
        }
    }

    console.log('\n📬 Done! Close the app and check for push notifications, then open to see the inbox.');
}

sendTestMessages().catch(console.error);
