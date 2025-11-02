import * as React from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import { Session } from '@/sync/storageTypes';
import { getSessionName } from '@/utils/sessionUtils';
import { sync } from '@/sync/sync';
import { t } from '@/text';

interface RenameSessionModalProps {
    visible: boolean;
    session: Session | null;
    onClose: () => void;
    onSuccess?: () => void;
}

export function RenameSessionModal({ visible, session, onClose, onSuccess }: RenameSessionModalProps) {
    const [newName, setNewName] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // Reset input when modal opens
    React.useEffect(() => {
        if (visible && session) {
            setNewName(getSessionName(session));
        }
    }, [visible, session]);

    const handleRename = async () => {
        if (!session || !newName.trim()) {
            return;
        }

        setIsSubmitting(true);
        try {
            await sync.updateSessionSummary(session.id, newName.trim());
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Failed to rename session:', error);
            Alert.alert(
                t('error.renameSessionFailed'),
                error instanceof Error ? error.message : t('error.unknownError')
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!session) {
        return null;
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.backdrop}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={styles.container} onStartShouldSetResponder={() => true}>
                    <View style={styles.content}>
                        <Text style={styles.title}>{t('session.renameTitle')}</Text>

                        <TextInput
                            style={styles.input}
                            value={newName}
                            onChangeText={setNewName}
                            placeholder={t('session.renamePlaceholder')}
                            autoFocus
                            selectTextOnFocus
                            maxLength={100}
                            editable={!isSubmitting}
                        />

                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={onClose}
                                disabled={isSubmitting}
                            >
                                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.saveButton, (!newName.trim() || isSubmitting) && styles.disabledButton]}
                                onPress={handleRename}
                                disabled={!newName.trim() || isSubmitting}
                            >
                                <Text style={styles.saveButtonText}>
                                    {isSubmitting ? t('common.saving') : t('common.save')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '85%',
        maxWidth: 400,
    },
    content: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        color: '#000000',
    },
    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
        color: '#000000',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    button: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#F3F4F6',
    },
    cancelButtonText: {
        color: '#374151',
        fontSize: 16,
        fontWeight: '500',
    },
    saveButton: {
        backgroundColor: '#007AFF',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    disabledButton: {
        opacity: 0.5,
    },
});
