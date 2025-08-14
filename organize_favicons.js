const fs = require('fs');
const path = require('path');

// Source and destination paths
const srcDir = path.join(__dirname, 'assets', 'logo');
const publicDir = path.join(__dirname, 'public');
const androidResDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

// Create directories if they don't exist
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

// Copy file with error handling
function copyFileWithLog(source, destination) {
  try {
    fs.copyFileSync(source, destination);
    console.log(`✅ Copied ${path.basename(source)} to ${path.relative(process.cwd(), destination)}`);
    return true;
  } catch (error) {
    console.error(`❌ Error copying ${path.basename(source)}:`, error.message);
    return false;
  }
}

console.log('🚀 Starting favicon organization...');

// 1. Copy favicon.ico to public folder
const faviconSource = path.join(srcDir, 'favicon.ico');
const faviconDest = path.join(publicDir, 'favicon.ico');
copyFileWithLog(faviconSource, faviconDest);

// 2. Copy web manifest and other web-related files
const webFiles = [
  'browserconfig.xml',
  'manifest.json',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'favicon-96x96.png',
  'apple-icon-*.png',
  'ms-icon-*.png'
];

webFiles.forEach(file => {
  const source = path.join(srcDir, file);
  const destination = path.join(publicDir, path.basename(file));
  if (fs.existsSync(source)) {
    copyFileWithLog(source, destination);
  } else if (file.includes('*')) {
    // Handle wildcard patterns
    const pattern = file.replace('*', '');
    const files = fs.readdirSync(srcDir).filter(f => f.includes(pattern));
    files.forEach(f => {
      copyFileWithLog(
        path.join(srcDir, f),
        path.join(publicDir, f)
      );
    });
  }
});

// 3. Copy Android icons to their respective mipmap folders
const androidIcons = [
  { src: 'android-icon-36x36.png', dest: 'mipmap-ldpi/ic_launcher.png' },
  { src: 'android-icon-48x48.png', dest: 'mipmap-mdpi/ic_launcher.png' },
  { src: 'android-icon-72x72.png', dest: 'mipmap-hdpi/ic_launcher.png' },
  { src: 'android-icon-96x96.png', dest: 'mipmap-xhdpi/ic_launcher.png' },
  { src: 'android-icon-144x144.png', dest: 'mipmap-xxhdpi/ic_launcher.png' },
  { src: 'android-icon-192x192.png', dest: 'mipmap-xxxhdpi/ic_launcher.png' }
];

androidIcons.forEach(({ src, dest }) => {
  const source = path.join(srcDir, src);
  const destination = path.join(androidResDir, dest);
  
  // Create destination directory if it doesn't exist
  const destDir = path.dirname(destination);
  ensureDirectoryExists(destDir);
  
  if (fs.existsSync(source)) {
    copyFileWithLog(source, destination);
  }
});

// 4. Create round versions of Android launcher icons
const roundAndroidIcons = [
  { src: 'android-icon-36x36.png', dest: 'mipmap-ldpi/ic_launcher_round.png' },
  { src: 'android-icon-48x48.png', dest: 'mipmap-mdpi/ic_launcher_round.png' },
  { src: 'android-icon-72x72.png', dest: 'mipmap-hdpi/ic_launcher_round.png' },
  { src: 'android-icon-96x96.png', dest: 'mipmap-xhdpi/ic_launcher_round.png' },
  { src: 'android-icon-144x144.png', dest: 'mipmap-xxhdpi/ic_launcher_round.png' },
  { src: 'android-icon-192x192.png', dest: 'mipmap-xxxhdpi/ic_launcher_round.png' }
];

roundAndroidIcons.forEach(({ src, dest }) => {
  const source = path.join(srcDir, src);
  const destination = path.join(androidResDir, dest);
  
  // Create destination directory if it doesn't exist
  const destDir = path.dirname(destination);
  ensureDirectoryExists(destDir);
  
  if (fs.existsSync(source)) {
    // For now, just copy the same file (in a real app, you'd create a rounded version)
    copyFileWithLog(source, destination);
  }
});

console.log('\n✨ Favicon organization complete!');
console.log('Please update your index.html to reference the new favicon files in the public folder.');
