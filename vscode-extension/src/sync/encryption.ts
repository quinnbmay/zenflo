import * as nacl from 'tweetnacl';
import { decodeBase64, encodeBase64 } from 'tweetnacl-util';

export class Encryption {
    private publicKey: Uint8Array;
    private machineKey: Uint8Array;

    constructor(publicKeyBase64: string, machineKeyBase64: string) {
        this.publicKey = decodeBase64(publicKeyBase64);
        this.machineKey = decodeBase64(machineKeyBase64);
    }

    /**
     * Decrypt an encryption key encrypted with the public key
     * Format: version byte (1) + ephemeral public key (32) + nonce (24) + ciphertext
     */
    async decryptEncryptionKey(encryptedKeyBase64: string): Promise<Uint8Array | null> {
        try {
            const encrypted = decodeBase64(encryptedKeyBase64);

            // Check version byte (should be 0)
            if (encrypted[0] !== 0) {
                console.error('Invalid encryption key version:', encrypted[0]);
                return null;
            }

            // Extract components from bundle (skip version byte)
            const encryptedBundle = encrypted.slice(1);

            // Extract ephemeral public key (32 bytes)
            const ephemeralPublicKey = encryptedBundle.slice(0, nacl.box.publicKeyLength);

            // Extract nonce (24 bytes)
            const nonce = encryptedBundle.slice(
                nacl.box.publicKeyLength,
                nacl.box.publicKeyLength + nacl.box.nonceLength
            );

            // Extract ciphertext (remaining bytes)
            const ciphertext = encryptedBundle.slice(
                nacl.box.publicKeyLength + nacl.box.nonceLength
            );

            // Decrypt using box_open with ephemeral public key and our machine private key
            const decrypted = nacl.box.open(ciphertext, nonce, ephemeralPublicKey, this.machineKey);

            if (!decrypted) {
                console.error('Failed to decrypt encryption key');
                return null;
            }

            return decrypted;
        } catch (error) {
            console.error('Error decrypting encryption key:', error);
            return null;
        }
    }

    /**
     * Decrypt message content using session encryption key
     */
    async decryptMessage(encryptedContentBase64: string, sessionKey: Uint8Array): Promise<string | null> {
        try {
            const encrypted = decodeBase64(encryptedContentBase64);

            // Extract nonce (first 24 bytes) and ciphertext (remaining bytes)
            const nonce = encrypted.slice(0, nacl.secretbox.nonceLength);
            const ciphertext = encrypted.slice(nacl.secretbox.nonceLength);

            // Decrypt using secretbox with session key
            const decrypted = nacl.secretbox.open(ciphertext, nonce, sessionKey);

            if (!decrypted) {
                console.error('Failed to decrypt message content');
                return null;
            }

            // Convert bytes to string (UTF-8)
            return new TextDecoder().decode(decrypted);
        } catch (error) {
            console.error('Error decrypting message:', error);
            return null;
        }
    }

    /**
     * Encrypt message content using session encryption key
     */
    async encryptMessage(content: string, sessionKey: Uint8Array): Promise<string> {
        // Generate random nonce
        const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);

        // Convert string to bytes
        const messageBytes = new TextEncoder().encode(content);

        // Encrypt using secretbox
        const encrypted = nacl.secretbox(messageBytes, nonce, sessionKey);

        // Concatenate nonce + ciphertext
        const result = new Uint8Array(nonce.length + encrypted.length);
        result.set(nonce);
        result.set(encrypted, nonce.length);

        return encodeBase64(result);
    }
}
