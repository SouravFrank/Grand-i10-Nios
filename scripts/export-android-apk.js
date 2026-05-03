import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"),
);

const sourceApkPath = path.join(
  projectRoot,
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "release",
  "app-release.apk",
);
const targetDir = path.join(projectRoot, "dist", "android");
const targetApkPath = path.join(
  targetDir,
  `i10Nios V${packageJson.version}.apk`,
);

if (!fs.existsSync(sourceApkPath)) {
  console.error(`Release APK not found at ${sourceApkPath}`);
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(sourceApkPath, targetApkPath);

console.log(`APK exported to ${targetApkPath}`);
