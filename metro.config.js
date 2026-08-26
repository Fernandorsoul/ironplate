// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Resolve .wasm files for web platform
config.resolver.assetExts.push('wasm');

// Platform-specific module resolution
config.resolver.platforms = ['native', 'web'];

module.exports = config;
