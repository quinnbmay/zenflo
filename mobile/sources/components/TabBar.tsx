import * as React from 'react';
import { View, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { t } from '@/text';
import { Typography } from '@/constants/Typography';
import { layout } from '@/components/layout';
import { useAgentsHasContent } from '@/hooks/useAgentsHasContent';
import { useSettings } from '@/sync/storage';

export type TabType = 'zen' | 'agents' | 'sessions' | 'settings';

interface Tab {
    key: TabType;
    iconName: keyof typeof Ionicons.glyphMap;
    label: string;
}

interface TabBarProps {
    activeTab: TabType;
    onTabPress: (tab: TabType) => void;
    agentsBadgeCount?: number;
}

const styles = StyleSheet.create((theme) => ({
    outerContainer: {
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
    },
    innerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-start',
        maxWidth: layout.maxWidth,
        width: '100%',
        alignSelf: 'center',
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 8,
        paddingBottom: 4,
    },
    tabContent: {
        alignItems: 'center',
        position: 'relative',
    },
    label: {
        fontSize: 10,
        marginTop: 3,
        ...Typography.default(),
    },
    labelActive: {
        color: theme.colors.text,
        ...Typography.default('semiBold'),
    },
    labelInactive: {
        color: theme.colors.textSecondary,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -8,
        backgroundColor: theme.colors.status.error,
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        paddingHorizontal: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        ...Typography.default('semiBold'),
    },
    indicatorDot: {
        position: 'absolute',
        top: 0,
        right: -2,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.text,
    },
}));

export const TabBar = React.memo(({ activeTab, onTabPress, agentsBadgeCount = 0 }: TabBarProps) => {
    const { theme } = useUnistyles();
    const insets = useSafeAreaInsets();
    const agentsHasContent = useAgentsHasContent();
    const settings = useSettings();

    const tabs: Tab[] = React.useMemo(() => {
        const baseTabs: Tab[] = [];

        // Add Zen tab first if experiments are enabled
        if (settings.experiments) {
            baseTabs.push({ key: 'zen', iconName: 'checkmark-circle-outline', label: 'Zen' });
        }

        // Add regular tabs
        baseTabs.push(
            { key: 'agents', iconName: 'grid-outline', label: t('tabs.agents') },
            { key: 'sessions', iconName: 'chatbubbles-outline', label: t('tabs.sessions') },
            { key: 'settings', iconName: 'settings-outline', label: t('tabs.settings') },
        );

        return baseTabs;
    }, [settings.experiments]);

    return (
        <View style={[styles.outerContainer, { paddingBottom: insets.bottom }]}>
            <View style={styles.innerContainer}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    
                    return (
                        <Pressable
                            key={tab.key}
                            style={styles.tab}
                            onPress={() => onTabPress(tab.key)}
                            hitSlop={8}
                        >
                            <View style={styles.tabContent}>
                                <Ionicons
                                    name={tab.iconName}
                                    size={Platform.OS === 'web' ? 16 : 22}
                                    color={isActive ? theme.colors.text : theme.colors.textSecondary}
                                />
                                {tab.key === 'agents' && agentsBadgeCount > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>
                                            {agentsBadgeCount > 99 ? '99+' : agentsBadgeCount}
                                        </Text>
                                    </View>
                                )}
                                {tab.key === 'agents' && agentsHasContent && agentsBadgeCount === 0 && (
                                    <View style={styles.indicatorDot} />
                                )}
                            </View>
                            <Text style={[
                                styles.label,
                                isActive ? styles.labelActive : styles.labelInactive
                            ]}>
                                {tab.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
});