// === server.js ===
const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { v4: uuid } = require("uuid");

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));
app.use(session({
  secret: "pdf-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60 * 60 * 1000 },
}));

function ensureFolderExists(folderPath) {
  if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
}

function loadData(file, fallback = []) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
  return JSON.parse(fs.readFileSync(file));
}

function saveData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function loadFolderTree() {
  return loadData("folders.json", { name: "/", children: [] });
}

function saveFolderTree(data) {
  saveData("folders.json", data);
}

function addFolderToTree(tree, parts) {
  if (!parts.length) return;
  const name = parts[0];
  let child = tree.children.find(c => c.name === name);
  if (!child) {
    child = { name, children: [] };
    tree.children.push(child);
  }
  addFolderToTree(child, parts.slice(1));
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.query.path || "/";
    const target = path.join("uploads", folder);
    ensureFolderExists(target);
    cb(null, target);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

function checkAuth(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/index.html");
}

app.post("/register", (req, res) => {
  const { username, password } = req.body;
  const users = loadData("users.json");
  if (users.find(u => u.username === username)) return res.send("User already exists");
  users.push({ username, password: bcrypt.hashSync(password, 10) });
  saveData("users.json", users);
  res.redirect("/index.html");
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = loadData("users.json");
  const user = users.find(u => u.username === username);
  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.user = user.username;
    return res.redirect("/dashboard.html");
  }
  res.send("Invalid credentials");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/index.html"));
});

app.post("/create-folder", checkAuth, (req, res) => {
  const { folder } = req.body;
  if (!folder || typeof folder !== "string") return res.sendStatus(400);

  const fullPath = path.join("uploads", folder);
  ensureFolderExists(fullPath);

  const tree = loadFolderTree();
  const parts = folder.split("/").filter(Boolean);
  addFolderToTree(tree, parts);
  saveFolderTree(tree);

  res.status(201).json({ message: "Folder created" });
});

app.post("/rename-folder", checkAuth, (req, res) => {
  const { oldPath, newName } = req.body;
  const oldFolder = path.join("uploads", oldPath);
  const newFolder = path.join(path.dirname(oldFolder), newName);

  if (!fs.existsSync(oldFolder)) return res.sendStatus(404);
  fs.renameSync(oldFolder, newFolder);

  const tree = loadFolderTree();
  const parts = oldPath.split("/").filter(Boolean);
  const last = parts.pop();

  let node = tree;
  for (const part of parts) {
    node = node.children.find(c => c.name === part);
    if (!node) return res.sendStatus(500);
  }

  const folderNode = node.children.find(c => c.name === last);
  if (folderNode) folderNode.name = newName;

  saveFolderTree(tree);
  res.sendStatus(200);
});

app.post("/delete-folder", checkAuth, (req, res) => {
  const { path: folderPath } = req.body;
  const fullPath = path.join("uploads", folderPath);

  if (!fs.existsSync(fullPath)) return res.sendStatus(404);
  fs.rmSync(fullPath, { recursive: true, force: true });

  const tree = loadFolderTree();
  const parts = folderPath.split("/").filter(Boolean);
  const last = parts.pop();

  let node = tree;
  for (const part of parts) {
    node = node.children.find(c => c.name === part);
    if (!node) return res.sendStatus(500);
  }

  node.children = node.children.filter(c => c.name !== last);
  saveFolderTree(tree);

  res.sendStatus(200);
});

app.post("/upload", checkAuth, upload.array("pdfs"), (req, res) => {
  const folderPath = req.query.path || "/";
  const pdfs = loadData("pdfs.json");

  req.files.forEach(file => {
    pdfs.push({
      id: uuid(),
      name: file.originalname,
      filename: file.filename,
      folder: folderPath,
      uploadedAt: new Date().toISOString(),
      updatedAt: null,
      completed: false,
      trashed: false,
      shared: false
    });
  });

  saveData("pdfs.json", pdfs);
  res.redirect("/dashboard.html");
});

app.get("/pdfs.json", checkAuth, (req, res) => {
  const pdfs = loadData("pdfs.json");
  res.json(pdfs);
});

app.get("/folders.json", checkAuth, (req, res) => {
  const folders = loadFolderTree();
  res.json(folders);
});

["toggle-status", "toggle-share", "toggle-trash"].forEach(action => {
  app.post(`/${action}/:id`, checkAuth, (req, res) => {
    const pdfs = loadData("pdfs.json");
    const pdf = pdfs.find(p => p.id === req.params.id);
    if (pdf) {
      if (action === "toggle-status") pdf.completed = !pdf.completed;
      if (action === "toggle-share") pdf.shared = !pdf.shared;
      if (action === "toggle-trash") pdf.trashed = !pdf.trashed;
      pdf.updatedAt = new Date().toISOString();
      saveData("pdfs.json", pdfs);
    }
    res.sendStatus(200);
  });
});

app.post("/delete-all-trash", checkAuth, (req, res) => {
  let pdfs = loadData("pdfs.json");
  pdfs = pdfs.filter(p => !p.trashed);
  saveData("pdfs.json", pdfs);
  res.sendStatus(200);
});

app.get("/view/:id", (req, res) => {
  const pdfs = loadData("pdfs.json");
  const pdf = pdfs.find(p => p.id === req.params.id && p.shared && !p.trashed);
  if (!pdf) return res.status(404).send("Not found");

  res.send(`
    <html>
    <head><title>${pdf.name}</title></head>
    <body style="margin:0"><iframe style="width:100%;height:100vh" src="/uploads/${pdf.folder}/${pdf.filename}" frameborder="0"></iframe></body>
    </html>
  `);
});
app.post("/update-pdf-status/:id", (req, res) => {
  const { id } = req.params;
  const { completed, completedAt, updatedAt } = req.body;

  const pdfs = loadData("pdfs.json");
  const pdf = pdfs.find(p => p.id === id);
  if (pdf) {
    pdf.completed = completed;
    pdf.completedAt = completedAt || null;
    pdf.updatedAt = updatedAt || new Date().toISOString();
    saveData("pdfs.json", pdfs);
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});


app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
