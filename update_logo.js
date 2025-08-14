const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Ensure the logo file exists
const logoPath = path.join(__dirname, 'Billo_Logo.png');
if (!fs.existsSync(logoPath)) {
  console.error('Logo file not found at:', logoPath);
  process.exit(1);
}

// Android launcher icon sizes (in dp)
const androidSizes = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

// Web favicon sizes
const faviconSizes = [16, 32, 48, 64, 96, 128, 192, 256];

// Create output directories
const androidDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');
const webDir = path.join(__dirname, 'public');

// Create Android launcher icons
async function createAndroidIcons() {
  console.log('Creating Android launcher icons...');
  
  for (const { dir, size } of androidSizes) {
    const outputDir = path.join(androidDir, dir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, 'ic_launcher.png');
    const roundOutputPath = path.join(outputDir, 'ic_launcher_round.png');
    
    try {
      // Create square launcher icon
      await sharp(logoPath)
        .resize(size, size)
        .toFile(outputPath);
      
      // Create round launcher icon
      const roundedCorners = Buffer.from(
        `<svg><rect x="0" y="0" width="${size}" height="${size}" rx="${size / 2}" ry="${size / 2}"/></svg>`
      );
      
      await sharp(logoPath)
        .resize(size, size)
        .composite([{
          input: roundedCorners,
          blend: 'dest-in',
        }])
        .toFile(roundOutputPath);
      
      console.log(`Created ${dir}/ic_launcher.png and ic_launcher_round.png (${size}x${size}px)`);
    } catch (error) {
      console.error(`Error creating ${dir} icons:`, error);
    }
  }
}

// Create favicon.ico
async function createFavicon() {
  console.log('Creating favicon.ico...');
  const faviconPath = path.join(webDir, 'favicon.ico');
  
  try {
    await sharp(logoPath)
      .resize(64, 64)
      .toFile(faviconPath);
    
    console.log('Created favicon.ico');
  } catch (error) {
    console.error('Error creating favicon.ico:', error);
  }
}

// Create web manifest icons
async function createWebIcons() {
  console.log('Creating web manifest icons...');
  const manifestDir = path.join(webDir, 'icons');
  
  if (!fs.existsSync(manifestDir)) {
    fs.mkdirSync(manifestDir, { recursive: true });
  }
  
  for (const size of faviconSizes) {
    const outputPath = path.join(manifestDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(logoPath)
        .resize(size, size)
        .toFile(outputPath);
      
      console.log(`Created icons/icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`Error creating icon-${size}x${size}.png:`, error);
    }
  }
}

// Update index.html with new favicon
function updateHtml() {
  console.log('Updating index.html...');
  const indexPath = path.join(webDir, 'index.html');
  
  try {
    let html = fs.readFileSync(indexPath, 'utf8');
    
    // Update favicon link
    html = html.replace(
      /<link rel="icon" [^>]*>/,
      '<link rel="icon" type="image/png" href="/favicon.ico">'
    );
    
    // Add web app manifest
    if (!html.includes('manifest="site.webmanifest"')) {
      html = html.replace(
        '<head>',
        '<head>\n    <link rel="manifest" href="/site.webmanifest">'
      );
    }
    
    fs.writeFileSync(indexPath, html, 'utf8');
    console.log('Updated index.html');
  } catch (error) {
    console.error('Error updating index.html:', error);
  }
}

// Create web app manifest
function createWebManifest() {
  console.log('Creating web app manifest...');
  const manifestPath = path.join(webDir, 'site.webmanifest');
  
  const manifest = {
    name: 'Billo',
    short_name: 'Billo',
    description: 'Billo App',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: faviconSizes.map(size => ({
      src: `/icons/icon-${size}x${size}.png`,
      sizes: `${size}x${size}`,
      type: 'image/png',
      purpose: 'any maskable'
    }))
  };
  
  try {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log('Created site.webmanifest');
  } catch (error) {
    console.error('Error creating site.webmanifest:', error);
  }
}

// Run all functions
async function main() {
  try {
    await createAndroidIcons();
    await createFavicon();
    await createWebIcons();
    createWebManifest();
    updateHtml();
    
    console.log('\n✅ Logo update complete!');
    console.log('Please rebuild your Android app to see the changes.');
  } catch (error) {
    console.error('Error updating logos:', error);
    process.exit(1);
  }
}

main();
