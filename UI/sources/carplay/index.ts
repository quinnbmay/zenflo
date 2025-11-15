/**
 * ZenFlo CarPlay Integration
 *
 * Horizontal tablet-like UI for CarPlay with:
 * - List-based navigation (CarPlay standard)
 * - Voice assistant integration
 * - Task management
 * - Session controls
 *
 * Created: 2025-11-13
 */

import { Platform } from 'react-native';

let CarPlay: any;
let ListTemplate: any;
let GridTemplate: any;
if (Platform.OS === 'ios') {
    const mod = require('react-native-carplay');
    CarPlay = mod.CarPlay;
    ListTemplate = mod.ListTemplate;
    GridTemplate = mod.GridTemplate;
}

/**
 * Initialize CarPlay interface when connected
 */
export function initializeCarPlay() {
    if (Platform.OS !== 'ios' || !CarPlay) {
        return;
    }
    console.log('[CarPlay] Initializing ZenFlo CarPlay interface...');
    CarPlay.registerOnConnect(() => {
        console.log('[CarPlay] Connected - Setting up horizontal tablet-like UI');
        setupMainInterface();
    });
    CarPlay.registerOnDisconnect(() => {
        console.log('[CarPlay] Disconnected');
    });
}

/**
 * Set up main horizontal interface similar to tablet layout
 * Uses CarPlay's ListTemplate which naturally provides horizontal layout
 */
function setupMainInterface() {
    // Main menu - similar to tablet's sidebar navigation
    const mainTemplate = new ListTemplate({
        title: 'ZenFlo',
        sections: [
            {
                header: 'Voice',
                items: [
                    {
                        text: 'Talk to Max',
                        detailText: 'Voice assistant',
                        showsDisclosureIndicator: false,
                    },
                ],
            },
            {
                header: 'Tasks',
                items: [
                    {
                        text: 'In Progress',
                        detailText: '2 tasks',
                        showsDisclosureIndicator: true,
                    },
                    {
                        text: 'TODO',
                        detailText: '5 tasks',
                        showsDisclosureIndicator: true,
                    },
                ],
            },
            {
                header: 'Sessions',
                items: [
                    {
                        text: 'Active Session',
                        detailText: 'Running',
                        showsDisclosureIndicator: true,
                    },
                    {
                        text: 'Recent Sessions',
                        detailText: 'View history',
                        showsDisclosureIndicator: true,
                    },
                ],
            },
        ],
    });

    // Handle list item selection
    mainTemplate.config.onItemSelect = async (e: any) => {
        console.log('[CarPlay] Selected item:', e.index);

        const sectionIndex = Math.floor(e.index / 10); // Simple section detection
        const itemIndex = e.index % 10;

        if (sectionIndex === 0) {
            // Voice section
            activateVoiceAssistant();
        } else if (sectionIndex === 1) {
            // Tasks section
            if (itemIndex === 0) {
                showTasksList('in_progress');
            } else {
                showTasksList('todo');
            }
        } else if (sectionIndex === 2) {
            // Sessions section
            if (itemIndex === 0) {
                showActiveSession();
            } else {
                showRecentSessions();
            }
        }
    };

    CarPlay.setRootTemplate(mainTemplate, false);
}

/**
 * Show tasks list with horizontal layout
 * Similar to tablet's content area
 */
function showTasksList(filter: 'in_progress' | 'todo') {
    const title = filter === 'in_progress' ? 'In Progress' : 'TODO';

    // TODO: Connect to actual Zen Mode task store
    const mockTasks = filter === 'in_progress'
        ? [
            { text: 'Build CarPlay integration', detail: 'High priority' },
            { text: 'Fix Metro bundler issue', detail: 'Urgent' },
        ]
        : [
            { text: 'Test in simulator', detail: 'Medium' },
            { text: 'Deploy to TestFlight', detail: 'Low' },
            { text: 'Update documentation', detail: 'Low' },
            { text: 'Review PRs', detail: 'Medium' },
            { text: 'Backup project', detail: 'Low' },
        ];

    const tasksTemplate = new ListTemplate({
        title,
        sections: [
            {
                items: mockTasks.map(task => ({
                    text: task.text,
                    detailText: task.detail,
                    showsDisclosureIndicator: true,
                })),
            },
        ],
    });

    tasksTemplate.config.onItemSelect = async (e: any) => {
        console.log('[CarPlay] Task selected:', e.index);
        showTaskDetail(mockTasks[e.index].text);
    };

    CarPlay.pushTemplate(tasksTemplate, true);
}

/**
 * Show individual task detail
 */
function showTaskDetail(taskName: string) {
    const detailTemplate = new ListTemplate({
        title: taskName,
        sections: [
            {
                header: 'Actions',
                items: [
                    {
                        text: 'Mark as Complete',
                        showsDisclosureIndicator: false,
                    },
                    {
                        text: 'Change Priority',
                        showsDisclosureIndicator: true,
                    },
                    {
                        text: 'Ask Max about this',
                        detailText: 'Voice assistant',
                        showsDisclosureIndicator: false,
                    },
                ],
            },
        ],
    });

    detailTemplate.config.onItemSelect = async (e: any) => {
        if (e.index === 0) {
            console.log('[CarPlay] Marking task complete');
            CarPlay.popTemplate(true);
        } else if (e.index === 2) {
            activateVoiceAssistant();
        }
    };

    CarPlay.pushTemplate(detailTemplate, true);
}

/**
 * Activate Max voice assistant
 * TODO: Connect to ElevenLabs voice session
 */
function activateVoiceAssistant() {
    console.log('[CarPlay] Activating Max voice assistant...');
    // TODO: This would connect to:
    // - sources/realtime/RealtimeVoiceSession.tsx
    // - Trigger voice conversation
    // - Use existing ElevenLabs integration
}

/**
 * Show active session details
 */
function showActiveSession() {
    const sessionTemplate = new ListTemplate({
        title: 'Active Session',
        sections: [
            {
                header: 'Session Info',
                items: [
                    {
                        text: 'Machine: MacBook Pro',
                        showsDisclosureIndicator: false,
                    },
                    {
                        text: 'Path: ~/developer/zenflo',
                        showsDisclosureIndicator: false,
                    },
                    {
                        text: 'Started: 2 hours ago',
                        showsDisclosureIndicator: false,
                    },
                ],
            },
            {
                header: 'Actions',
                items: [
                    {
                        text: 'Ask Max a Question',
                        detailText: 'Voice',
                        showsDisclosureIndicator: false,
                    },
                    {
                        text: 'View Messages',
                        detailText: '24 messages',
                        showsDisclosureIndicator: true,
                    },
                ],
            },
        ],
    });

    sessionTemplate.config.onItemSelect = async (e: any) => {
        if (e.index === 0) {
            activateVoiceAssistant();
        }
    };

    CarPlay.pushTemplate(sessionTemplate, true);
}

/**
 * Show recent sessions list
 */
function showRecentSessions() {
    const sessionsTemplate = new ListTemplate({
        title: 'Recent Sessions',
        sections: [
            {
                items: [
                    {
                        text: 'ZenFlo Mobile Development',
                        detailText: '2 hours ago',
                        showsDisclosureIndicator: true,
                    },
                    {
                        text: 'Backend API Work',
                        detailText: '1 day ago',
                        showsDisclosureIndicator: true,
                    },
                    {
                        text: 'Frontend Refactoring',
                        detailText: '2 days ago',
                        showsDisclosureIndicator: true,
                    },
                ],
            },
        ],
    });

    CarPlay.pushTemplate(sessionsTemplate, true);
}

/**
 * Clean up CarPlay interface
 */
export function cleanupCarPlay() {
    console.log('[CarPlay] Cleaning up');
}
