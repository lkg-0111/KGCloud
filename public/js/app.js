// ============================================================
//  凯鸽Claude 云盘 - 主应用脚本
//  "凯鸽万岁" ❤️
// ============================================================

// ---- State ----
let allFiles = [];
let allTags = [];
let currentTag = '';
let currentView = 'grid';
let currentPreviewId = null;
let selectedFile = null;
let searchTimer = null;

// ---- DOM refs ----
const $ = (id) => document.getElementById(id);

// ============================================================
//  1. 背景动画 — "凯鸽万岁" 文字雨
// ============================================================
class TextRain {
  constructor() {
    this.canvas = document.getElementById('bgCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.drops = [];
    this.texts = ['凯', '鸽', '万', '岁'];
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.init();
    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.colCount = Math.floor(this.canvas.width / 40);
  }

  init() {
    this.drops = [];
    const count = this.colCount * 2;
    for (let i = 0; i < count; i++) {
      this.drops.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height - this.canvas.height,
        text: this.texts[Math.floor(Math.random() * this.texts.length)],
        size: 14 + Math.random() * 28,
        speed: 0.8 + Math.random() * 2,
        sway: Math.random() * 2 - 1,
        swaySpeed: 0.005 + Math.random() * 0.02,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.3 + Math.random() * 0.5,
        colorShift: Math.random() * 360,
        trailing: false,
        trailLength: 3 + Math.floor(Math.random() * 5)
      });
    }
  }

  animate() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Semi-transparent overlay for trail effect
    ctx.fillStyle = 'rgba(10, 10, 26, 0.12)';
    ctx.fillRect(0, 0, w, h);

    ctx.textBaseline = 'middle';
    ctx.font = 'bold 24px "PingFang SC", "Microsoft YaHei", sans-serif';

    const time = Date.now() * 0.001;

    for (const drop of this.drops) {
      drop.y += drop.speed;
      drop.x += Math.sin(time * drop.swaySpeed + drop.phase) * drop.sway;
      drop.phase += 0.01;

      // Wrap around
      if (drop.y > h + 50) {
        drop.y = -50;
        drop.x = Math.random() * w;
        drop.text = this.texts[Math.floor(Math.random() * this.texts.length)];
        drop.opacity = 0.3 + Math.random() * 0.5;
      }

      // Bounce off sides
      if (drop.x < -20) drop.x = w + 20;
      if (drop.x > w + 20) drop.x = -20;

      // Color gradient based on position and time
      const hue1 = (drop.colorShift + drop.y * 0.1 + time * 20) % 360;
      const hue2 = (drop.colorShift + drop.y * 0.1 + time * 20 + 60) % 360;
      const hue3 = (drop.colorShift + drop.y * 0.1 + time * 20 + 120) % 360;

      const size = drop.size;
      ctx.font = `bold ${size}px "PingFang SC", "Microsoft YaHei", sans-serif`;

      // Glow effect
      ctx.shadowBlur = size * 0.8;
      ctx.shadowColor = `hsla(${hue1}, 100%, 70%, ${drop.opacity * 0.3})`;

      // Main character with gradient
      const gradient = ctx.createLinearGradient(drop.x - 10, drop.y - 10, drop.x + 10, drop.y + 10);
      gradient.addColorStop(0, `hsla(${hue1}, 100%, 75%, ${drop.opacity})`);
      gradient.addColorStop(0.5, `hsla(${hue2}, 100%, 65%, ${drop.opacity * 0.9})`);
      gradient.addColorStop(1, `hsla(${hue3}, 100%, 55%, ${drop.opacity * 0.8})`);

      ctx.fillStyle = gradient;
      ctx.fillText(drop.text, drop.x, drop.y);

      // Reset shadow
      ctx.shadowBlur = 0;

      // Draw trailing smaller chars
      const trailOpacity = drop.opacity * 0.2;
      for (let t = 1; t <= drop.trailLength; t++) {
        const ty = drop.y - t * size * 0.7;
        if (ty < -20) break;
        const top = drop.opacity * 0.15 / t;
        ctx.globalAlpha = top;
        ctx.font = `bold ${size * (1 - t * 0.12)}px "PingFang SC", "Microsoft YaHei", sans-serif`;
        const thue = (drop.colorShift + ty * 0.1 + time * 20) % 360;
        ctx.fillStyle = `hsla(${thue}, 100%, 65%, ${top})`;
        ctx.fillText(drop.text, drop.x + Math.sin(time * 0.005 + t) * 3, ty);
      }
      ctx.globalAlpha = 1;
    }

    requestAnimationFrame(() => this.animate());
  }
}

// Start the text rain
new TextRain();

// ============================================================
//  2. Particle Stars (偶尔闪烁星星)
// ============================================================
function createParticles() {
  const overlay = document.getElementById('particleOverlay');
  for (let i = 0; i < 60; i++) {
    const star = document.createElement('div');
    const size = 1 + Math.random() * 3;
    star.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background: white;
      border-radius: 50%;
      top: ${Math.random() * 100}%;
      left: ${Math.random() * 100}%;
      opacity: ${0.1 + Math.random() * 0.5};
      animation: twinkle ${1 + Math.random() * 3}s ease-in-out ${Math.random() * 3}s infinite;
    `;
    overlay.appendChild(star);
  }
}

// Add twinkle keyframes
const twinkleStyle = document.createElement('style');
twinkleStyle.textContent = `
  @keyframes twinkle {
    0%, 100% { opacity: ${0.1}; transform: scale(1); }
    50% { opacity: ${0.8}; transform: scale(1.5); }
  }
`;
document.head.appendChild(twinkleStyle);
createParticles();

// ============================================================
//  3. Key Management — 从输入获取密钥，成功后存 session
// ============================================================
function getUploadKey() {
  // 优先用 sessionStorage 中已验证的密钥
  const stored = sessionStorage.getItem('kaige_upload_key');
  if (stored) return stored;
  // 否则从输入框读取（用户手动输入）
  return document.getElementById('uploadKey').value.trim();
}

function storeUploadKey(key) {
  if (key) {
    sessionStorage.setItem('kaige_upload_key', key);
    updateKeyDisplay();
  }
}

function updateKeyDisplay() {
  const stored = sessionStorage.getItem('kaige_upload_key');
  const display = document.getElementById('keyDisplay');
  if (display) {
    display.textContent = stored || '未设置';
    display.style.color = stored ? 'var(--neon-gold)' : 'var(--text-dim)';
  }
}

function focusKeyInput() {
  const panel = document.getElementById('uploadPanel');
  panel.classList.remove('hidden');
  document.getElementById('uploadKey').focus();
}

// ============================================================
//  4. Upload Panel Toggle
// ============================================================
function toggleUploadPanel() {
  const panel = document.getElementById('uploadPanel');
  panel.classList.toggle('hidden');
}

// ============================================================
//  4. Drag & Drop
// ============================================================
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  if (e.dataTransfer.files.length) {
    fileInput.files = e.dataTransfer.files;
    showToast(`已选择文件: ${e.dataTransfer.files[0].name}`, 'success');
    // Auto upload
    uploadFile();
  }
});

fileInput.addEventListener('change', () => {
  if (fileInput.files.length) {
    uploadFile();
  }
});

// ============================================================
//  5. Upload File
// ============================================================
async function uploadFile() {
  const file = fileInput.files[0];
  if (!file) {
    showToast('请先选择文件', 'error');
    return;
  }

  const key = getUploadKey();
  const tags = document.getElementById('fileTags').value.split(',').map(t => t.trim()).filter(Boolean);
  const description = document.getElementById('fileDescription').value;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('tags', JSON.stringify(tags));
  formData.append('description', description);

  const progress = document.getElementById('uploadProgress');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const result = document.getElementById('uploadResult');

  progress.classList.remove('hidden');
  result.classList.add('hidden');

  try {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        progressFill.style.width = pct + '%';
        progressText.textContent = pct + '%';
      }
    });

    const uploadPromise = new Promise((resolve, reject) => {
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          try {
            reject(JSON.parse(xhr.responseText));
          } catch {
            reject({ error: '上传失败' });
          }
        }
      });
      xhr.addEventListener('error', () => reject({ error: '网络错误' }));
    });

    xhr.open('POST', '/api/upload');
    xhr.setRequestHeader('X-Upload-Key', key);
    xhr.send(formData);

    const data = await uploadPromise;

    if (data.success) {
      storeUploadKey(key); // 密钥验证通过，存入 session
      result.className = 'upload-result success';
      result.textContent = `✅ 上传成功！${file.name} 已保存到凯鸽云盘`;
      result.classList.remove('hidden');
      progress.classList.add('hidden');

      // Reset
      fileInput.value = '';
      document.getElementById('fileTags').value = '';
      document.getElementById('fileDescription').value = '';

      loadFiles();
      loadTags();
      showToast(`🎉 ${file.name} 上传成功！`, 'success');

      // Hide upload panel after 2 seconds
      setTimeout(() => {
        document.getElementById('uploadPanel').classList.add('hidden');
      }, 2000);
    }
  } catch (err) {
    result.className = 'upload-result error';
    result.textContent = `❌ 上传失败: ${err.error || '未知错误'}`;
    result.classList.remove('hidden');
    progress.classList.add('hidden');
    showToast('上传失败: ' + (err.error || '未知错误'), 'error');
  }
}

// ============================================================
//  6. Load Files
// ============================================================
async function loadFiles() {
  try {
    const params = new URLSearchParams();
    if (currentTag) params.set('tag', currentTag);
    const searchVal = document.getElementById('searchInput').value.trim();
    if (searchVal) params.set('search', searchVal);

    const res = await fetch(`/api/files?${params}`);
    const data = await res.json();
    allFiles = data.files;
    renderFiles();
    updateStats();
  } catch (err) {
    console.error('加载文件失败:', err);
    showToast('加载文件失败', 'error');
  }
}

// ============================================================
//  7. Load Tags
// ============================================================
async function loadTags() {
  try {
    const res = await fetch('/api/tags');
    const data = await res.json();
    allTags = data.tags;
    renderTags();
  } catch (err) {
    console.error('加载标签失败:', err);
  }
}

// ============================================================
//  8. Render Tags
// ============================================================
function renderTags() {
  const container = document.getElementById('tagFilter');
  // Keep the "全部" button
  container.innerHTML = '<button class="tag-btn active" data-tag="" onclick="filterByTag(\'\')">全部</button>';

  for (const tag of allTags) {
    const btn = document.createElement('button');
    btn.className = 'tag-btn' + (currentTag === tag.name ? ' active' : '');
    btn.dataset.tag = tag.name;
    btn.textContent = `${tag.name} (${tag.count})`;
    btn.onclick = () => filterByTag(tag.name);
    container.appendChild(btn);
  }
}

// ============================================================
//  9. Filter by Tag
// ============================================================
function filterByTag(tag) {
  currentTag = tag;
  // Update active state on tag buttons
  document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tag === tag);
  });
  loadFiles();
}

// ============================================================
//  10. Search (debounced)
// ============================================================
function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadFiles(), 300);
}

// ============================================================
//  11. Set View
// ============================================================
function setView(view) {
  currentView = view;
  document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view-btn').forEach(b => {
    if ((view === 'grid' && b.textContent === '⊞') ||
        (view === 'list' && b.textContent === '☰')) {
      b.classList.add('active');
    }
  });
  renderFiles();
}

// ============================================================
//  12. Render Files
// ============================================================
function renderFiles() {
  const grid = document.getElementById('fileGrid');
  grid.classList.toggle('list-view', currentView === 'list');

  if (allFiles.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🕊️</div>
        <h3>凯鸽云盘还空空的</h3>
        <p>点击右上角「上传文件」开始你的云存储之旅 ✨</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = allFiles.map(file => {
    const preview = getPreviewHTML(file);
    const typeLabel = getFileType(file.mimeType);
    const typeClass = getTypeClass(file.mimeType);
    const size = formatSize(file.size);
    const date = formatDate(file.uploadDate);
    const isHtml = file.mimeType === 'text/html' || file.originalName.endsWith('.html') || file.originalName.endsWith('.htm');

    return `
      <div class="file-card" data-id="${file.id}" onclick="openPreview('${file.id}')">
        <div class="type-badge ${typeClass}">${typeLabel}</div>
        ${preview}
        <div class="card-body">
          <div class="card-name" title="${escapeHtml(file.originalName)}">${escapeHtml(file.originalName)}</div>
          <div class="card-tags">
            ${file.tags.map(t => `<span class="card-tag">${escapeHtml(t)}</span>`).join('')}
          </div>
          ${file.description ? `<div class="card-desc">${escapeHtml(file.description)}</div>` : ''}
          <div class="card-meta">
            <span>${size}</span>
            <span>${date}</span>
          </div>
        </div>
        <div class="card-actions" onclick="event.stopPropagation()">
          <button class="card-action-btn download" onclick="downloadFile('${file.id}')">⬇️ 下载</button>
          ${isHtml ? `<button class="card-action-btn open-tab" onclick="openHtmlTab('${file.id}')">🔗 打开</button>` : ''}
          <button class="card-action-btn edit" onclick="editFile('${file.id}')">✏️ 编辑</button>
          <button class="card-action-btn delete" onclick="deleteFile('${file.id}')">🗑️ 删除</button>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
//  13. Get Preview HTML
// ============================================================
function getPreviewHTML(file) {
  const { mimeType, originalName } = file;

  if (mimeType.startsWith('image/')) {
    return `<img class="card-preview" src="/api/files/${file.id}/preview" alt="${originalName}" loading="lazy">`;
  }

  if (mimeType.startsWith('video/')) {
    return `
      <div style="position:relative;width:100%;height:180px;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden;">
        <video class="card-preview video-preview" src="/api/files/${file.id}/preview" muted preload="metadata" style="max-width:100%;max-height:180px;object-fit:contain;"></video>
        <span style="position:absolute;font-size:2rem;opacity:0.7;pointer-events:none;">▶️</span>
      </div>`;
  }

  if (mimeType.startsWith('audio/')) {
    return `<div class="audio-visualizer">🎵</div>`;
  }

  if (mimeType === 'text/html' || originalName.endsWith('.html') || originalName.endsWith('.htm')) {
    return `<div class="card-icon">🌐</div>`;
  }

  if (mimeType.includes('pdf')) {
    return `<div class="card-icon">📄</div>`;
  }

  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('7z') || mimeType.includes('gzip')) {
    return `<div class="card-icon">📦</div>`;
  }

  if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('javascript')) {
    return `<div class="card-icon">📝</div>`;
  }

  // Default icon by extension
  const ext = originalName.split('.').pop()?.toLowerCase();
  const iconMap = {
    pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
    ppt: '📽️', pptx: '📽️', mp3: '🎵', wav: '🎵', flac: '🎵',
    zip: '📦', rar: '📦', '7z': '📦', gz: '📦', tar: '📦',
    json: '📋', xml: '📋', yaml: '📋', yml: '📋',
    js: '⚡', ts: '⚡', py: '🐍', java: '☕', go: '🔵', rs: '🦀',
    html: '🌐', htm: '🌐', css: '🎨', scss: '🎨',
    md: '📝', txt: '📝', log: '📝',
    exe: '⚙️', dmg: '💿', iso: '💿', apk: '📱',
    svg: '🖼️', psd: '🎨', ai: '🎨'
  };

  return `<div class="card-icon">${iconMap[ext] || '📁'}</div>`;
}

// ============================================================
//  14. Helpers
// ============================================================
function getFileType(mimeType) {
  if (mimeType.startsWith('image/')) return '图片';
  if (mimeType.startsWith('video/')) return '视频';
  if (mimeType.startsWith('audio/')) return '音频';
  if (mimeType === 'text/html') return 'HTML';
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return '压缩';
  if (mimeType.startsWith('text/')) return '文档';
  return '文件';
}

function getTypeClass(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'text/html') return 'html';
  if (mimeType.includes('pdf')) return 'document';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return 'archive';
  if (mimeType.startsWith('text/')) return 'document';
  return 'other';
}

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return size.toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
}

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;

  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function updateStats() {
  document.getElementById('fileCount').textContent = allFiles.length;
  document.getElementById('tagCount').textContent = allTags.length;

  const totalBytes = allFiles.reduce((sum, f) => sum + (f.size || 0), 0);
  document.getElementById('totalSize').textContent = formatSize(totalBytes);
}

// ============================================================
//  15. Preview Modal
// ============================================================
async function openPreview(fileId) {
  const modal = document.getElementById('previewModal');
  const body = document.getElementById('previewBody');
  const title = document.getElementById('previewTitle');
  const info = document.getElementById('previewInfo');
  const downloadBtn = document.getElementById('downloadBtn');
  const openTabBtn = document.getElementById('openNewTabBtn');

  currentPreviewId = fileId;

  try {
    const res = await fetch(`/api/files/${fileId}`);
    const data = await res.json();
    const file = data.file;

    title.textContent = file.originalName;
    info.textContent = `${formatSize(file.size)} • ${formatDate(file.uploadDate)}${file.tags.length ? ' • 🏷️ ' + file.tags.join(', ') : ''}${file.description ? ' • 📝 ' + file.description : ''}`;
    downloadBtn.onclick = () => downloadFile(fileId);

    const isHtml = file.mimeType === 'text/html' || file.originalName.endsWith('.html') || file.originalName.endsWith('.htm');
    openTabBtn.style.display = isHtml ? 'inline-flex' : 'none';
    if (isHtml) {
      openTabBtn.onclick = () => openHtmlTab(fileId);
    }

    body.innerHTML = '<div id="previewLoading" class="preview-loading"><div class="spinner"></div><p>加载中...</p></div>';

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Render preview
    renderPreview(file);
  } catch (err) {
    showToast('加载预览失败', 'error');
  }
}

function renderPreview(file) {
  const body = document.getElementById('previewBody');
  const { mimeType, originalName } = file;
  const previewUrl = `/api/files/${file.id}/preview`;

  if (mimeType.startsWith('image/')) {
    body.innerHTML = `<img src="${previewUrl}" alt="${escapeHtml(originalName)}" onerror="this.parentElement.innerHTML='<p style=color:var(--text-dim)>❌ 图片加载失败</p>'">`;
  } else if (mimeType.startsWith('video/')) {
    body.innerHTML = `<video src="${previewUrl}" controls autoplay style="max-width:100%;max-height:70vh;border-radius:8px;" onerror="this.parentElement.innerHTML='<p style=color:var(--text-dim)>❌ 视频加载失败</p>'"></video>`;
  } else if (mimeType.startsWith('audio/')) {
    body.innerHTML = `
      <div style="text-align:center;padding:40px;">
        <div style="font-size:4rem;margin-bottom:20px;">🎵</div>
        <p style="color:var(--text-secondary);margin-bottom:20px;">${escapeHtml(originalName)}</p>
        <audio src="${previewUrl}" controls style="width:100%;max-width:500px;" onerror="this.parentElement.innerHTML='<p style=color:var(--text-dim)>❌ 音频加载失败</p>'"></audio>
      </div>`;
  } else if (mimeType === 'text/html' || originalName.endsWith('.html') || originalName.endsWith('.htm')) {
    body.innerHTML = `
      <div style="text-align:center;padding:40px;">
        <div style="font-size:4rem;margin-bottom:20px;">🌐</div>
        <p style="color:var(--text-secondary);margin-bottom:20px;">HTML 文件将在新标签页中打开</p>
        <button class="btn btn-primary btn-glow" onclick="openHtmlTab('${file.id}')">🔗 在新标签页打开</button>
      </div>`;
  } else {
    body.innerHTML = `
      <div style="text-align:center;padding:40px;">
        <div style="font-size:4rem;margin-bottom:20px;">📁</div>
        <p style="color:var(--text-secondary);margin-bottom:8px;">${escapeHtml(originalName)}</p>
        <p style="color:var(--text-dim);font-size:0.85rem;margin-bottom:20px;">${formatSize(file.size)} • 此格式暂不支持在线预览</p>
        <button class="btn btn-primary btn-glow" onclick="downloadFile('${file.id}')">⬇️ 下载文件</button>
      </div>`;
  }
}

function closePreview(e) {
  if (e && e.target !== document.getElementById('previewModal')) return;
  document.getElementById('previewModal').classList.add('hidden');
  document.body.style.overflow = '';
  currentPreviewId = null;
}

// Close modal on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('previewModal').classList.add('hidden');
    document.getElementById('editModal').classList.add('hidden');
    document.body.style.overflow = '';
  }
});

// ============================================================
//  16. Download / Open HTML
// ============================================================
function downloadFile(fileId) {
  window.open(`/api/files/${fileId}/download`, '_blank');
  showToast('开始下载...', 'success');
}

function downloadCurrent() {
  if (currentPreviewId) downloadFile(currentPreviewId);
}

async function openHtmlTab(fileId) {
  try {
    const res = await fetch(`/api/files/${fileId}/preview`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch {
    window.open(`/api/files/${fileId}/preview`, '_blank');
  }
}

// ============================================================
//  17. Edit File
// ============================================================
let editingFileId = null;

async function editFile(fileId) {
  editingFileId = fileId;
  try {
    const res = await fetch(`/api/files/${fileId}`);
    const data = await res.json();
    const file = data.file;

    document.getElementById('editTags').value = (file.tags || []).join(', ');
    document.getElementById('editDescription').value = file.description || '';
    document.getElementById('editModal').classList.remove('hidden');
  } catch (err) {
    showToast('加载文件信息失败', 'error');
  }
}

async function saveEdit() {
  if (!editingFileId) return;

  const tags = document.getElementById('editTags').value.split(',').map(t => t.trim()).filter(Boolean);
  const description = document.getElementById('editDescription').value;
  const key = getUploadKey();

  try {
    const res = await fetch(`/api/files/${editingFileId}?key=${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Upload-Key': key },
      body: JSON.stringify({ tags, description })
    });
    const data = await res.json();
    if (data.success) {
      storeUploadKey(key);
      showToast('✅ 文件信息已更新', 'success');
      document.getElementById('editModal').classList.add('hidden');
      loadFiles();
      loadTags();
    } else {
      showToast('保存失败', 'error');
    }
  } catch (err) {
    showToast('保存失败', 'error');
  }
}

// ============================================================
//  18. Delete File
// ============================================================
async function deleteFile(fileId) {
  if (!confirm('确定要删除这个文件吗？此操作不可撤销。')) return;

  const key = getUploadKey();

  try {
    const res = await fetch(`/api/files/${fileId}?key=${key}`, {
      method: 'DELETE',
      headers: { 'X-Upload-Key': key }
    });
    const data = await res.json();
    if (data.success) {
      storeUploadKey(key);
      showToast('🗑️ 文件已删除', 'success');
      loadFiles();
      loadTags();
    } else {
      showToast('删除失败: ' + (data.error || '未知错误'), 'error');
    }
  } catch (err) {
    showToast('删除失败', 'error');
  }
}

// ============================================================
//  19. Toast Notifications
// ============================================================
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast ' + type;
  toast.classList.remove('hidden');

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// ============================================================
//  20. Tag suggestions from existing tags
// ============================================================
document.getElementById('fileTags').addEventListener('focus', async () => {
  const container = document.getElementById('tagSuggestions');
  try {
    const res = await fetch('/api/tags');
    const data = await res.json();
    if (data.tags.length === 0) return;
    container.innerHTML = data.tags.map(t =>
      `<button class="tag-btn" onclick="addTag('${t.name}')">${t.name}</button>`
    ).join('');
  } catch {}
});

document.getElementById('fileTags').addEventListener('blur', () => {
  // Delay to allow click on suggestion
  setTimeout(() => {
    document.getElementById('tagSuggestions').innerHTML = '';
  }, 200);
});

function addTag(tag) {
  const input = document.getElementById('fileTags');
  const existing = input.value.split(',').map(t => t.trim()).filter(Boolean);
  if (!existing.includes(tag)) {
    existing.push(tag);
    input.value = existing.join(', ');
  }
}

// ============================================================
//  21. Init
// ============================================================
loadFiles();
loadTags();
updateKeyDisplay();

// Refresh every 30 seconds
setInterval(() => {
  loadFiles();
  loadTags();
}, 30000);

console.log('🕊️ 凯鸽Claude 云盘 v1.0');
console.log('🔥 "凯鸽万岁" — 自由飞翔，存储无限');
