const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Configure asset resolution to handle @ alias properly
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // Handle @/ alias for assets
    if (moduleName.startsWith('@/')) {
      const sourcesPath = path.join(__dirname, 'sources', moduleName.slice(2));
      return context.resolveRequest(context, sourcesPath, platform);
    }
    // Fall back to default resolver
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;