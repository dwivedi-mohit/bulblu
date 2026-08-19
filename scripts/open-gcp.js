const { execSync } = require('child_process');

const PROJECT_ID = '403262111405';
const PACKAGE_NAME = 'com.bulblu.app';
const SHA1 = '5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25';
const URL = `https://console.cloud.google.com/apis/credentials/oauthclient?project=${PROJECT_ID}`;

console.log('\x1b[36m%s\x1b[0m', '================================================');
console.log('\x1b[36m%s\x1b[0m', '  OPENING GOOGLE CLOUD CONSOLE & COPYING SHA-1   ');
console.log('\x1b[36m%s\x1b[0m', '================================================\n');

// Copy SHA-1 to Windows Clipboard
try {
  execSync(`powershell -command "Set-Clipboard -Value '${SHA1}'"`);
  console.log('\x1b[32m%s\x1b[0m', `✔ Copied SHA-1 to Clipboard: ${SHA1}`);
} catch {
  console.log('\x1b[33m%s\x1b[0m', `ℹ SHA-1 Fingerprint: ${SHA1}`);
}

console.log('  Package Name: \x1b[33m' + PACKAGE_NAME + '\x1b[0m');
console.log('  Opening browser to: \x1b[4m' + URL + '\x1b[0m\n');

// Open Browser
try {
  execSync(`start "" "${URL}"`, { shell: true });
} catch {
  console.log('Please open the URL manually in your browser.');
}
