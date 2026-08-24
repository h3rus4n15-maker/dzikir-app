const fs = require('fs');
const path = require('path');
const https = require('https');

const ICONS_DIR = path.join(__dirname, 'icons');
const AUDIO_DIR = path.join(__dirname, 'audio');
const INDEX_FILE = path.join(__dirname, 'index.html');

// Create icons directory if not exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR);
  console.log('Created directory:', ICONS_DIR);
}

if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR);
  console.log('Created directory:', AUDIO_DIR);
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

    const request = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume();
        file.close(() => fs.unlink(dest, () => {}));
        downloadFile(new URL(response.headers.location, url).toString(), dest)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        file.close(() => fs.unlink(dest, () => {}));
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${path.basename(dest)}`);
        resolve();
      });
    });

    request.on('error', (err) => {
      file.close(() => fs.unlink(dest, () => {}));
      reject(err);
    });
  });
}

function getAudioAssets() {
  const html = fs.readFileSync(INDEX_FILE, 'utf8');
  const assets = [];
  const pattern = /id:\s*["']([^"']+)["'][\s\S]*?audio:\s*["']([^"']+)["']/g;
  let match;

  while ((match = pattern.exec(html)) !== null) {
    assets.push({
      url: match[2],
      dest: path.join(AUDIO_DIR, `${match[1]}.mp3`)
    });
  }

  return assets;
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

  console.log('Downloading audio referenced by index.html...');
  for (const asset of getAudioAssets()) {
    try {
      await downloadFile(asset.url, asset.dest);
    } catch (err) {
      console.error(`Audio unavailable (${path.basename(asset.dest)}):`, err.message);
    }
  }

  console.log('Asset downloads complete.');
}

run();
