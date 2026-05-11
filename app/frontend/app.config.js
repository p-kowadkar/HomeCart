// Dynamic Expo config — extends app.json with environment-variable-driven plugin config.
// process.env.GOOGLE_MAPS_API_KEY is read from .env (never committed) at prebuild time
// and baked into the native project. It is NOT exposed to JS at runtime.
//
// New Architecture is enabled as of 2026-05-11 — react-native-maps 1.27 fixed the
// custom view-marker rendering bug (formerly issue #5877). We rely on app.json's
// "newArchEnabled": true and no longer override it here.

const appJson = require('./app.json');

const existingPlugins = (appJson.expo.plugins || []).filter((p) => {
  const name = Array.isArray(p) ? p[0] : p;
  // We re-declare expo-location below, so remove any old entry
  return name !== 'expo-location';
});

module.exports = {
  expo: {
    ...appJson.expo,
    ios: {
      ...appJson.expo.ios,
      infoPlist: {
        ...(appJson.expo.ios?.infoPlist || {}),
        NSLocationWhenInUseUsageDescription:
          'HomeCart needs your location to show nearby grocery stores.',
      },
      config: {
        ...(appJson.expo.ios?.config || {}),
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
    android: {
      ...appJson.expo.android,
      permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
      config: {
        ...(appJson.expo.android?.config || {}),
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
    },
    plugins: [
      ...existingPlugins,
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Allow HomeCart to use your location to find nearby stores.',
        },
      ],
    ],
  },
};
