
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));

// Storage Configuration
// Zeabur allows mounting volumes. We will store data there.
// Default to local 'data' folder if env not set.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Ensure directories exist
fs.ensureDirSync(UPLOADS_DIR);

console.log(`📂 Storage Directory: ${DATA_DIR}`);

// 1. Serve Uploaded Images
app.use('/uploads', express.static(UPLOADS_DIR));

// 2. API Routes
app.post('/api/get-upload-urls', (req, res) => {
  const { imageCount } = req.body;
  const shareId = Math.random().toString(36).substring(2, 10);
  const uploadUrls = [];

  for (let i = 0; i < imageCount; i++) {
    const fileName = `${shareId}_${i}_${Date.now()}.jpg`;
    // Return relative URL. The browser will prepend the current domain.
    uploadUrls.push({
      uploadUrl: `/api/upload-file/${fileName}`,
      publicUrl: `/uploads/${fileName}`
    });
  }

  res.json({ shareId, uploadUrls });
});

app.put('/api/upload-file/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(UPLOADS_DIR, filename);
  
  const writeStream = fs.createWriteStream(filePath);
  req.pipe(writeStream);

  writeStream.on('finish', () => {
    res.status(200).json({ success: true });
  });

  writeStream.on('error', (err) => {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  });
});

app.post('/api/complete-upload', (req, res) => {
  const { shareId, imageUrls } = req.body;
  const dataPath = path.join(DATA_DIR, `${shareId}.json`);
  
  const shareData = {
    images: imageUrls,
    createdAt: Date.now()
  };

  fs.writeJsonSync(dataPath, shareData);
  
  // For production, we return the relative path
  const shareLink = `/?share=${shareId}`;
  
  res.json({ success: true, shareLink });
});

app.get('/api/share', (req, res) => {
  const { id } = req.query;
  const dataPath = path.join(DATA_DIR, `${id}.json`);

  if (fs.existsSync(dataPath)) {
    const data = fs.readJsonSync(dataPath);
    res.json({ success: true, images: data.images });
  } else {
    res.status(404).json({ error: 'Share not found' });
  }
});

// 3. Serve React App (Static Files)
const DIST_DIR = path.join(__dirname, 'dist');

// Check if dist exists (it should after build)
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  
  // Handle SPA routing - return index.html for any unknown route
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
} else {
  console.warn('⚠️ "dist" directory not found. Make sure to run "npm run build" first.');
  app.get('/', (req, res) => {
    res.send('App is building... please wait or check logs.');
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
