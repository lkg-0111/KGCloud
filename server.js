const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
const UPLOAD_KEY = 'kgnb';
const DATA_FILE = path.join(__dirname, 'data', 'files.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Ensure directories exist
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(path.dirname(DATA_FILE))) fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 500 } // 500MB
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve root-level index.html (moved outside public/)
app.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.use('/uploads', express.static(UPLOAD_DIR));

// ---- Helpers ----

function loadFiles() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch { return []; }
}

function saveFiles(files) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(files, null, 2));
}

// ---- API Routes ----

// Upload file
app.post('/api/upload', (req, res, next) => {
  const key = req.headers['x-upload-key'] || req.query.key;
  if (key !== UPLOAD_KEY) {
    return res.status(403).json({ error: '密钥错误！请输入正确的上传密钥 (kgnb)' });
  }
  next();
}, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请选择文件' });

  const files = loadFiles();
  const fileInfo = {
    id: uuidv4(),
    originalName: req.file.originalname,
    storedName: req.file.filename,
    size: req.file.size,
    mimeType: req.file.mimetype,
    tags: [],
    description: '',
    uploadDate: new Date().toISOString()
  };

  // Parse tags from request
  if (req.body.tags) {
    try {
      fileInfo.tags = typeof req.body.tags === 'string'
        ? JSON.parse(req.body.tags)
        : req.body.tags;
    } catch {
      fileInfo.tags = req.body.tags.split(',').map(t => t.trim()).filter(Boolean);
    }
  }

  if (req.body.description) {
    fileInfo.description = req.body.description;
  }

  files.push(fileInfo);
  saveFiles(files);

  res.json({ success: true, file: fileInfo });
});

// List all files
app.get('/api/files', (req, res) => {
  const files = loadFiles();
  const tag = req.query.tag;
  const search = req.query.search?.toLowerCase();

  let filtered = files;
  if (tag) {
    filtered = filtered.filter(f => f.tags.includes(tag));
  }
  if (search) {
    filtered = filtered.filter(f =>
      f.originalName.toLowerCase().includes(search) ||
      f.description.toLowerCase().includes(search) ||
      f.tags.some(t => t.toLowerCase().includes(search))
    );
  }

  // Sort by upload date descending
  filtered.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

  res.json({ files: filtered });
});

// Get single file metadata
app.get('/api/files/:id', (req, res) => {
  const files = loadFiles();
  const file = files.find(f => f.id === req.params.id);
  if (!file) return res.status(404).json({ error: '文件不存在' });
  res.json({ file });
});

// Update file (tags, description)
app.put('/api/files/:id', (req, res) => {
  const key = req.headers['x-upload-key'] || req.query.key;
  if (key !== UPLOAD_KEY) {
    return res.status(403).json({ error: '密钥错误' });
  }

  const files = loadFiles();
  const idx = files.findIndex(f => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '文件不存在' });

  if (req.body.tags !== undefined) files[idx].tags = req.body.tags;
  if (req.body.description !== undefined) files[idx].description = req.body.description;

  saveFiles(files);
  res.json({ success: true, file: files[idx] });
});

// Delete file
app.delete('/api/files/:id', (req, res) => {
  const key = req.headers['x-upload-key'] || req.query.key;
  if (key !== UPLOAD_KEY) {
    return res.status(403).json({ error: '密钥错误' });
  }

  const files = loadFiles();
  const idx = files.findIndex(f => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '文件不存在' });

  const file = files[idx];
  const filePath = path.join(UPLOAD_DIR, file.storedName);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  files.splice(idx, 1);
  saveFiles(files);
  res.json({ success: true });
});

// Get all tags
app.get('/api/tags', (req, res) => {
  const files = loadFiles();
  const tagCounts = {};
  files.forEach(f => {
    f.tags.forEach(t => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });
  res.json({ tags: Object.entries(tagCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count) });
});

// Download file
app.get('/api/files/:id/download', (req, res) => {
  const files = loadFiles();
  const file = files.find(f => f.id === req.params.id);
  if (!file) return res.status(404).json({ error: '文件不存在' });

  const filePath = path.join(UPLOAD_DIR, file.storedName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: '文件已丢失' });

  res.download(filePath, file.originalName);
});

// Preview file (returns the file directly)
app.get('/api/files/:id/preview', (req, res) => {
  const files = loadFiles();
  const file = files.find(f => f.id === req.params.id);
  if (!file) return res.status(404).json({ error: '文件不存在' });

  const filePath = path.join(UPLOAD_DIR, file.storedName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: '文件已丢失' });

  res.sendFile(filePath);
});

// ---- Start ----
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  ✨ 凯鸽Claude云盘 ✨`);
  console.log(`  ─────────────────────`);
  console.log(`  🌐 http://localhost:${PORT}`);
  console.log(`  🔑 上传密钥: kgnb`);
  console.log(`  ─────────────────────\n`);
});
