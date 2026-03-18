import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { put } from '@vercel/blob';

// 1. Grab the token from the terminal environment
const token = process.env.BLOB_READ_WRITE_TOKEN;

if (!token) {
  console.error("Error: BLOB_READ_WRITE_TOKEN is not set in your terminal.");
  process.exit(1);
}

// 2. Point to the resources/images directory
const imagesDir = path.join(process.cwd(), 'resources', 'images');

async function processAndUpload() {
  try {
    const files = fs.readdirSync(imagesDir);
    // Filter out anything that isn't a standard image file
    const imageFiles = files.filter(file => file.match(/\.(png|jpg|jpeg)$/i));

    if (imageFiles.length === 0) {
      console.log("No images found in resources/images/");
      return;
    }

    console.log("File | Original (KB) | Compressed (KB) | Blob URL");
    console.log("-------------------------------------------------------");

    let sqlStatements = "-- Generated SQL UPDATE statements:\n";

    // 3. Loop through and process each image
    for (const file of imageFiles) {
      const filePath = path.join(imagesDir, file);
      const originalBuffer = fs.readFileSync(filePath);
      const originalSizeKB = (originalBuffer.length / 1024).toFixed(2);

      // Create a web-safe filename (e.g., "Ada Lovelace.png" -> "ada_lovelace.webp")
      const baseName = file.split('.')[0];
      const webpFilename = baseName.toLowerCase().replace(/ /g, '_') + '.webp';

      // Compress and resize using sharp
      const compressedBuffer = await sharp(originalBuffer)
        .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      
      const compressedSizeKB = (compressedBuffer.length / 1024).toFixed(2);

      // 4. Upload to Vercel Blob
      const blob = await put(`avatars/${webpFilename}`, compressedBuffer, {
        access: 'public',
        token: token
      });

      console.log(`${file} | ${originalSizeKB} | ${compressedSizeKB} | ${blob.url}`);

      // Generate the SQL statement for this specific file
      sqlStatements += `UPDATE profiles SET picture = '${blob.url}' WHERE picture LIKE '%${file}';\n`;
    }

    console.log("\n================ SQL STATEMENTS ================\n");
    console.log(sqlStatements);

  } catch (error) {
    console.error("An error occurred during the upload process:", error);
  }
}

processAndUpload();