const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);

// Directories to process
const directoriesToProcess = [
  path.join(__dirname, 'src')
];

// File extensions to process
const fileExtensions = ['.js', '.jsx', '.ts', '.tsx', '.json'];

// Mappings for the replacements
const replacements = {
  // Exact case-sensitive replacements
  'Table': 'Tab',
  'table': 'tab',
  'TABLE': 'TAB',
  // Common variable/function name patterns
  'tableNumber': 'tabNumber',
  'tableId': 'tabId',
  'tableNumber': 'tabNumber',
  'tableStatus': 'tabStatus',
  'tableName': 'tabName',
  'tableType': 'tabType',
  'tableData': 'tabData',
  'tableList': 'tabList',
  'tableInfo': 'tabInfo',
  'tableDetails': 'tabDetails',
  'tableSelection': 'tabSelection',
  'tableRow': 'tabRow',
  'tableCell': 'tabCell',
  'tableHeader': 'tabHeader',
  'tableBody': 'tabBody',
  'tableFooter': 'tabFooter',
  'tableCaption': 'tabCaption',
  // Component names
  'TableTabsView': 'TabView',
  'TableNumberInput': 'TabNumberInput',
  // File names (will be handled separately)
  'table-tabs-view': 'tab-view',
  'table-number-input': 'tab-number-input',
  // UI components (keep these as they are UI elements, not business logic)
  // 'Table': 'Table',
  // 'TableHeader': 'TableHeader',
  // 'TableBody': 'TableBody',
  // 'TableFooter': 'TableFooter',
  // 'TableHead': 'TableHead',
  // 'TableRow': 'TableRow',
  // 'TableCell': 'TableCell',
  // 'TableCaption': 'TableCaption',
};

// Files to exclude
const excludedFiles = [
  // UI component files
  path.join('src', 'components', 'ui', 'table.jsx'),
  // Node modules
  path.join('node_modules'),
  // Build directories
  path.join('build'),
  path.join('dist'),
  path.join('.next')
];

// Check if file should be processed
function shouldProcessFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return fileExtensions.includes(ext) && 
         !excludedFiles.some(excluded => filePath.includes(excluded));
}

// Process a single file
async function processFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    let updatedContent = content;
    
    // Apply replacements
    for (const [search, replace] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${search}\\b`, 'g');
      updatedContent = updatedContent.replace(regex, replace);
    }
    
    // Only write if changes were made
    if (updatedContent !== content) {
      await writeFile(filePath, updatedContent, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Recursively process a directory
async function processDirectory(directory) {
  try {
    const files = await readdir(directory);
    let updatedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      const fileStat = await stat(filePath);
      
      if (fileStat.isDirectory()) {
        updatedCount += await processDirectory(filePath);
      } else if (shouldProcessFile(filePath)) {
        const wasUpdated = await processFile(filePath);
        if (wasUpdated) updatedCount++;
      }
    }
    
    return updatedCount;
  } catch (error) {
    console.error(`❌ Error reading directory ${directory}:`, error.message);
    return 0;
  }
}

// Main function
async function main() {
  console.log('🚀 Starting to update Table to Tab in codebase...');
  
  let totalUpdated = 0;
  for (const dir of directoriesToProcess) {
    console.log(`\n📂 Processing directory: ${dir}`);
    const updated = await processDirectory(dir);
    totalUpdated += updated;
    console.log(`   Updated ${updated} files`);
  }
  
  console.log('\n✨ Update complete!');
  console.log(`✅ Total files updated: ${totalUpdated}`);
  console.log('\nNote: You may need to manually update the following:');
  console.log('1. Component file names (e.g., TableTabsView.jsx -> TabView.jsx)');
  console.log('2. Any database schema or API endpoints that reference "table"');
  console.log('3. Any hardcoded strings in your translation files');
  console.log('4. Any documentation or comments that reference the old terminology');
}

// Run the script
main().catch(console.error);
