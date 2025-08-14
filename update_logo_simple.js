const fs = require('fs');
const path = require('path');

// Paths
const logoPath = path.join(__dirname, 'Billo_Logo.png');
const androidDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');
const webDir = path.join(__dirname, 'public');

// Check if the logo exists
if (!fs.existsSync(logoPath)) {
  console.error('❌ Logo file not found at:', logoPath);
  console.log('Please make sure Billo_Logo.png is in the project root directory');
  process.exit(1);
}

// Create directories if they don't exist
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

// Android launcher icon directories
const androidDirs = [
  'mipmap-mdpi',
  'mipmap-hdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi'
];

console.log('🚀 Starting logo update process...');

// 1. Copy logo to Android directories
console.log('\n📱 Copying logo to Android directories...');
try {
  for (const dir of androidDirs) {
    const targetDir = path.join(androidDir, dir);
    ensureDirectoryExists(targetDir);
    
    const targetFile = path.join(targetDir, 'ic_launcher.png');
    fs.copyFileSync(logoPath, targetFile);
    console.log(`✅ Copied to ${dir}/ic_launcher.png`);
    
    // Also create round version (just a copy for now)
    const roundTargetFile = path.join(targetDir, 'ic_launcher_round.png');
    fs.copyFileSync(logoPath, roundTargetFile);
    console.log(`✅ Created ${dir}/ic_launcher_round.png`);
  }
} catch (error) {
  console.error('❌ Error copying Android icons:', error.message);
}

// 2. Create favicon.ico
console.log('\n🌐 Creating favicon.ico...');
try {
  const faviconPath = path.join(webDir, 'favicon.ico');
  fs.copyFileSync(logoPath, faviconPath);
  console.log('✅ Created favicon.ico');
} catch (error) {
  console.error('❌ Error creating favicon.ico:', error.message);
}

// 3. Update index.html
console.log('\n📄 Updating index.html...');
try {
  const indexPath = path.join(webDir, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  
  // Update favicon link
  html = html.replace(
    /<link rel="icon" [^>]*>/,
    '<link rel="icon" type="image/x-icon" href="/favicon.ico">'
  );
  
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('✅ Updated index.html');
} catch (error) {
  console.error('❌ Error updating index.html:', error.message);
}

console.log('\n✨ Logo update complete!');
console.log('Note: For best results, please use a tool like ImageMagick to properly resize the images.');
console.log('You can download it from: https://imagemagick.org/script/download.php');
