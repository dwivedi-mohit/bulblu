const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('\x1b[36m%s\x1b[0m', '================================================');
console.log('\x1b[36m%s\x1b[0m', '      BULBLU GOOGLE AUTH & APP VERIFY SCRIPT    ');
console.log('\x1b[36m%s\x1b[0m', '================================================\n');

// 1. Extract Keystore SHA-1
const keystorePath = path.join(__dirname, '..', 'android', 'app', 'debug.keystore');
if (fs.existsSync(keystorePath)) {
  try {
    const cmd = `keytool -list -v -keystore "${keystorePath}" -alias androiddebugkey -storepass android -keypass android`;
    const output = execSync(cmd, { encoding: 'utf8' });
    const sha1Match = output.match(/SHA1:\s+([A-FA-f0-9:]+)/);
    const sha256Match = output.match(/SHA256:\s+([A-FA-f0-9:]+)/);

    console.log('\x1b[32m%s\x1b[0m', '✔ Android Debug Keystore Fingerprints:');
    console.log('  Package Name: \x1b[33mcom.bulblu.app\x1b[0m');
    if (sha1Match) console.log('  SHA-1:        \x1b[33m' + sha1Match[1] + '\x1b[0m');
    if (sha256Match) console.log('  SHA-256:      \x1b[33m' + sha256Match[1] + '\x1b[0m');
    console.log('');
  } catch (e) {
    console.log('\x1b[31m%s\x1b[0m', '✖ Failed to read keystore fingerprint: ' + e.message);
  }
} else {
  console.log('\x1b[33m%s\x1b[0m', 'ℹ Keystore not found at default location.');
}

// 2. Read app.json config
const appJsonPath = path.join(__dirname, '..', 'app.json');
if (fs.existsSync(appJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  const extra = appJson?.expo?.extra;
  console.log('\x1b[32m%s\x1b[0m', '✔ App Configuration (app.json):');
  console.log('  Package Name:        \x1b[36m' + (appJson?.expo?.android?.package || 'Not set') + '\x1b[0m');
  console.log('  Google Web Client ID: \x1b[36m' + (extra?.googleWebClientId || 'Not set') + '\x1b[0m');
  console.log('  API URL:             \x1b[36m' + (extra?.apiUrl || 'Not set') + '\x1b[0m\n');
}

// 3. Google Cloud Console URL
console.log('\x1b[35m%s\x1b[0m', '📌 Action Required on Google Cloud Console:');
console.log('  1. Open: \x1b[4mhttps://console.cloud.google.com/apis/credentials\x1b[0m');
console.log('  2. Add Android Client ID with Package Name: \x1b[33mcom.bulblu.app\x1b[0m');
console.log('  3. Paste SHA-1: \x1b[33m5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25\x1b[0m\n');

// 4. Verify Frontend TypeScript
console.log('\x1b[34m%s\x1b[0m', '⏳ Running TypeScript check...');
try {
  execSync('npx tsc --noEmit', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  console.log('\x1b[32m%s\x1b[0m', '✔ Frontend TypeScript compilation clean (0 errors).\n');
} catch (e) {
  console.log('\x1b[31m%s\x1b[0m', '✖ TypeScript check failed.\n');
}

console.log('\x1b[36m%s\x1b[0m', '================================================');
console.log('\x1b[36m%s\x1b[0m', '              ALL CHECKS COMPLETE               ');
console.log('\x1b[36m%s\x1b[0m', '================================================');
