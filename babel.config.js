module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // React Native Reanimated plugin must be listed last
      [
        'react-native-reanimated/plugin',
        {
          strict: false, // Disable strict mode warnings for Reanimated 3.x
        },
      ],
    ],
  };
};
