// Use dynamic import to ensure the module is properly loaded
const _sodium = require('libsodium-wrappers');

// Re-export the entire module to preserve all properties and constants
export default _sodium;