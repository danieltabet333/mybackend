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

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS setup
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

app.use(express.json());

// Serve static images
app.use('/images', express.static(path.join(__dirname, 'images')));

// Multer setup for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "images")),
  filename: (req, file, cb) => cb(
    null,
    file.originalname + "_" + Date.now() + path.extname(file.originalname)
  )
});
const upload = multer({ storage });

// MySQL pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

// --------- API ROUTES ---------

// GET all menu items
app.get("/menu", (req, res) => {
  const q = "SELECT * FROM menu";
  db.query(q, (err, data) => {
    if (err) return res.json(err);
    for (const d of data) {
      if (d.image) {
        d.image = fs.readFileSync(path.join(__dirname, "images", d.image)).toString("base64");
      }
    }
    res.json(data);
  });
});

// GET single menu item
app.get("/menu/:id", (req, res) => {
  const q = "SELECT * FROM menu WHERE id = ?";
  db.query(q, [req.params.id], (err, data) => {
    if (err) return res.json(err);
    if (data[0]?.image) {
      data[0].image = fs.readFileSync(path.join(__dirname, "images", data[0].image)).toString("base64");
    }
    res.json(data[0]);
  });
});

// ADD new menu item
app.post("/menu", upload.single("image"), (req, res) => {
  const { name, description, price } = req.body;
  const image = req.file ? req.file.filename : null;
  const q = "INSERT INTO menu(`name`,`description`,`price`,`image`) VALUES (?,?,?,?)";
  db.query(q, [name, description, price, image], (err, data) => {
    if (err) return res.json(err);
    res.json(data);
  });
});

// DELETE menu item
app.delete("/menu/:id", (req, res) => {
  const q = "DELETE FROM menu WHERE id = ?";
  db.query(q, [req.params.id], (err, data) => {
    if (err) return res.json(err);
    res.json(data);
  });
});

// UPDATE menu item
app.post("/menu/:id", upload.single("image"), (req, res) => {
  const { name, description, price } = req.body;
  const image = req.file ? req.file.filename : null;

  let q, params;
  if (image) {
    q = "UPDATE menu SET `name`=?, `description`=?, `price`=?, `image`=? WHERE id=?";
    params = [name, description, price, image, req.params.id];
  } else {
    q = "UPDATE menu SET `name`=?, `description`=?, `price`=? WHERE id=?";
    params = [name, description, price, req.params.id];
  }

  db.query(q, params, (err, data) => {
    if (err) return res.json(err);
    res.json(data);
  });
});

// --------- START SERVER ---------
const PORT = process.env.PORT || 5000; // Railway will set process.env.PORT automatically
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
