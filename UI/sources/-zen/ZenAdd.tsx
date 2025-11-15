import * as React from 'react';
import { View, TextInput, KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '@/constants/Typography';
import { addTodo } from '@/-zen/model/ops';
import { useAuth } from '@/auth/AuthContext';
import { ItemGroup } from '@/components/ItemGroup';
import { Item } from '@/components/Item';
import { Ionicons } from '@expo/vector-icons';
import { useAllMachines, useSessions, useSetting } from '@/sync/storage';
import { MultiTextInput } from '@/components/MultiTextInput';

export const ZenAdd = React.memo(() => {
    const router = useRouter();
    const { theme } = useUnistyles();
    const insets = useSafeAreaInsets();
    const [text, setText] = React.useState('');
    const [selectedMachine, setSelectedMachine] = React.useState<string | undefined>();
    const [selectedPath, setSelectedPath] = React.useState<string>('');
    const [showMachinePicker, setShowMachinePicker] = React.useState(false);
    const [showPathPicker, setShowPathPicker] = React.useState(false);
    const auth = useAuth();
    const machines = useAllMachines();
    const sessions = useSessions();
    const recentMachinePaths = useSetting('recentMachinePaths');

    const machine = React.useMemo(() => {
        return machines.find(m => m.id === selectedMachine);
    }, [machines, selectedMachine]);

    // Get recent paths for selected machine with git info
    const recentPathsWithGit = React.useMemo(() => {
        if (!selectedMachine) return [];

        const pathsMap = new Map<string, { path: string; timestamp: number; gitBranch?: string; gitRemote?: string }>();

        // Add paths from recentMachinePaths
        recentMachinePaths.forEach(entry => {
            if (entry.machineId === selectedMachine && !pathsMap.has(entry.path)) {
                pathsMap.set(entry.path, { path: entry.path, timestamp: Date.now() });
            }
        });

        // Add paths from sessions with git info
        if (sessions) {
            sessions.forEach(item => {
                if (typeof item === 'string') return;

                const session = item as any;
                if (session.metadata?.machineId === selectedMachine && session.metadata?.path) {
                    const path = session.metadata.path;
                    const existing = pathsMap.get(path);
                    const timestamp = session.updatedAt || session.createdAt;

                    // Update if this session is more recent or has git info
                    if (!existing || timestamp > existing.timestamp || session.metadata?.gitBranch) {
                        pathsMap.set(path, {
                            path,
                            timestamp,
                            gitBranch: session.metadata?.gitBranch || existing?.gitBranch,
                            gitRemote: session.metadata?.gitRemote || existing?.gitRemote
                        });
                    }
                }
            });
        }

        // Sort by most recent
        return Array.from(pathsMap.values()).sort((a, b) => b.timestamp - a.timestamp);
    }, [sessions, selectedMachine, recentMachinePaths]);

    const recentPaths = React.useMemo(() => recentPathsWithGit.map(item => item.path), [recentPathsWithGit]);

    // Auto-populate git info when path is selected
    React.useEffect(() => {
        if (selectedPath) {
            const pathInfo = recentPathsWithGit.find(item => item.path === selectedPath);
            // Git info will be used when creating the task
            // Store in ref or state if needed for display
        }
    }, [selectedPath, recentPathsWithGit]);

    const handleSubmit = async () => {
        if (text.trim() && auth?.credentials) {
            // Find git info for selected path
            const pathInfo = selectedPath ? recentPathsWithGit.find(item => item.path === selectedPath) : undefined;
            const gitRepo = pathInfo?.gitBranch && pathInfo?.gitRemote
                ? { branch: pathInfo.gitBranch, remote: pathInfo.gitRemote }
                : undefined;

            await addTodo(
                auth.credentials,
                text.trim(),
                undefined, // priority
                undefined, // status
                selectedPath || undefined, // projectPath
                undefined, // workingDirectory
                gitRepo  // gitRepo - auto-populated from session metadata
            );
            router.back();
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 20 }
                ]}
                keyboardShouldPersistTaps="handled"
            >
                <ItemGroup title="Task Title">
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    color: theme.colors.text,
                                    backgroundColor: theme.colors.input.background,
                                    borderColor: theme.colors.divider,
                                }
                            ]}
                            placeholder="What needs to be done?"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={text}
                            onChangeText={setText}
                            onSubmitEditing={handleSubmit}
                            autoFocus
                            returnKeyType="done"
                            multiline
                            blurOnSubmit={true}
                        />
                    </View>
                </ItemGroup>

                <ItemGroup title="Project (Optional)">
                    <Item
                        title={machine ? (machine.metadata?.displayName || machine.metadata?.host || machine.id) : 'Select Machine'}
                        leftElement={
                            <Ionicons
                                name="desktop-outline"
                                size={24}
                                color={machine ? theme.colors.text : theme.colors.textSecondary}
                            />
                        }
                        onPress={() => setShowMachinePicker(!showMachinePicker)}
                        showChevron
                        showDivider={false}
                    />
                </ItemGroup>

                {showMachinePicker && (
                    <ItemGroup>
                        {machines.map((m) => {
                            const displayName = m.metadata?.displayName || m.metadata?.host || m.id;
                            const isSelected = selectedMachine === m.id;

                            return (
                                <Item
                                    key={m.id}
                                    title={displayName}
                                    leftElement={
                                        <Ionicons
                                            name="desktop-outline"
                                            size={20}
                                            color={theme.colors.textSecondary}
                                        />
                                    }
                                    onPress={() => {
                                        setSelectedMachine(m.id);
                                        setShowMachinePicker(false);
                                        // Clear path if machine changed
                                        if (selectedMachine !== m.id) {
                                            setSelectedPath('');
                                        }
                                    }}
                                    selected={isSelected}
                                    showChevron={false}
                                />
                            );
                        })}
                    </ItemGroup>
                )}

                {selectedMachine && (
                    <>
                        <ItemGroup title="Path (Optional)">
                            <View style={styles.pathInputContainer}>
                                <View style={[styles.pathInput, { backgroundColor: theme.colors.input.background, borderColor: theme.colors.divider }]}>
                                    <MultiTextInput
                                        value={selectedPath}
                                        onChangeText={setSelectedPath}
                                        placeholder="Enter path (e.g. /home/user/projects)"
                                        maxHeight={76}
                                        paddingTop={8}
                                        paddingBottom={8}
                                    />
                                </View>
                            </View>
                        </ItemGroup>

                        {recentPathsWithGit.length > 0 && (
                            <ItemGroup title="Recent Paths">
                                {recentPathsWithGit.slice(0, 5).map((pathInfo, index) => {
                                    const isSelected = selectedPath === pathInfo.path;
                                    const hasGit = pathInfo.gitBranch && pathInfo.gitRemote;

                                    return (
                                        <Item
                                            key={pathInfo.path}
                                            title={pathInfo.path}
                                            subtitle={hasGit ? `${pathInfo.gitBranch} • Git` : undefined}
                                            leftElement={
                                                <Ionicons
                                                    name={hasGit ? "git-branch-outline" : "folder-outline"}
                                                    size={18}
                                                    color={hasGit ? theme.colors.status.connected : theme.colors.textSecondary}
                                                />
                                            }
                                            onPress={() => setSelectedPath(pathInfo.path)}
                                            selected={isSelected}
                                            showChevron={false}
                                        />
                                    );
                                })}
                            </ItemGroup>
                        )}
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingVertical: 16,
    },
    inputContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    input: {
        fontSize: 16,
        lineHeight: 22,
        borderRadius: 10,
        borderWidth: 0.5,
        paddingHorizontal: 12,
        paddingVertical: 12,
        minHeight: 80,
        textAlignVertical: 'top',
        ...Typography.default(),
    },
    pathInputContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    pathInput: {
        borderRadius: 10,
        borderWidth: 0.5,
        paddingHorizontal: 12,
        minHeight: 44,
    },
}));