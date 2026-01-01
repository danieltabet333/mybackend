// server.js
import express from "express";
import mysql from "mysql2";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

// ----------- Fix __dirname for ES modules -----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------- App setup -----------
const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());

// ✅ ROOT ROUTE — MUST BE AFTER app is created
app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "DreamTime backend is running"
  });
});

// ----------- Ensure images folder exists -----------
const imagesDir = path.join(__dirname, "images");
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// ----------- Serve images folder -----------
app.use("/images", express.static(imagesDir));

// ----------- Multer setup -----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, imagesDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// ----------- MySQL Pool -----------
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306
});

// ----------- ROUTES -----------

app.get("/menu", (req, res) => {
  db.query("SELECT * FROM menu", (err, data) => {
    if (err) return res.status(500).json(err);
    res.json(data);
  });
});

app.get("/menu/:id", (req, res) => {
  db.query("SELECT * FROM menu WHERE id = ?", [req.params.id], (err, data) => {
    if (err) return res.status(500).json(err);
    res.json(data[0]);
  });
});

app.post("/menu", upload.single("image"), (req, res) => {
  const { name, description, price } = req.body;
  const image = req.file?.filename || null;

  db.query(
    "INSERT INTO menu (`name`,`description`,`price`,`image`) VALUES (?,?,?,?)",
    [name, description, price, image],
    (err, data) => {
      if (err) return res.status(500).json(err);
      res.json(data);
    }
  );
});

app.delete("/menu/:id", (req, res) => {
  db.query("DELETE FROM menu WHERE id = ?", [req.params.id], (err, data) => {
    if (err) return res.status(500).json(err);
    res.json(data);
  });
});

// ----------- Start server -----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
