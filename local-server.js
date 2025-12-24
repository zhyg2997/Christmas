
import express from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import ip from 'ip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Enable CORS
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '../public/uploads');
const DATA_DIR = path.join(__dirname, '../data');
fs.ensureDirSync(UPLOADS_DIR);
fs.ensureDirSync(DATA_DIR);

// Serve uploaded files
app.use('/uploads', express.static(UPLOADS_DIR));

// API: Get Upload URLs (Simulated)
app.post('/api/get-upload-urls', (req, res) => {
  const { imageCount } = req.body;
  const shareId = Math.random().toString(36).substring(2, 10);
  const uploadUrls = [];

  for (let i = 0; i < imageCount; i++) {
    const fileName = `${shareId}_${i}_${Date.now()}.jpg`;
    // The frontend will PUT to this local URL
    // We use a relative path so the proxy handles it, or absolute if needed
    uploadUrls.push({
      uploadUrl: `/api/upload-file/${fileName}`,
      publicUrl: `/uploads/${fileName}`
    });
  }

  res.json({ shareId, uploadUrls });
});

// API: Handle File Upload (PUT)
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

// API: Complete Upload (Save Metadata)
app.post('/api/complete-upload', (req, res) => {
  const { shareId, imageUrls } = req.body;
  const dataPath = path.join(DATA_DIR, `${shareId}.json`);
  
  const shareData = {
    images: imageUrls,
    createdAt: Date.now()
  };

  fs.writeJsonSync(dataPath, shareData);
  
  // Return the local share link
  // We need the local IP address for the link to work on other devices
  const localIp = ip.address();
  const shareLink = `https://${localIp}:3010/?share=${shareId}`;
  
  res.json({ success: true, shareLink });
});

// API: Get Share Data
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎄 Local Christmas Server running at http://0.0.0.0:${PORT}`);
  console.log(`📂 Uploads will be saved to: ${UPLOADS_DIR}`);
});
