let pdfs = [];
let activeFilter = 'all';
let currentFolder = '/';
let currentExcelWorkbook = null;
let currentExcelFilename = '';

async function fetchPDFs() {
  document.getElementById("loadingSpinner").style.display = "block";
  try {
    const res = await fetch('/pdfs.json');
    pdfs = await res.json();
    renderPDFs();
    updateSummaryCards();
  } catch (err) {
    console.error('Failed to load PDFs:', err);
  }
  document.getElementById("loadingSpinner").style.display = "none";
}

function renderPDFs() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const tbody = document.getElementById('pdfList');
  tbody.innerHTML = '';

  const filtered = pdfs.filter(pdf => {
    const matchName = pdf.name.toLowerCase().includes(query);
    const matchFolder = currentFolder === '/' || pdf.folder === currentFolder;
    const notTrashed = activeFilter !== 'trash' ? !pdf.trashed : pdf.trashed;

    if (activeFilter === 'completed') return pdf.completed && notTrashed && matchName && matchFolder;
    if (activeFilter === 'pending') return !pdf.completed && notTrashed && matchName && matchFolder;
    if (activeFilter === 'shared') return pdf.shared && notTrashed && matchName && matchFolder;
    if (activeFilter === 'trash') return pdf.trashed && matchName && matchFolder;
    return notTrashed && matchName && matchFolder;
  });

  document.getElementById("trashHeader").style.display = activeFilter === "trash" ? "flex" : "none";

  for (const pdf of filtered) {
    const tr = document.createElement('tr');
    const ext = pdf.name.split('.').pop().toLowerCase();
    const icon = getFileIcon(ext);
    const isPreviewable = ['pdf', 'png', 'jpg', 'jpeg'].includes(ext);
    const isExcel = ['xls', 'xlsx'].includes(ext);

    tr.innerHTML = `
      <td><i class="${icon} me-2 text-muted"></i> ${pdf.name}</td>
      <td><span class="badge bg-${pdf.completed ? 'success' : 'warning'}">${pdf.completed ? 'Completed' : 'Pending'}</span></td>
      <td>${formatDate(pdf.uploadedAt)}</td>
      <td>${pdf.updatedAt ? formatDate(pdf.updatedAt) : '-'}</td>
      <td class="d-flex gap-1 flex-wrap">
        ${isPreviewable ? `
          <button class="btn btn-sm btn-outline-primary" onclick="openPreview('${pdf.filename}')">
            <i class="bi bi-eye"></i>
          </button>` : isExcel ? `
          <button class="btn btn-sm btn-outline-primary" onclick="openExcelPreview('${pdf.filename}')">
            <i class="bi bi-table"></i>
          </button>` : `
          <button class="btn btn-sm btn-outline-secondary disabled" title="Preview not supported">
            <i class="bi bi-eye-slash"></i>
          </button>`}
        <a href="/uploads/${pdf.folder}/${pdf.filename}" download class="btn btn-sm btn-outline-secondary">
          <i class="bi bi-download"></i>
        </a>
        <button class="btn btn-sm btn-outline-success" onclick="toggleStatus('${pdf.id}')">
          <i class="bi bi-check2-circle"></i>
        </button>
        <button class="btn btn-sm btn-outline-info" onclick="toggleShare('${pdf.id}')">
          <i class="bi ${pdf.shared ? 'bi-share-fill' : 'bi-share'}"></i>
        </button>
        ${pdf.shared ? `
          <a href="/view/${pdf.id}" target="_blank" class="btn btn-sm btn-outline-info" title="Public Link">
            <i class="bi bi-link-45deg"></i>
          </a>` : ''}
        <button class="btn btn-sm btn-outline-danger" onclick="toggleTrash('${pdf.id}')">
          <i class="bi ${pdf.trashed ? 'bi-arrow-counterclockwise' : 'bi-trash'}"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

function openPreview(filename) {
  const pdf = pdfs.find(p => p.filename === filename);
  if (!pdf) return;

  const ext = filename.split('.').pop().toLowerCase();
  if (['pdf', 'png', 'jpg', 'jpeg'].includes(ext)) {
    document.getElementById('pdfFrame').src = '/uploads/' + pdf.folder + '/' + filename;
    new bootstrap.Modal(document.getElementById('previewModal')).show();
  }
}

function openExcelPreview(filename) {
  const pdf = pdfs.find(p => p.filename === filename);
  if (!pdf) return;

  const filePath = '/uploads/' + pdf.folder + '/' + filename;
  fetch(filePath)
    .then(res => res.arrayBuffer())
    .then(data => {
      const workbook = XLSX.read(data, { type: 'array' });
      currentExcelWorkbook = workbook;
      currentExcelFilename = filename;

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const html = XLSX.utils.sheet_to_html(sheet, { editable: true });
      document.getElementById('excelPreviewBody').innerHTML = `
        ${html}
        <div class="text-end mt-3">
          <button class="btn btn-success" onclick="downloadEditedExcel()">
            <i class="bi bi-download"></i> Download Edited Excel
          </button>
        </div>`;

      new bootstrap.Modal(document.getElementById('excelModal')).show();
    });
}

function downloadEditedExcel() {
  const table = document.querySelector('#excelPreviewBody table');
  const newSheet = XLSX.utils.table_to_sheet(table);
  const newWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newWorkbook, newSheet, "Sheet1");

  XLSX.writeFile(newWorkbook, 'Edited-' + currentExcelFilename);
}

function updateSummaryCards() {
  const inFolder = pdfs.filter(p => p.folder === currentFolder && !p.trashed);
  document.getElementById("totalPDFs").textContent = inFolder.length;
  document.getElementById("completedPDFs").textContent = inFolder.filter(p => p.completed).length;
  document.getElementById("pendingPDFs").textContent = inFolder.filter(p => !p.completed).length;
  document.getElementById("recentUploads").textContent = inFolder.filter(p => {
    const uploaded = new Date(p.uploadedAt);
    return (Date.now() - uploaded.getTime()) < 7 * 24 * 60 * 60 * 1000;
  }).length;
}

function setFilter(filterName) {
  activeFilter = filterName;
  renderPDFs();
}

function formatDate(str) {
  const d = new Date(str);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

async function toggleStatus(id) {
  await fetch(`/toggle-status/${id}`, { method: 'POST' });
  fetchPDFs();
}

async function toggleTrash(id) {
  await fetch(`/toggle-trash/${id}`, { method: 'POST' });
  fetchPDFs();
}

async function toggleShare(id) {
  await fetch(`/toggle-share/${id}`, { method: 'POST' });
  fetchPDFs();
}

function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('d-block');
}

function submitUpload() {
  const input = document.getElementById('pdfUpload');
  const formData = new FormData();
  for (let file of input.files) {
    formData.append('pdfs', file);
  }

  const folderPath = currentFolder === '/' ? '' : currentFolder;
  fetch('/upload?path=' + encodeURIComponent(folderPath), {
    method: 'POST',
    body: formData
  }).then(() => {
    input.value = '';
    fetchPDFs();
  });
}

function deleteAllTrash() {
  fetch(`/delete-all-trash`, { method: 'POST' }).then(() => fetchPDFs());
}

function getFileIcon(ext) {
  const map = {
    pdf: 'bi-file-earmark-pdf',
    doc: 'bi-file-earmark-word',
    docx: 'bi-file-earmark-word',
    xls: 'bi-file-earmark-excel',
    xlsx: 'bi-file-earmark-excel',
    png: 'bi-file-earmark-image',
    jpg: 'bi-file-earmark-image',
    jpeg: 'bi-file-earmark-image',
    txt: 'bi-file-earmark-text',
    default: 'bi-file-earmark'
  };
  return `bi ${map[ext] || map.default}`;
}

async function loadFolderTree() {
  const res = await fetch('/folders.json');
  const root = await res.json();
  const tree = document.getElementById('folderTree');
  tree.innerHTML = '';
  renderFolderTree(tree, root, '');
  renderBreadcrumbs(); // ✅ Added here
}

function renderFolderTree(container, node, path) {
  const ul = document.createElement('ul');
  ul.className = 'list-unstyled';

  for (const child of node.children) {
    const fullPath = path + '/' + child.name;
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <a href="#" class="folder-link ${currentFolder === fullPath ? 'fw-bold text-primary' : ''}" onclick="navigateToFolder('${fullPath}')">
          <i class="bi bi-folder me-2 text-warning"></i>${child.name}
        </a>
        <div class="dropdown">
          <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown"></button>
          <ul class="dropdown-menu">
            <li><a class="dropdown-item" href="#" onclick="promptRenameFolder('${fullPath}', '${child.name}')">Rename</a></li>
            <li><a class="dropdown-item text-danger" href="#" onclick="deleteFolder('${fullPath}')">Delete</a></li>
          </ul>
        </div>
      </div>
    `;
    renderFolderTree(li, child, fullPath);
    ul.appendChild(li);
  }

  container.appendChild(ul);
}

function navigateToFolder(path) {
  currentFolder = path;
  fetchPDFs();
  loadFolderTree();
  renderBreadcrumbs();
}

function renderBreadcrumbs() {
  const breadcrumb = document.getElementById("folderBreadcrumbs");
  breadcrumb.innerHTML = '';

  const parts = currentFolder === '/' ? [] : currentFolder.split('/').filter(Boolean);
  let fullPath = '';

  const homeItem = document.createElement('li');
  homeItem.className = 'breadcrumb-item' + (parts.length === 0 ? ' active' : '');
  homeItem.innerHTML = parts.length === 0
    ? 'Home'
    : `<a href="#" onclick="navigateToFolder('/')">Home</a>`;
  breadcrumb.appendChild(homeItem);

  parts.forEach((part, index) => {
    fullPath += '/' + part;
    const li = document.createElement('li');
    li.className = 'breadcrumb-item' + (index === parts.length - 1 ? ' active' : '');
    li.innerHTML = index === parts.length - 1
      ? part
      : `<a href="#" onclick="navigateToFolder('${fullPath}')">${part}</a>`;
    breadcrumb.appendChild(li);
  });
}

async function createFolder(e) {
  e.preventDefault();
  const input = document.getElementById('newFolderName');
  const folderName = input.value.trim();
  if (!folderName) return;

  const fullPath = folderName.includes('/') || currentFolder === '/' 
    ? folderName 
    : `${currentFolder}/${folderName}`;

  const res = await fetch('/create-folder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder: fullPath })
  });

  if (res.ok) {
    input.value = '';
    await loadFolderTree();
    fetchPDFs();
  } else {
    alert('❌ Failed to create folder');
  }
}

async function promptRenameFolder(fullPath, currentName) {
  const newName = prompt('Rename folder:', currentName);
  if (!newName || newName === currentName) return;

  const res = await fetch('/rename-folder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPath: fullPath, newName })
  });

  if (res.ok) {
    await loadFolderTree();
    fetchPDFs();
  } else {
    alert('❌ Rename failed');
  }
}

async function deleteFolder(fullPath) {
  if (!confirm(`Are you sure you want to delete folder: ${fullPath}?`)) return;

  const res = await fetch('/delete-folder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: fullPath })
  });

  if (res.ok) {
    await loadFolderTree();
    fetchPDFs();
  } else {
    alert('❌ Delete failed');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fetchPDFs();
  loadFolderTree();
});