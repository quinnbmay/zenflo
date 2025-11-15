import * as React from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { MarkdownView } from "./markdown/MarkdownView";
import { t } from '@/text';
import { Message, UserTextMessage, AgentTextMessage, ToolCallMessage } from "@/sync/typesMessage";
import { Metadata } from "@/sync/storageTypes";
import { layout } from "./layout";
import { ToolView } from "./tools/ToolView";
import { AgentEvent } from "@/sync/typesRaw";
import { sync } from '@/sync/sync';
import { Option } from './markdown/MarkdownView';
import { voiceModeManager } from '@/voice/VoiceModeManager';
import { useLocalSetting } from '@/sync/storage';
import { Ionicons } from '@expo/vector-icons';

export const MessageView = (props: {
  message: Message;
  metadata: Metadata | null;
  sessionId: string;
  getMessageById?: (id: string) => Message | null;
}) => {
  return (
    <View style={styles.messageContainer} renderToHardwareTextureAndroid={true}>
      <View style={styles.messageContent}>
        <RenderBlock
          message={props.message}
          metadata={props.metadata}
          sessionId={props.sessionId}
          getMessageById={props.getMessageById}
        />
      </View>
    </View>
  );
};

// RenderBlock function that dispatches to the correct component based on message kind
function RenderBlock(props: {
  message: Message;
  metadata: Metadata | null;
  sessionId: string;
  getMessageById?: (id: string) => Message | null;
}): React.ReactElement {
  switch (props.message.kind) {
    case 'user-text':
      return <UserTextBlock message={props.message} sessionId={props.sessionId} />;

    case 'agent-text':
      return <AgentTextBlock message={props.message} sessionId={props.sessionId} />;

    case 'tool-call':
      return <ToolCallBlock
        message={props.message}
        metadata={props.metadata}
        sessionId={props.sessionId}
        getMessageById={props.getMessageById}
      />;

    case 'agent-event':
      return <AgentEventBlock event={props.message.event} metadata={props.metadata} />;


    default:
      // Exhaustive check - TypeScript will error if we miss a case
      const _exhaustive: never = props.message;
      throw new Error(`Unknown message kind: ${_exhaustive}`);
  }
}

function UserTextBlock(props: {
  message: UserTextMessage;
  sessionId: string;
}) {
  const handleOptionPress = React.useCallback((option: Option) => {
    sync.sendMessage(props.sessionId, option.title);
  }, [props.sessionId]);

  return (
    <View style={styles.userMessageContainer}>
      <View style={styles.userMessageBubble}>
        <MarkdownView markdown={props.message.displayText || props.message.text} onOptionPress={handleOptionPress} />
        {/* {__DEV__ && (
          <Text style={styles.debugText}>{JSON.stringify(props.message.meta)}</Text>
        )} */}
      </View>
    </View>
  );
}

// Track last auto-played message per session to avoid replaying on mount
const lastAutoPlayedMessage = new Map<string, string>();

function AgentTextBlock(props: {
  message: AgentTextMessage;
  sessionId: string;
}) {
  const [replyText, setReplyText] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);

  const handleOptionPress = React.useCallback((option: Option) => {
    sync.sendMessage(props.sessionId, option.title);
  }, [props.sessionId]);

  const handleReply = React.useCallback(async () => {
    if (!replyText.trim() || isSending) return;

    try {
      setIsSending(true);
      await sync.sendMessage(props.sessionId, replyText.trim());
      setReplyText('');
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setIsSending(false);
    }
  }, [props.sessionId, replyText, isSending]);

  const ttsAutoPlay = useLocalSetting('ttsAutoPlay');
  const ttsSpeed = useLocalSetting('ttsSpeed');
  const ttsSkipCodeBlocks = useLocalSetting('ttsSkipCodeBlocks');
  const ttsMaxLength = useLocalSetting('ttsMaxLength');
  const ttsVoiceId = useLocalSetting('ttsVoiceId');

  // Track if this specific message is currently playing
  const [isPlaying, setIsPlaying] = React.useState(false);

  // Poll for playing state (VoiceModeManager doesn't have subscribe yet)
  React.useEffect(() => {
    let mounted = true;

    const checkPlayingState = async () => {
      if (!mounted) return;

      const speaking = await voiceModeManager.isSpeaking();
      // For now, we can only check if ANY message is speaking
      // TODO: Add currentMessageId getter to VoiceModeManager to check specific message
      setIsPlaying(speaking);
    };

    // Check immediately
    checkPlayingState();

    // Poll every 500ms while mounted
    const interval = setInterval(checkPlayingState, 500);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [props.message.id]);

  // Handle manual speaker button click
  const handleSpeakerPress = React.useCallback(async () => {
    const speaking = await voiceModeManager.isSpeaking();

    if (speaking) {
      // Stop playback
      await voiceModeManager.stop();
    } else {
      // Start playing this message
      voiceModeManager.speak(props.message.text, props.message.id, props.sessionId, {
        speed: ttsSpeed,
        skipCodeBlocks: ttsSkipCodeBlocks,
        maxLength: ttsMaxLength,
        voiceId: ttsVoiceId,
      }, true); // isManual = true
    }
  }, [props.message.text, props.message.id, props.sessionId, ttsSpeed, ttsSkipCodeBlocks, ttsMaxLength, ttsVoiceId]);

  // Auto-play on mount if enabled
  React.useEffect(() => {
    console.log('[MessageView] TTS effect triggered for message:', props.message.id);
    console.log('[MessageView] ttsAutoPlay value:', ttsAutoPlay);
    console.log('[MessageView] ttsAutoPlay type:', typeof ttsAutoPlay);
    console.log('[MessageView] ttsAutoPlay === true?', ttsAutoPlay === true);
    console.log('[MessageView] ttsAutoPlay === false?', ttsAutoPlay === false);

    if (ttsAutoPlay) {
      // Check if we've already auto-played this message
      const lastPlayedId = lastAutoPlayedMessage.get(props.sessionId);
      console.log('[MessageView] Last auto-played message for session:', lastPlayedId);

      // Only auto-play if this is a NEW message (not previously auto-played)
      if (lastPlayedId === props.message.id) {
        console.log('[MessageView] Skipping auto-play - already played this message');
        return;
      }

      const shouldRead = voiceModeManager.shouldReadMessage(props.message.text, {
        speed: ttsSpeed,
        skipCodeBlocks: ttsSkipCodeBlocks,
        maxLength: ttsMaxLength,
      });

      console.log('[MessageView] shouldRead:', shouldRead);

      if (shouldRead) {
        console.log('[MessageView] Calling voiceModeManager.speak() for NEW message');

        // Mark this as the last auto-played message for this session
        lastAutoPlayedMessage.set(props.sessionId, props.message.id);

        voiceModeManager.speak(props.message.text, props.message.id, props.sessionId, {
          speed: ttsSpeed,
          skipCodeBlocks: ttsSkipCodeBlocks,
          maxLength: ttsMaxLength,
          voiceId: ttsVoiceId,
        });
      }
    }
  }, [props.message.id, props.message.text, props.sessionId, ttsAutoPlay, ttsSpeed, ttsSkipCodeBlocks, ttsMaxLength, ttsVoiceId]);

  const { theme } = useUnistyles();

  return (
    <View style={styles.agentMessageContainer}>
      <MarkdownView markdown={props.message.text} onOptionPress={handleOptionPress} />
      <Pressable
        onPress={handleSpeakerPress}
        style={({ pressed }) => [
          styles.speakerButton,
          pressed && styles.speakerButtonPressed,
        ]}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <Ionicons
          name={isPlaying ? "stop-circle" : "volume-medium"}
          size={18}
          color={isPlaying ? "#FF6B6B" : "#8E8E93"}
        />
      </Pressable>

      {props.message.requiresUserInput && (
        <View style={styles.replyContainer}>
          <Text style={[styles.replyPrompt, { color: theme.colors.warning }]}>
            {t('message.agentRequiresReply')}
          </Text>
          <View style={styles.replyInputContainer}>
            <TextInput
              style={[styles.replyInput, { color: theme.colors.text, borderColor: theme.colors.divider }]}
              placeholder={t('message.typeYourReply')}
              placeholderTextColor={theme.colors.textSecondary}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              editable={!isSending}
            />
            <Pressable
              onPress={handleReply}
              disabled={!replyText.trim() || isSending}
              style={({ pressed }) => [
                styles.replyButton,
                { backgroundColor: theme.colors.button.primary.background },
                pressed && styles.replyButtonPressed,
                (!replyText.trim() || isSending) && styles.replyButtonDisabled,
              ]}
            >
              <Ionicons
                name="send"
                size={20}
                color={theme.colors.button.primary.tint}
              />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function AgentEventBlock(props: {
  event: AgentEvent;
  metadata: Metadata | null;
}) {
  if (props.event.type === 'switch') {
    return (
      <View style={styles.agentEventContainer}>
        <Text style={styles.agentEventText}>{t('message.switchedToMode', { mode: props.event.mode })}</Text>
      </View>
    );
  }
  if (props.event.type === 'message') {
    return (
      <View style={styles.agentEventContainer}>
        <Text style={styles.agentEventText}>{props.event.message}</Text>
      </View>
    );
  }
  if (props.event.type === 'limit-reached') {
    const formatTime = (timestamp: number): string => {
      try {
        const date = new Date(timestamp * 1000); // Convert from Unix timestamp
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {
        return t('message.unknownTime');
      }
    };

    return (
      <View style={styles.agentEventContainer}>
        <Text style={styles.agentEventText}>
          {t('message.usageLimitUntil', { time: formatTime(props.event.endsAt) })}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.agentEventContainer}>
      <Text style={styles.agentEventText}>{t('message.unknownEvent')}</Text>
    </View>
  );
}

function ToolCallBlock(props: {
  message: ToolCallMessage;
  metadata: Metadata | null;
  sessionId: string;
  getMessageById?: (id: string) => Message | null;
}) {
  if (!props.message.tool) {
    return null;
  }
  return (
    <View style={styles.toolContainer}>
      <ToolView
        tool={props.message.tool}
        metadata={props.metadata}
        messages={props.message.children}
        sessionId={props.sessionId}
        messageId={props.message.id}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  messageContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  messageContent: {
    flexDirection: 'column',
    flexGrow: 1,
    flexBasis: 0,
    maxWidth: layout.maxWidth,
  },
  userMessageContainer: {
    maxWidth: '100%',
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  userMessageBubble: {
    backgroundColor: theme.colors.userMessageBackground,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
    maxWidth: '100%',
  },
  agentMessageContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  speakerButton: {
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignSelf: 'flex-start',
    opacity: 0.7,
  },
  speakerButtonPressed: {
    opacity: 1,
  },
  agentEventContainer: {
    marginHorizontal: 8,
    alignItems: 'center',
    paddingVertical: 8,
  },
  agentEventText: {
    color: theme.colors.agentEventText,
    fontSize: 14,
  },
  toolContainer: {
    marginHorizontal: 8,
  },
  debugText: {
    color: theme.colors.agentEventText,
    fontSize: 12,
  },
  replyContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  replyPrompt: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  replyInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  replyInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 15,
  },
  replyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  replyButtonPressed: {
    opacity: 0.7,
  },
  replyButtonDisabled: {
    opacity: 0.4,
  },
}));
