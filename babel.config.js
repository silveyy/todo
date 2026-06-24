module.exports = function (api) {
  api.cache(true);
  const plugins = [];

  try {
    require.resolve('babel-plugin-module-resolver');
    plugins.push([
      'module-resolver',
      {
        root: ['./src'],
        alias: { '@': './src' },
      },
    ]);
  } catch (error) {
    // Alias resolution is covered by TypeScript and Jest config when the Babel plugin isn't installed.
  }

  plugins.push('react-native-reanimated/plugin');

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
