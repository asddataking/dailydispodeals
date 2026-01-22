const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertImage() {
  const inputPath = path.join(__dirname, '../public/lake.jpg');
  const outputPath = path.join(__dirname, '../public/lake.webp');

  try {
    await sharp(inputPath)
      .webp({ quality: 85 })
      .toFile(outputPath);
    
    console.log('✅ Successfully converted lake.jpg to lake.webp');
    
    // Get file sizes for comparison
    const originalSize = fs.statSync(inputPath).size;
    const webpSize = fs.statSync(outputPath).size;
    const savings = ((1 - webpSize / originalSize) * 100).toFixed(1);
    
    console.log(`📊 Original: ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`📊 WebP: ${(webpSize / 1024).toFixed(2)} KB`);
    console.log(`💾 Savings: ${savings}%`);
  } catch (error) {
    console.error('❌ Error converting image:', error);
    process.exit(1);
  }
}

convertImage();
