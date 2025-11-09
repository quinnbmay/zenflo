/**
 * Generate JWT token from Happy secret key
 *
 * This script implements Happy's challenge-response authentication
 * to generate a JWT Bearer token from the secret key.
 */

import axios from 'axios';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

// Base32 alphabet (RFC 4648) - same as Happy uses
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Parse Happy secret key format (dashed groups, Base32 encoded)
 * Example: CAFMM-EUGKP-WZ3B5-F7D5U-J6K7E-XSVBI-3MZVQ-3G2TN-XCQUM-MJ2K6-OQ
 */
function parseSecretKey(secretStr: string): Uint8Array {
  // Normalize: uppercase, fix common typos, remove non-base32
  let normalized = secretStr.toUpperCase()
    .replace(/0/g, 'O')  // Zero to O
    .replace(/1/g, 'I')  // One to I
    .replace(/8/g, 'B')  // Eight to B
    .replace(/9/g, 'G'); // Nine to G

  // Remove dashes and spaces
  const cleaned = normalized.replace(/[^A-Z2-7]/g, '');

  if (cleaned.length === 0) {
    throw new Error('No valid Base32 characters found');
  }

  // Decode from Base32
  const bytes: number[] = [];
  let buffer = 0;
  let bufferLength = 0;

  for (const char of cleaned) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) {
      throw new Error(`Invalid Base32 character: ${char}`);
    }

    buffer = (buffer << 5) | value;
    bufferLength += 5;

    if (bufferLength >= 8) {
      bufferLength -= 8;
      bytes.push((buffer >> bufferLength) & 0xff);
    }
  }

  const result = new Uint8Array(bytes);

  if (result.length !== 32) {
    throw new Error(`Invalid key length: expected 32 bytes, got ${result.length}`);
  }

  return result;
}

/**
 * Generate JWT token using Happy's challenge-response auth
 */
async function generateToken(secretStr: string, serverUrl: string = 'https://happy.combinedmemory.com'): Promise<string> {
  // Parse secret key
  console.log('Parsing secret key...');
  const secret = parseSecretKey(secretStr);
  console.log(`Secret parsed: ${secret.length} bytes`);

  // Generate Ed25519 keypair from secret
  console.log('Generating Ed25519 keypair...');
  console.log('nacl.sign:', nacl.sign);
  const keypair = nacl.sign.keyPair.fromSeed(secret);
  console.log('Keypair generated successfully');

  // Generate random challenge (32 bytes)
  const challenge = nacl.randomBytes(32);

  // Sign the challenge
  const signature = nacl.sign.detached(challenge, keypair.secretKey);

  // Convert to base64 for API
  const challengeB64 = naclUtil.encodeBase64(challenge);
  const signatureB64 = naclUtil.encodeBase64(signature);
  const publicKeyB64 = naclUtil.encodeBase64(keypair.publicKey);

  console.log('Requesting token from Happy backend...');
  console.log(`Server: ${serverUrl}`);
  console.log(`Public Key: ${publicKeyB64.substring(0, 20)}...`);

  // Request token from backend
  const response = await axios.post(`${serverUrl}/v1/auth`, {
    challenge: challengeB64,
    signature: signatureB64,
    publicKey: publicKeyB64,
  });

  return response.data.token;
}

// CLI interface
const secretStr = process.argv[2] || process.env.HAPPY_SECRET;
const serverUrl = process.argv[3] || process.env.HAPPY_SERVER_URL || 'https://happy.combinedmemory.com';

if (!secretStr) {
  console.error('Usage: tsx generateToken.ts <SECRET_KEY> [SERVER_URL]');
  console.error('   or: HAPPY_SECRET=... tsx generateToken.ts');
  process.exit(1);
}

generateToken(secretStr, serverUrl)
  .then((token) => {
    console.log('\n✅ Token generated successfully!');
    console.log('\nJWT Token:');
    console.log(token);
    console.log('\nAdd to your .mcp.json:');
    console.log(`"HAPPY_AUTH_TOKEN": "${token}"`);
  })
  .catch((error) => {
    console.error('\n❌ Failed to generate token:');
    console.error(error.response?.data || error.message);
    process.exit(1);
  });

export { generateToken, parseSecretKey };
