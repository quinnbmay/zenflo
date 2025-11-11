import { Platform } from 'react-native';

let sodium: any;

if (Platform.OS === 'web') {
    // Web platform - use libsodium-wrappers
    sodium = require('libsodium-wrappers');
    console.log('[libsodium.lib] Loading libsodium-wrappers for web');
} else {
    // Native platform - use react-native-libsodium
    sodium = require('@more-tech/react-native-libsodium').default;
    console.log('[libsodium.lib] Loading react-native-libsodium for native');
}

export default sodium;