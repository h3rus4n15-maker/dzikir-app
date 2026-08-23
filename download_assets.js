const fs = require('fs');
const path = require('path');
const https = require('https');

const ICONS_DIR = path.join(__dirname, 'icons');

// Create icons directory if not exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR);
  console.log('Created directory:', ICONS_DIR);
}

const assets = [
  {
    url: 'https://img.icons8.com/color/192/mosque.png',
    dest: path.join(ICONS_DIR, 'icon-192.png')
  },
  {
    url: 'https://img.icons8.com/color/512/mosque.png',
    dest: path.join(ICONS_DIR, 'icon-512.png')
  }
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${path.basename(dest)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {}); // Delete local file on error
      reject(err);
    });
  });
}

async function run() {
  console.log('Downloading PWA Icons...');
  for (const asset of assets) {
    try {
      await downloadFile(asset.url, asset.dest);
    } catch (err) {
      console.error(`Error downloading ${path.basename(asset.dest)}:`, err.message);
      console.log('Trying fallback image...');
      // Fallback url
      const fallbackUrl = asset.url.replace('/color/', '/flat/');
      try {
        await downloadFile(fallbackUrl, asset.dest);
      } catch (e) {
        console.error('Fallback failed. Please manually put icon files.');
      }
    }
  }
  console.log('Asset downloads complete.');
}

run();
