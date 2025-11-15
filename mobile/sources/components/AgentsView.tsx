import * as React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useSocketStatus } from '@/sync/storage';
import { StatusDot } from './StatusDot';
import { t } from '@/text';
import { ItemGroup } from '@/components/ItemGroup';
import { UpdateBanner } from './UpdateBanner';
import { Typography } from '@/constants/Typography';
import { useRouter } from 'expo-router';
import { layout } from '@/components/layout';
import { useIsTablet } from '@/utils/responsive';
import { Header } from './navigation/Header';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '@/auth/AuthContext';
import { listAgentConfigs } from '@/sync/apiAgents';
import { AgentConfig } from '@/sync/storageTypes';

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emptyIcon: {
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        ...Typography.default('semiBold'),
        color: theme.colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyDescription: {
        fontSize: 16,
        ...Typography.default(),
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    configCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    configHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    configName: {
        fontSize: 17,
        ...Typography.default('semiBold'),
        color: theme.colors.text,
        flex: 1,
    },
    configType: {
        fontSize: 13,
        ...Typography.default(),
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    configUrl: {
        fontSize: 13,
        ...Typography.default(),
        color: theme.colors.textSecondary,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginLeft: 8,
    },
    statusBadgeActive: {
        backgroundColor: theme.colors.status.connected + '20',
    },
    statusBadgeInactive: {
        backgroundColor: theme.colors.status.error + '20',
    },
    statusText: {
        fontSize: 12,
        ...Typography.default('semiBold'),
    },
    statusTextActive: {
        color: theme.colors.status.connected,
    },
    statusTextInactive: {
        color: theme.colors.status.error,
    },
    codeBlock: {
        backgroundColor: theme.colors.terminal.background,
        borderRadius: 8,
        padding: 16,
        marginTop: 20,
        width: '100%',
        maxWidth: 400,
    },
    codeText: {
        fontFamily: 'monospace',
        fontSize: 14,
        lineHeight: 20,
    },
}));

interface AgentsViewProps {
}

function HeaderTitle() {
    const { theme } = useUnistyles();
    const socketStatus = useSocketStatus();

    const getConnectionStatus = () => {
        const { status } = socketStatus;
        switch (status) {
            case 'connected':
                return {
                    color: theme.colors.status.connected,
                    isPulsing: false,
                    text: t('status.connected'),
                    textColor: theme.colors.status.connected
                };
            case 'connecting':
                return {
                    color: theme.colors.status.connecting,
                    isPulsing: true,
                    text: t('status.connecting'),
                    textColor: theme.colors.status.connecting
                };
            case 'disconnected':
                return {
                    color: theme.colors.status.disconnected,
                    isPulsing: false,
                    text: t('status.disconnected'),
                    textColor: theme.colors.status.disconnected
                };
            case 'error':
                return {
                    color: theme.colors.status.error,
                    isPulsing: false,
                    text: t('status.error'),
                    textColor: theme.colors.status.error
                };
            default:
                return {
                    color: theme.colors.status.default,
                    isPulsing: false,
                    text: '',
                    textColor: theme.colors.status.default
                };
        }
    };

    const connectionStatus = getConnectionStatus();

    return (
        <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{
                fontSize: 17,
                color: theme.colors.header.tint,
                fontWeight: '600',
                ...Typography.default('semiBold'),
            }}>
                {t('tabs.agents')}
            </Text>
            {connectionStatus.text && (
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: -2,
                }}>
                    <StatusDot
                        color={connectionStatus.color}
                        isPulsing={connectionStatus.isPulsing}
                        size={6}
                        style={{ marginRight: 4 }}
                    />
                    <Text style={{
                        fontSize: 12,
                        fontWeight: '500',
                        lineHeight: 16,
                        color: connectionStatus.textColor,
                        ...Typography.default(),
                    }}>
                        {connectionStatus.text}
                    </Text>
                </View>
            )}
        </View>
    );
}

function HeaderLeft() {
    const { theme } = useUnistyles();
    return (
        <View style={{
            width: 32,
            height: 32,
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <Image
                source={require('@/assets/images/Q ICON BLACK.png')}
                contentFit="contain"
                style={[{ width: 24, height: 24 }]}
            />
        </View>
    );
}

function HeaderRight() {
    const router = useRouter();
    const { theme } = useUnistyles();
    return (
        <Pressable
            onPress={() => router.push('/agents/configs/new' as any)}
            hitSlop={15}
            style={{
                width: 32,
                height: 32,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Ionicons name="add" size={28} color={theme.colors.header.tint} />
        </Pressable>
    );
}

// Simplified header components for tablet
function HeaderTitleTablet() {
    const { theme } = useUnistyles();
    return (
        <Text style={{
            fontSize: 17,
            color: theme.colors.header.tint,
            fontWeight: '600',
            ...Typography.default('semiBold'),
        }}>
            {t('tabs.agents')}
        </Text>
    );
}

function AgentConfigCard({ config, onPress }: { config: AgentConfig; onPress: () => void }) {
    const { theme } = useUnistyles();

    const typeLabels: Record<AgentConfig['type'], string> = {
        'N8N_WEBHOOK': 'n8n Webhook',
        'GITHUB_ACTIONS': 'GitHub Actions',
        'CUSTOM_WEBHOOK': 'Custom Webhook',
    };

    return (
        <Pressable onPress={onPress} style={styles.configCard}>
            <View style={styles.configHeader}>
                <Text style={styles.configName}>{config.name}</Text>
                <View style={[
                    styles.statusBadge,
                    config.active ? styles.statusBadgeActive : styles.statusBadgeInactive
                ]}>
                    <Text style={[
                        styles.statusText,
                        config.active ? styles.statusTextActive : styles.statusTextInactive
                    ]}>
                        {config.active ? 'Active' : 'Inactive'}
                    </Text>
                </View>
            </View>
            <Text style={styles.configType}>{typeLabels[config.type]}</Text>
            {config.config.webhookUrl && (
                <Text style={styles.configUrl} numberOfLines={1}>
                    {config.config.webhookUrl}
                </Text>
            )}
        </Pressable>
    );
}

export const AgentsView = React.memo(({}: AgentsViewProps) => {
    const router = useRouter();
    const auth = useAuth();
    const { theme } = useUnistyles();
    const isTablet = useIsTablet();
    const [configs, setConfigs] = React.useState<AgentConfig[]>([]);
    const [error, setError] = React.useState<string | null>(null);

    const loadConfigs = React.useCallback(async () => {
        if (!auth.credentials) return;

        try {
            setError(null);
            const result = await listAgentConfigs(auth.credentials);
            setConfigs(result);
        } catch (err) {
            console.error('Failed to load agent configs:', err);
            setError(err instanceof Error ? err.message : 'Failed to load configurations');
        }
    }, [auth.credentials]);

    React.useEffect(() => {
        loadConfigs();
    }, [loadConfigs]);

    if (error) {
        return (
            <View style={styles.container}>
                <View style={{ backgroundColor: theme.colors.groupped.background }}>
                    <Header
                        title={isTablet ? <HeaderTitleTablet /> : <HeaderTitle />}
                        headerRight={() => <HeaderRight />}
                        headerLeft={isTablet ? () => null : () => <HeaderLeft />}
                        headerShadowVisible={false}
                        headerTransparent={true}
                    />
                </View>
                <UpdateBanner />
                <View style={styles.emptyContainer}>
                    <Ionicons
                        name="alert-circle-outline"
                        size={64}
                        color={theme.colors.status.error}
                        style={styles.emptyIcon}
                    />
                    <Text style={[styles.emptyTitle, { color: theme.colors.status.error }]}>
                        Error Loading Agents
                    </Text>
                    <Text style={styles.emptyDescription}>{error}</Text>
                </View>
            </View>
        );
    }

    if (configs.length === 0) {
        return (
            <View style={styles.container}>
                <View style={{ backgroundColor: theme.colors.groupped.background }}>
                    <Header
                        title={isTablet ? <HeaderTitleTablet /> : <HeaderTitle />}
                        headerRight={() => <HeaderRight />}
                        headerLeft={isTablet ? () => null : () => <HeaderLeft />}
                        headerShadowVisible={false}
                        headerTransparent={true}
                    />
                </View>
                <UpdateBanner />
                <View style={styles.emptyContainer}>
                    <Ionicons
                        name="grid-outline"
                        size={64}
                        color={theme.colors.textSecondary}
                        style={styles.emptyIcon}
                    />
                    <Text style={styles.emptyTitle}>No Agents Yet</Text>
                    <Text style={styles.emptyDescription}>
                        Connect n8n workflows, GitHub Actions, or custom webhooks to your mobile sessions.
                    </Text>
                    <View style={styles.codeBlock}>
                        <Text style={[styles.codeText, { color: theme.colors.textSecondary }]}>
                            {`Tap the + button above to create your first agent.\n\nAgents can:\n• Send messages to your sessions\n• Ask questions and wait for replies\n• Trigger workflows from your phone`}
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={{ backgroundColor: theme.colors.groupped.background }}>
                <Header
                    title={isTablet ? <HeaderTitleTablet /> : <HeaderTitle />}
                    headerRight={() => <HeaderRight />}
                    headerLeft={isTablet ? () => null : () => <HeaderLeft />}
                    headerShadowVisible={false}
                    headerTransparent={true}
                />
            </View>
            <ScrollView
                contentContainerStyle={{
                    maxWidth: layout.maxWidth,
                    alignSelf: 'center',
                    width: '100%',
                    padding: 16,
                }}
            >
                <UpdateBanner />

                {configs.map((config) => (
                    <AgentConfigCard
                        key={config.id}
                        config={config}
                        onPress={() => router.push(`/agents/configs/${config.id}` as any)}
                    />
                ))}
            </ScrollView>
        </View>
    );
});
