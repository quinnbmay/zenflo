# Privacy Policy for Combined Memory Coder

**Last Updated: November 2, 2025**

## Overview

Combined Memory Coder is a custom internal iOS application for Quinn May's Combined Memory AI platform. This policy explains data handling practices.

## Internal Use Only

This app is for personal/internal use only by Quinn May and authorized users of the Combined Memory platform. It is not a public service.

## What We Collect

### Encrypted Data
- **Messages and Code**: All conversations and code snippets are end-to-end encrypted on your device before transmission
- **Encryption Keys**: When you pair devices, encryption keys are transmitted between your devices in encrypted form

### Metadata (Not Encrypted)
- **Message IDs**: Unique identifiers for message ordering and synchronization
- **Timestamps**: When messages were created and synced
- **Device IDs**: Anonymous identifiers for device pairing
- **Session IDs**: Identifiers for your AI sessions
- **Push Notification Tokens**: Device tokens for push notifications via Expo

## What We Don't Collect
- Your actual code or conversation content (encrypted)
- Location data
- Personal information beyond what you voluntarily include in encrypted messages

## How We Use Data

### Encrypted Data
- Stored on Combined Memory backend servers for synchronization between devices
- Transmitted to paired devices when requested
- Retained until deleted through the app

### Metadata
- Message IDs and timestamps maintain proper message ordering
- Device IDs enable secure pairing
- Session IDs track AI sessions for synchronization
- Push notification tokens enable notifications through Expo

### Push Notifications
Push notifications are sent directly from your devices to each other:
- We never see the content of your notifications
- Notification content is generated on your device
- Only device-to-device communication occurs
- Expo's push notification service is used solely as a delivery mechanism

## Data Security

- **End-to-End Encryption**: Using TweetNaCl (same as Signal) for all sensitive data
- **Zero-Knowledge**: Backend cannot decrypt your data
- **Secure Key Exchange**: Encryption keys are transmitted between your devices only in encrypted form
- **Open Source**: Encryption implementation is publicly auditable
- **No Backdoors**: Architecture makes it impossible to access your content

## Data Retention

- Encrypted messages retained until you delete them
- Metadata retained for system functionality
- Deleted data permanently removed from servers within 30 days

## Your Rights

You have the right to:
- Delete all your data through the app
- Export your encrypted data
- Audit the open-source code
- Use the app without providing personal information

## Data Sharing

We do not share your data with anyone. This is a private internal application.

## Connected Services

This app connects to:
- **ZenFlo Backend**: api.zenflo.dev
- **MongoDB**: Railway hosted database
- **ElevenLabs**: Voice AI services
- **Expo Push Notifications**: Apple Push Notification Service (APNS)

## Changes to This Policy

Material changes to this privacy policy will be documented in the app changelog.

## Contact

For privacy concerns or questions:
- Email: yesreply@zenflo.dev

## Compliance

Combined Memory Coder is designed with privacy by default and follows:
- GDPR (General Data Protection Regulation)
- CCPA (California Consumer Privacy Act)
- Privacy by Design principles

---

**Note**: This is a customized fork of Happy Coder for internal use. Your encryption keys are only shared between your own devices in encrypted form. The backend cannot read your code or conversations.

Original project: [Happy Coder](https://github.com/slopus/happy)
