// Use dynamic import to ensure the module is properly loaded
const _sodium = require('libsodium-wrappers');

console.log('[libsodium.lib.web] Loading libsodium-wrappers for web platform');
console.log('[libsodium.lib.web] Has ready:', 'ready' in _sodium);
console.log('[libsodium.lib.web] Has crypto_box_keypair:', 'crypto_box_keypair' in _sodium);

// Re-export the entire module to preserve all properties and constants
export default _sodium;