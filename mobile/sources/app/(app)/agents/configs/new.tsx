import * as React from 'react';
import { View, Text, ScrollView, TextInput, Switch } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useRouter } from 'expo-router';
import { Typography } from '@/constants/Typography';
import { RoundButton } from '@/components/RoundButton';
import { useAuth } from '@/auth/AuthContext';
import { createAgentConfig } from '@/sync/apiAgents';
import { AgentType } from '@/sync/storageTypes';
import { layout } from '@/components/layout';
import { Picker } from '@react-native-picker/picker';
import { useState } from 'react';
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
    inputMultiline: {
        minHeight: 100,
        textAlignVertical: 'top',
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
        marginTop: 16,
        marginBottom: 32,
    },
}));

export default function NewAgentConfigScreen() {
    const { theme } = useUnistyles();
    const router = useRouter();
    const auth = useAuth();

    const [name, setName] = useState('');
    const [type, setType] = useState<AgentType>('N8N_WEBHOOK');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [active, setActive] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        if (!auth.credentials) {
            Modal.alert('Error', 'Not authenticated');
            return;
        }

        if (!name.trim()) {
            Modal.alert('Validation Error', 'Please enter a name for this agent');
            return;
        }

        if (!webhookUrl.trim()) {
            Modal.alert('Validation Error', 'Please enter a webhook URL');
            return;
        }

        try {
            setIsCreating(true);
            await createAgentConfig(auth.credentials, {
                name: name.trim(),
                type,
                config: {
                    webhookUrl: webhookUrl.trim(),
                    apiKey: apiKey.trim() || undefined,
                },
            });

            Modal.alert('Success', 'Agent created successfully', [
                {
                    text: 'OK',
                    onPress: () => router.back(),
                },
            ]);
        } catch (err) {
            console.error('Failed to create agent config:', err);
            Modal.alert(
                'Error',
                err instanceof Error ? err.message : 'Failed to create agent configuration'
            );
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
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
                    <Text style={styles.helperText}>
                        A friendly name to identify this agent
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Agent Type</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={type}
                            onValueChange={(itemValue) => setType(itemValue as AgentType)}
                            style={styles.picker}
                        >
                            <Picker.Item label="n8n Webhook" value="N8N_WEBHOOK" />
                            <Picker.Item label="GitHub Actions" value="GITHUB_ACTIONS" />
                            <Picker.Item label="Custom Webhook" value="CUSTOM_WEBHOOK" />
                        </Picker>
                    </View>
                    <Text style={styles.helperText}>
                        The type of webhook integration
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
                    <Text style={styles.helperText}>
                        The webhook URL that ZenFlo will call when triggering this agent
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>API Key (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter API key for authentication"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={apiKey}
                        onChangeText={setApiKey}
                        autoCapitalize="none"
                        autoCorrect={false}
                        secureTextEntry
                    />
                    <Text style={styles.helperText}>
                        Optional API key that will be sent to your webhook for authentication
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
                    <Text style={styles.helperText}>
                        Inactive agents cannot be triggered
                    </Text>
                </View>

                <View style={styles.buttonContainer}>
                    <RoundButton
                        title="Create Agent"
                        action={handleCreate}
                        disabled={isCreating || !name.trim() || !webhookUrl.trim()}
                    />
                </View>
            </ScrollView>
        </View>
    );
}
