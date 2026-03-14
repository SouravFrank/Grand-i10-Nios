const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const packageJson = require(path.join(projectRoot, 'package.json'));

const sourceApkPath = path.join(
  projectRoot,
  'android',
  'app',
  'build',
  'outputs',
  'apk',
  'release',
  'app-release.apk',
);
const targetDir = path.join(projectRoot, 'dist', 'android');
const targetApkPath = path.join(targetDir, `i10Nios V${packageJson.version}.apk`);

if (!fs.existsSync(sourceApkPath)) {
  console.error(`Release APK not found at ${sourceApkPath}`);
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(sourceApkPath, targetApkPath);

console.log(`APK exported to ${targetApkPath}`);
