const path = require('path');
const { getConfig } = require('react-native-builder-bob/babel-config');
const pkg = require('../../packages/react-native-nitro-hinge/package.json');

const root = path.resolve(__dirname, '../../packages/react-native-nitro-hinge');

module.exports = getConfig(
  {
    presets: ['module:@react-native/babel-preset'],
    plugins: ['react-native-worklets/plugin'],
  },
  { root, pkg }
);
