# 📁 Document Manager / PDF Tracker

A full-stack document management web application that lets you upload, organize, preview, share, and manage PDF and Excel files by folders. Includes a powerful **Reporting Dashboard** to track progress and statuses across folders.

---

## ✨ Features

- 📂 Create and organize folders (supports subfolders)
- 📄 Upload PDFs and Excel files
- 👀 Inline preview for PDFs and editable Excel sheets
- 🏷️ Mark documents as Completed / Pending
- 🔗 Share documents publicly with a link
- 🗑️ Soft-delete and restore documents (Trash)
- 📊 Reporting view with:
  - Folder status overview
  - Toggle status at folder or file level
  - Sorting by folder name, document count, creation date
  - Excel export of reports
- 🧭 Breadcrumb navigation
- 🔐 User authentication (Login / Logout)
- 🎨 Clean UI with optional glassmorphism themes

---

## 🛠️ Tech Stack

- **Frontend**: HTML, CSS, Bootstrap, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js
- **File Upload**: `multer`
- **Data Storage**: Local JSON files (no DB for simplicity)
- **Excel Preview/Export**: SheetJS (`xlsx.full.min.js`)
- **PDF Preview**: Embedded iframe

---

## 🚀 Setup Instructions

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/document-manager.git
   cd document-manager
2. **install Dependencies:**
   ```bash
   npm install
3. **Run the server:**
   ```bash
   node server.js
4. **Visit http://localhost:3000 in your browser.**
---
## 📁Project Structure
```document-manager/
├── public/
│   ├── dashboard.html           # Main dashboard UI
│   ├── reporting.html           # Reporting overview UI
│   ├── script.js                # All dashboard logic (upload, preview, status)
│   ├── reporting.js             # Reporting-specific JS (sorting, exporting)
│   └── style.css                # Custom styles (UI enhancements, animations)
├── uploads/                     # Uploaded PDF/Excel files (Git-ignored)
├── server.js                    # Node.js Express backend
├── pdfs.json                    # Metadata for uploaded files (Git-ignored)
├── folders.json                 # Folder structure info (Git-ignored)
├── users.json                   # User authentication data (Git-ignored)
├── .gitignore                   # Ignores sensitive or runtime files
├── package.json                 # Node dependencies and scripts
└── README.md                    # Project description and setup instructions
```
---
## 🔐Authentication

- Simple session-based login
- Passwords hashed using bcrypt
- Demo credentials or user registration form can be enabled
---

## 👤 Author

**Ahrar Hakeem**  
📧 [ahrarhakeem36@gmail.com](mailto:ahrarhakeem36@gmail.com)
---

