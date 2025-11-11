// This file is intentionally minimal - platform-specific implementations
// are in libsodium.lib.web.ts (for web) and uses @more-tech/react-native-libsodium (for native)
// Metro will automatically select .web.ts file for web builds due to platform resolution

import sodium from '@more-tech/react-native-libsodium';

export default sodium;
