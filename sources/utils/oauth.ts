import { getRandomBytes } from 'expo-crypto';
import * as Crypto from 'expo-crypto';

// OAuth Configuration for Claude.ai
export const CLAUDE_OAUTH_CONFIG = {
    CLIENT_ID: '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
    AUTHORIZE_URL: 'https://claude.ai/oauth/authorize',
    TOKEN_URL: 'https://console.anthropic.com/v1/oauth/token',
    REDIRECT_URI: 'http://localhost:54545/callback',
    SCOPE: 'user:inference',
};

// OAuth Configuration for Qwen
export const QWEN_OAUTH_CONFIG = {
    CLIENT_ID: process.env.EXPO_PUBLIC_QWEN_CLIENT_ID || 'your-qwen-client-id',
    AUTHORIZE_URL: 'https://dashscope.aliyuncs.com/oauth/authorize',
    TOKEN_URL: 'https://dashscope.aliyuncs.com/oauth/token',
    REDIRECT_URI: 'http://localhost:54546/callback',
    SCOPE: 'public_data:read',
};

export interface PKCECodes {
    verifier: string;
    challenge: string;
}

export interface ClaudeAuthTokens {
    raw: any;
    token: string;
    expires: number;
}

export interface QwenAuthTokens {
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in?: number;
    scope?: string;
    id_token?: string;
}

/**
 * Convert Uint8Array to base64url string
 */
function base64urlEncode(buffer: Uint8Array): string {
    // Convert to base64
    const base64 = btoa(String.fromCharCode(...buffer));

    // Convert to base64url
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * Generate PKCE codes for OAuth flow
 */
export async function generatePKCE(): Promise<PKCECodes> {
    // Generate code verifier (43-128 characters, base64url)
    const verifierBytes = getRandomBytes(32);
    const verifier = base64urlEncode(verifierBytes);

    // Generate code challenge (SHA256 of verifier, base64url encoded)
    const challengeBytes = await Crypto.digest(
        Crypto.CryptoDigestAlgorithm.SHA256,
        new TextEncoder().encode(verifier)
    );
    const challenge = base64urlEncode(new Uint8Array(challengeBytes));

    return { verifier, challenge };
}

/**
 * Generate random state for OAuth security
 */
export function generateState(): string {
    const stateBytes = getRandomBytes(32);
    return base64urlEncode(stateBytes);
}

/**
 * Build OAuth authorization URL for a specific service
 */
export function buildAuthorizationUrl(challenge: string, state: string, service: 'claude' | 'qwen' = 'claude'): string {
    const config = service === 'qwen' ? QWEN_OAUTH_CONFIG : CLAUDE_OAUTH_CONFIG;
    
    const params = new URLSearchParams({
        client_id: config.CLIENT_ID,
        response_type: 'code',
        redirect_uri: config.REDIRECT_URI,
        scope: config.SCOPE,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state: state,
    });
    
    // Claude has special 'code' parameter
    if (service === 'claude') {
        params.set('code', 'true');  // This tells Claude.ai to show the code AND redirect
    }

    return `${config.AUTHORIZE_URL}?${params}`;
}

/**
 * Exchange authorization code for tokens for a specific service
 */
export async function exchangeCodeForTokens(
    code: string,
    verifier: string,
    state: string,
    service: 'claude' | 'qwen' = 'claude'
): Promise<ClaudeAuthTokens | QwenAuthTokens> {
    const config = service === 'qwen' ? QWEN_OAUTH_CONFIG : CLAUDE_OAUTH_CONFIG;

    const tokenResponse = await fetch(config.TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: config.REDIRECT_URI,
            client_id: config.CLIENT_ID,
            code_verifier: verifier,
            state: state,
        }),
    });

    if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${tokenResponse.statusText} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json() as any;

    if (service === 'claude') {
        return {
            raw: tokenData,
            token: tokenData.access_token,
            expires: Date.now() + tokenData.expires_in * 1000,
        } as ClaudeAuthTokens;
    } else {
        return {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            token_type: tokenData.token_type,
            expires_in: tokenData.expires_in,
            scope: tokenData.scope,
            id_token: tokenData.id_token,
        } as QwenAuthTokens;
    }
}

/**
 * Parse authorization code from callback URL
 */
export function parseCallbackUrl(url: string): { code?: string; state?: string; error?: string } {
    try {
        const urlObj = new URL(url);

        // Check if this is our callback URL
        if (!url.includes('localhost') || !urlObj.pathname.includes('/callback')) {
            return {};
        }

        const code = urlObj.searchParams.get('code');
        const state = urlObj.searchParams.get('state');
        const error = urlObj.searchParams.get('error');

        return {
            code: code || undefined,
            state: state || undefined,
            error: error || undefined,
        };
    } catch {
        return {};
    }
}