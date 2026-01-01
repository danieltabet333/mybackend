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

// ----------- Serve images folder -----------
app.use('/images', express.static(path.join(__dirname, 'images')));

// ----------- Multer setup for uploads -----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "images")),
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

// Get all menu items
app.get("/menu", (req, res) => {
  db.query("SELECT * FROM menu", (err, data) => {
    if (err) return res.status(500).json(err);

    const result = data.map(d => {
      if (d.image) {
        const imgPath = path.join(__dirname, 'images', d.image);
        if (fs.existsSync(imgPath)) d.image = fs.readFileSync(imgPath).toString('base64');
      }
      return d;
    });

    res.json(result);
  });
});

// Get single menu item by ID
app.get("/menu/:id", (req, res) => {
  db.query("SELECT * FROM menu WHERE id = ?", [req.params.id], (err, data) => {
    if (err) return res.status(500).json(err);

    if (data[0]?.image) {
      const imgPath = path.join(__dirname, 'images', data[0].image);
      if (fs.existsSync(imgPath)) data[0].image = fs.readFileSync(imgPath).toString('base64');
    }

    res.json(data[0]);
  });
});

// Create new menu item
app.post("/menu", upload.single("image"), (req, res) => {
  const { name, description, price } = req.body;
  const image = req.file?.filename || null;
  db.query(
    "INSERT INTO menu(`name`,`description`,`price`,`image`) VALUES (?,?,?,?)",
    [name, description, price, image],
    (err, data) => {
      if (err) return res.status(500).json(err);
      res.json(data);
    }
  );
});

// Update menu item
app.post("/menu/:id", upload.single("image"), (req, res) => {
  const { name, description, price } = req.body;
  const image = req.file?.filename || null;

  const q = image
    ? "UPDATE menu SET `name`=?, `description`=?, `price`=?, `image`=? WHERE id=?"
    : "UPDATE menu SET `name`=?, `description`=?, `price`=? WHERE id=?";

  const params = image
    ? [name, description, price, image, req.params.id]
    : [name, description, price, req.params.id];

  db.query(q, params, (err, data) => {
    if (err) return res.status(500).json(err);
    res.json(data);
  });
});

// Delete menu item
app.delete("/menu/:id", (req, res) => {
  db.query("DELETE FROM menu WHERE id = ?", [req.params.id], (err, data) => {
    if (err) return res.status(500).json(err);
    res.json(data);
  });
});

// ----------- Start server -----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
