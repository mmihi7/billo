const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// Android launcher icon sizes (in dp)
const androidSizes = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

// Create Android launcher icons
function createAndroidIcons() {
  console.log('\n🔄 Creating Android launcher icons...');
  
  for (const { dir, size } of androidSizes) {
    const outputDir = path.join(androidDir, dir);
    ensureDirectoryExists(outputDir);
    
    const outputPath = path.join(outputDir, 'ic_launcher.png');
    const roundOutputPath = path.join(outputDir, 'ic_launcher_round.png');
    
    try {
      // Create square launcher icon (using native Windows commands as fallback)
      execSync(`magick convert "${logoPath}" -resize ${size}x${size} "${outputPath}"`);
      
      // Create round launcher icon
      execSync(`magick convert "${logoPath}" -resize ${size}x${size} \( +clone -threshold -1 -negate -fill white -draw "circle ${size/2},${size/2} ${size/2},0" \) -alpha off -compose copy_opacity -composite "${roundOutputPath}"`);
      
      console.log(`✅ Created ${dir}/ic_launcher.png and ic_launcher_round.png (${size}x${size}px)`);
    } catch (error) {
      console.error(`❌ Error creating ${dir} icons:`, error.message);
      console.log('Make sure ImageMagick is installed and added to your PATH');
      console.log('Download from: https://imagemagick.org/script/download.php');
      process.exit(1);
    }
  }
}

// Create favicon.ico
function createFavicon() {
  console.log('\n🔄 Creating favicon.ico...');
  const faviconPath = path.join(webDir, 'favicon.ico');
  
  try {
    // Create a simple favicon using ImageMagick
    execSync(`magick convert "${logoPath}" -resize 64x64 -define icon:auto-resize=64,48,32,24,16 "${faviconPath}"`);
    console.log('✅ Created favicon.ico');
  } catch (error) {
    console.error('❌ Error creating favicon.ico:', error.message);
  }
}

// Update index.html with new favicon
function updateHtml() {
  console.log('\n🔄 Updating index.html...');
  const indexPath = path.join(webDir, 'index.html');
  
  try {
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
}

// Main function
function main() {
  console.log('🚀 Starting logo update process...');
  
  try {
    // Check if ImageMagick is installed
    execSync('magick -version');
    
    createAndroidIcons();
    createFavicon();
    updateHtml();
    
    console.log('\n✨ Logo update complete!');
    console.log('Please rebuild your Android app to see the changes.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n🔧 Requirements:');
    console.log('1. Install ImageMagick from: https://imagemagick.org/script/download.php');
    console.log('2. Make sure to select "Add to PATH" during installation');
    console.log('3. Restart your terminal after installation');
    process.exit(1);
  }
}

// Run the script
main();
