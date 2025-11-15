import * as React from 'react';
import { View, Text, ScrollView, TextInput, Switch, ActivityIndicator, Modal as RNModal } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Typography } from '@/constants/Typography';
import { RoundButton } from '@/components/RoundButton';
import { useAuth } from '@/auth/AuthContext';
import { listAgentConfigs, updateAgentConfig, deleteAgentConfig, triggerAgent } from '@/sync/apiAgents';
import { AgentType, AgentConfig } from '@/sync/storageTypes';
import { layout } from '@/components/layout';
import { Picker } from '@react-native-picker/picker';
import { useState, useEffect } from 'react';
import { Modal } from '@/modal';

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    scrollContent: {
        maxWidth: layout.maxWidth,
        alignSelf: 'center',
        width: '100%',
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 15,
        ...Typography.default('semiBold'),
        color: theme.colors.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        ...Typography.default(),
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    pickerContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.divider,
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        color: theme.colors.text,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.colors.divider,
    },
    switchLabel: {
        fontSize: 16,
        ...Typography.default(),
        color: theme.colors.text,
    },
    helperText: {
        fontSize: 13,
        ...Typography.default(),
        color: theme.colors.textSecondary,
        marginTop: 6,
        lineHeight: 18,
    },
    buttonContainer: {
        marginTop: 8,
        marginBottom: 12,
    },
    dangerButton: {
        marginTop: 32,
        marginBottom: 32,
    },
    idText: {
        fontSize: 12,
        ...Typography.default(),
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    modalHeader: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        ...Typography.default('semiBold'),
        color: theme.colors.text,
    },
    jsonInput: {
        height: 200,
        textAlignVertical: 'top',
        fontFamily: 'monospace',
        marginTop: 12,
    },
}));

export default function EditAgentConfigScreen() {
    const { theme } = useUnistyles();
    const router = useRouter();
    const auth = useAuth();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [config, setConfig] = useState<AgentConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [name, setName] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [active, setActive] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTriggering, setIsTriggering] = useState(false);
    const [showTriggerModal, setShowTriggerModal] = useState(false);
    const [runtimeData, setRuntimeData] = useState('');

    useEffect(() => {
        loadConfig();
    }, [id]);

    const loadConfig = async () => {
        if (!auth.credentials || !id) return;

        try {
            setIsLoading(true);
            const configs = await listAgentConfigs(auth.credentials);
            const found = configs.find((c) => c.id === id);

            if (!found) {
                Modal.alert('Error', 'Agent configuration not found', [
                    { text: 'OK', onPress: () => router.back() },
                ]);
                return;
            }

            setConfig(found);
            setName(found.name);
            setWebhookUrl(found.config.webhookUrl || '');
            setApiKey(found.config.apiKey || '');
            setActive(found.active);
        } catch (err) {
            console.error('Failed to load agent config:', err);
            Modal.alert('Error', 'Failed to load configuration', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!auth.credentials || !id) return;

        if (!name.trim()) {
            Modal.alert('Validation Error', 'Please enter a name for this agent');
            return;
        }

        if (!webhookUrl.trim()) {
            Modal.alert('Validation Error', 'Please enter a webhook URL');
            return;
        }

        try {
            setIsSaving(true);
            await updateAgentConfig(auth.credentials, id, {
                name: name.trim(),
                config: {
                    webhookUrl: webhookUrl.trim(),
                    apiKey: apiKey.trim() || undefined,
                },
                active,
            });

            Modal.alert('Success', 'Agent updated successfully');
            loadConfig(); // Reload to get updated data
        } catch (err) {
            console.error('Failed to update agent config:', err);
            Modal.alert(
                'Error',
                err instanceof Error ? err.message : 'Failed to update agent configuration'
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!auth.credentials || !id) return;

        Modal.alert(
            'Delete Agent',
            'Are you sure you want to delete this agent? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteAgentConfig(auth.credentials!, id);
                            router.back();
                        } catch (err) {
                            console.error('Failed to delete agent config:', err);
                            Modal.alert(
                                'Error',
                                err instanceof Error ? err.message : 'Failed to delete agent'
                            );
                        }
                    },
                },
            ]
        );
    };

    const handleTriggerPress = async () => {
        setShowTriggerModal(true);
        // Pre-populate with example JSON
        setRuntimeData('{\n  "message": "Hello from ZenFlo!",\n  "userId": "user123"\n}');
    };

    const handleTrigger = async () => {
        if (!auth.credentials || !id) return;

        // Parse runtime data if provided
        let parsedRuntimeData: any = undefined;
        if (runtimeData.trim()) {
            try {
                parsedRuntimeData = JSON.parse(runtimeData);
            } catch (err) {
                Modal.alert('Invalid JSON', 'Please enter valid JSON for runtime data');
                return;
            }
        }

        try {
            setIsTriggering(true);
            const result = await triggerAgent(auth.credentials, id, parsedRuntimeData);
            setShowTriggerModal(false);
            setRuntimeData('');

            Modal.alert(
                'Success',
                `Agent triggered successfully!\n\nSession ID: ${result.sessionId}`,
                [
                    { text: 'OK' },
                    {
                        text: 'View Session',
                        onPress: () => router.push(`/session/${result.sessionId}` as any),
                    },
                ]
            );
        } catch (err) {
            console.error('Failed to trigger agent:', err);
            Modal.alert(
                'Error',
                err instanceof Error ? err.message : 'Failed to trigger agent'
            );
        } finally {
            setIsTriggering(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={theme.colors.textSecondary} />
            </View>
        );
    }

    if (!config) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <Text style={{ color: theme.colors.textSecondary }}>Configuration not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.section}>
                    <Text style={styles.label}>Agent ID</Text>
                    <Text style={styles.idText}>{config.id}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Agent Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="My n8n Workflow"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Agent Type</Text>
                    <Text style={{ ...Typography.default(), color: theme.colors.textSecondary, marginTop: 8 }}>
                        {config.type === 'N8N_WEBHOOK' && 'n8n Webhook'}
                        {config.type === 'GITHUB_ACTIONS' && 'GitHub Actions'}
                        {config.type === 'CUSTOM_WEBHOOK' && 'Custom Webhook'}
                    </Text>
                    <Text style={styles.helperText}>
                        Agent type cannot be changed after creation
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Webhook URL</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="https://your-n8n.com/webhook/..."
                        placeholderTextColor={theme.colors.textSecondary}
                        value={webhookUrl}
                        onChangeText={setWebhookUrl}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>API Key</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter new API key or leave blank"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={apiKey}
                        onChangeText={setApiKey}
                        autoCapitalize="none"
                        autoCorrect={false}
                        secureTextEntry
                    />
                    <Text style={styles.helperText}>
                        Leave blank to keep existing API key
                    </Text>
                </View>

                <View style={styles.section}>
                    <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>Active</Text>
                        <Switch
                            value={active}
                            onValueChange={setActive}
                            trackColor={{
                                false: theme.colors.textSecondary,
                                true: theme.colors.button.primary.background,
                            }}
                            thumbColor={theme.colors.surface}
                        />
                    </View>
                </View>

                <View style={styles.buttonContainer}>
                    <RoundButton
                        title="Save Changes"
                        action={handleSave}
                        disabled={isSaving || !name.trim() || !webhookUrl.trim()}
                    />
                </View>

                <View style={styles.buttonContainer}>
                    <RoundButton
                        title="Trigger Agent"
                        action={handleTriggerPress}
                        disabled={isTriggering || !active}
                        display="inverted"
                    />
                </View>

                <View style={styles.dangerButton}>
                    <RoundButton
                        title="Delete Agent"
                        action={handleDelete}
                        display="inverted"
                    />
                </View>
            </ScrollView>

            <RNModal
                visible={showTriggerModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowTriggerModal(false)}
            >
                <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Trigger Agent</Text>
                        <RoundButton
                            title="Cancel"
                            action={async () => setShowTriggerModal(false)}
                            display="inverted"
                        />
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 16 }}>
                        <Text style={styles.label}>Runtime Data (JSON)</Text>
                        <Text style={styles.helperText}>
                            Optional: Provide custom data to send with the trigger request. Must be valid JSON.
                        </Text>

                        <TextInput
                            style={[styles.input, styles.jsonInput]}
                            placeholder='{\n  "key": "value"\n}'
                            placeholderTextColor={theme.colors.textSecondary}
                            value={runtimeData}
                            onChangeText={setRuntimeData}
                            multiline
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                        <View style={{ marginTop: 24 }}>
                            <RoundButton
                                title={isTriggering ? 'Triggering...' : 'Trigger Now'}
                                action={handleTrigger}
                                disabled={isTriggering}
                            />
                        </View>
                    </ScrollView>
                </View>
            </RNModal>
        </View>
    );
}
