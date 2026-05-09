// Dynamic Expo config — extends app.json with environment-variable-driven plugin config.
// This file takes precedence over app.json at build time.
// process.env.GOOGLE_MAPS_API_KEY is read from .env (never committed) at prebuild time
// and baked into the native project. It is NOT exposed to JS at runtime.
//
// Set `newArchEnabled: false` to work around a react-native-maps bug where custom
// View-based markers are invisible/flickering on Android with the New Architecture.
// Remove once https://github.com/react-native-maps/react-native-maps/issues/5877 is resolved.

const appJson = require('./app.json');

const existingPlugins = (appJson.expo.plugins || []).filter((p) => {
  const name = Array.isArray(p) ? p[0] : p;
  // We re-declare expo-location and react-native-maps below, so remove any old entries
  return name !== 'expo-location' && name !== 'react-native-maps';
});

module.exports = {
  expo: {
    ...appJson.expo,
    // Disable New Architecture until react-native-maps custom marker rendering is fixed
    newArchEnabled: false,
    ios: {
      ...appJson.expo.ios,
      infoPlist: {
        ...(appJson.expo.ios?.infoPlist || {}),
        NSLocationWhenInUseUsageDescription:
          'Cartographer needs your location to show nearby grocery stores.',
      },
    },
    android: {
      ...appJson.expo.android,
      permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
    },
    plugins: [
      ...existingPlugins,
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Allow Cartographer to use your location to find nearby stores.',
        },
      ],
      [
        'react-native-maps',
        {
          // Keys are read from .env at build time, never from EXPO_PUBLIC_ (would expose to JS bundle)
          iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
          androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
        },
      ],
    ],
  },
};
