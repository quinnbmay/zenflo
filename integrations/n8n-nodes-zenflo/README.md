# n8n-nodes-zenflo

This is an n8n community node that lets you interact with ZenFlo mobile sessions from your n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

### Message Resource

#### Send
Send a message to a ZenFlo session (non-blocking).

**Parameters:**
- `Session ID` - The ZenFlo session ID
- `Message` - The message content to send

**Returns:**
- `messageId` - ID of the sent message
- `success` - Boolean indicating success

#### Send and Wait
Send a message and wait for the user to reply. This is useful for asking questions and getting responses.

**Parameters:**
- `Session ID` - The ZenFlo session ID
- `Message` - The question/message to send
- `Timeout` - Maximum time to wait for response (seconds, default: 300)
- `Poll Interval` - How often to check for response (seconds, default: 2)

**Returns:**
- `messageId` - ID of the sent message
- `userReply` - The user's response text
- `sessionId` - The session ID

### Session Resource

#### Get
Get details about a ZenFlo session.

**Parameters:**
- `Session ID` - The ZenFlo session ID

**Returns:**
Session object with details

#### End
End an active ZenFlo session.

**Parameters:**
- `Session ID` - The ZenFlo session ID

**Returns:**
- `success` - Boolean indicating success

## Credentials

This node requires ZenFlo API credentials:

- **API URL** - Your ZenFlo server URL (default: https://api.zenflo.dev)
- **API Key** - Your ZenFlo agent API key (from agent configuration)

## Compatibility

Tested with n8n version 1.0.0+

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [ZenFlo Documentation](https://docs.zenflo.dev)

## License

[MIT](LICENSE.md)
