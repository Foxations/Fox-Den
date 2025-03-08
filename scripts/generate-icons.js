/**
 * FoxDen Icon Generator
 * 
 * This script generates placeholder icon files for the application.
 * It creates simple orange square icons with "FD" text in different sizes.
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Make sure we're in the right directory
const rootDir = path.resolve(__dirname, '..');
const pngDir = path.join(rootDir, 'src/assets/icons/png');

// Ensure the directory exists
if (!fs.existsSync(pngDir)) {
  fs.mkdirSync(pngDir, { recursive: true });
}

// Function to generate a simple icon
function generateIcon(size, outputPath) {
  console.log(`Generating ${size}x${size} icon...`);
  
  // Create canvas with the specified size
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Draw background (orange square)
  ctx.fillStyle = '#FF7518'; // FoxDen orange
  ctx.fillRect(0, 0, size, size);
  
  // Draw text "FD" in white
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${size * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FD', size / 2, size / 2);
  
  // Save to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  
  console.log(`Created: ${outputPath}`);
}

// Generate icons in various sizes
const sizes = [16, 32, 64, 128, 256];

try {
  console.log('Generating PNG icons...');
  
  sizes.forEach(size => {
    const outputPath = path.join(pngDir, `${size}x${size}.png`);
    generateIcon(size, outputPath);
  });
  
  console.log('Icon generation complete!');
} catch (error) {
  console.error('Error generating icons:', error);
  
  // If canvas package isn't installed, provide instructions
  if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('canvas')) {
    console.log('\nThe canvas package is required for icon generation.');
    console.log('You can install it with: npm install canvas');
    console.log('Or you can manually create icons and place them in src/assets/icons/png/');
  }
}