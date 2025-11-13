import { AuthCredentials } from '@/auth/tokenStorage';
import { backoff } from '@/utils/time';
import { getServerUrl } from './serverConfig';
import { AgentConfig, AgentType } from './storageTypes';

/**
 * List all agent configurations for the current user
 */
export async function listAgentConfigs(credentials: AuthCredentials): Promise<AgentConfig[]> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/agents/configs`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${credentials.token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to list agent configs: ${response.status}`);
        }

        const data = await response.json() as { configs: AgentConfig[] };
        return data.configs;
    });
}

/**
 * Create a new agent configuration
 */
export async function createAgentConfig(
    credentials: AuthCredentials,
    params: {
        name: string;
        type: AgentType;
        config: {
            webhookUrl?: string;
            apiKey?: string;
            [key: string]: any;
        };
        runtimeFields?: any;
    }
): Promise<AgentConfig> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/agents/configs`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to create agent config: ${response.status}`);
        }

        const data = await response.json() as { config: AgentConfig };
        return data.config;
    });
}

/**
 * Update an existing agent configuration
 */
export async function updateAgentConfig(
    credentials: AuthCredentials,
    configId: string,
    params: {
        name?: string;
        config?: {
            webhookUrl?: string;
            apiKey?: string;
            [key: string]: any;
        };
        runtimeFields?: any;
        active?: boolean;
    }
): Promise<AgentConfig> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/agents/configs/${configId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to update agent config: ${response.status}`);
        }

        const data = await response.json() as { config: AgentConfig };
        return data.config;
    });
}

/**
 * Delete an agent configuration
 */
export async function deleteAgentConfig(
    credentials: AuthCredentials,
    configId: string
): Promise<void> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/agents/configs/${configId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${credentials.token}`
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to delete agent config: ${response.status}`);
        }
    });
}

/**
 * Trigger an agent (webhook), creating a new session
 */
export async function triggerAgent(
    credentials: AuthCredentials,
    configId: string,
    runtimeData?: any
): Promise<{ sessionId: string; success: boolean }> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/agents/trigger`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                configId,
                runtimeData
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to trigger agent: ${response.status}`);
        }

        return await response.json() as { sessionId: string; success: boolean };
    });
}

/**
 * Reply to an agent question
 */
export async function replyToAgent(
    credentials: AuthCredentials,
    sessionId: string,
    content: string
): Promise<{ messageId: string; success: boolean }> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await fetch(`${API_ENDPOINT}/v1/sessions/${sessionId}/reply`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Failed to reply to agent: ${response.status}`);
        }

        return await response.json() as { messageId: string; success: boolean };
    });
}
