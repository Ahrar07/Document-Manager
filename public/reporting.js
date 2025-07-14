let folders = {};
let pdfs = [];
let sortOption = 'name';

document.addEventListener('DOMContentLoaded', async () => {
  const [fRes, pRes] = await Promise.all([
    fetch('/folders.json'),
    fetch('/pdfs.json')
  ]);
  folders = await fRes.json();
  pdfs = await pRes.json();

  renderReport();
});

function setSortOption(value) {
  sortOption = value;
  renderReport();
}

function renderReport() {
  const container = document.getElementById('reportContainer');
  container.innerHTML = '';

  const folderReports = {};

  for (const pdf of pdfs) {
    if (pdf.trashed) continue;
    const folder = pdf.folder || '/';
    if (!folderReports[folder]) folderReports[folder] = [];
    folderReports[folder].push(pdf);
  }

  const sortedFolders = Object.entries(folderReports).sort((a, b) => {
    if (sortOption === 'name') return a[0].localeCompare(b[0]);
    if (sortOption === 'count') return b[1].length - a[1].length;
    return 0;
  });

  if (sortedFolders.length === 0) {
    container.innerHTML = '<div class="alert alert-warning">No documents found.</div>';
    return;
  }

  for (const [folder, docs] of sortedFolders) {
    const table = document.createElement('table');
    table.className = 'table table-bordered bg-white mb-5';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr class="table-light">
        <th colspan="5" class="text-start">
          <i class="bi bi-folder text-warning me-1"></i> ${folder}
        </th>
      </tr>
      <tr class="table-secondary">
        <th>Document Name</th>
        <th>Status</th>
        <th>Uploaded At</th>
        <th>Marked Completed At</th>
        <th>Action</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    docs.forEach(doc => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${doc.name}</td>
        <td>
          <span class="badge bg-${doc.completed ? 'success' : 'warning'}">
            ${doc.completed ? 'Completed' : 'Pending'}
          </span>
        </td>
        <td>${formatDate(doc.uploadedAt)}</td>
        <td>${doc.completedAt ? formatDate(doc.completedAt) : '-'}</td>
        <td>
          <button class="btn btn-sm btn-outline-${doc.completed ? 'warning' : 'success'}"
            onclick="toggleFolderDocStatus('${doc.id}')">
            <i class="bi bi-check-circle"></i> Mark as ${doc.completed ? 'Pending' : 'Completed'}
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);
  }
}

async function toggleFolderDocStatus(id) {
  const pdf = pdfs.find(p => p.id === id);
  if (!pdf) return;

  pdf.completed = !pdf.completed;
  pdf.updatedAt = new Date().toISOString();
  pdf.completedAt = pdf.completed ? new Date().toISOString() : null;

  await fetch(`/update-pdf-status/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      completed: pdf.completed,
      completedAt: pdf.completedAt,
      updatedAt: pdf.updatedAt
    })
  });

  renderReport();
}

function formatDate(str) {
  const d = new Date(str);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}
