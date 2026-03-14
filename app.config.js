const appJson = require('./app.json');
const packageJson = require('./package.json');

function getAndroidVersionCode(version) {
  const [major = '0', minor = '0', patch = '0'] = String(version).split('.');
  return Number(major) * 10000 + Number(minor) * 100 + Number(patch);
}

module.exports = () => {
  const baseConfig = appJson.expo;
  const version = packageJson.version;

  return {
    ...baseConfig,
    version,
    ios: {
      ...(baseConfig.ios ?? {}),
      buildNumber: version,
    },
    android: {
      ...(baseConfig.android ?? {}),
      versionCode: getAndroidVersionCode(version),
    },
    extra: {
      ...(baseConfig.extra ?? {}),
      appVersion: version,
      firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      firebaseDatabaseUrl: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
      syncDebug: process.env.EXPO_PUBLIC_SYNC_DEBUG,
    },
  };
};
