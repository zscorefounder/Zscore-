import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standardize path resolution using process.cwd()
const ROOT = process.cwd();
const THUMBNAILS_PATH = path.join(ROOT, "src", "data", "thumbnails.json");
const BTS_PATH = path.join(ROOT, "src", "data", "bts.json");
const COMMENTS_PATH = path.join(ROOT, "src", "data", "comments.json");
const HERO_PATH = path.join(ROOT, "src", "data", "hero_thumbnails.json");
const POSTS_PATH = path.join(ROOT, "src", "data", "random_posts.json");

// Ensure data folder exists
const DATA_DIR = path.join(ROOT, "src", "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase limit for base64 images
  app.use(express.json({ limit: "50mb" }));

  // Helper to read JSON safely
  const readData = (filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) return [];
      const content = fs.readFileSync(filePath, "utf-8");
      if (!content || content.trim() === "") return [];
      return JSON.parse(content);
    } catch (e) {
      console.error(`Error reading ${filePath}:`, e);
      return [];
    }
  };

  // Helper to write JSON safely
  const writeData = (filePath: string, data: any) => {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (e) {
      console.error(`Error writing ${filePath}:`, e);
      return false;
    }
  };

  // --- API Routes ---

  // Thumbnails
  app.get("/api/thumbnails", (req, res) => {
    const data = readData(THUMBNAILS_PATH);
    res.json(data);
  });

  app.post("/api/thumbnails", (req, res) => {
    const items = readData(THUMBNAILS_PATH);
    const newItem = { ...req.body, createdAt: new Date().toISOString() };
    items.unshift(newItem);
    if (writeData(THUMBNAILS_PATH, items)) {
      res.status(201).json(newItem);
    } else {
      res.status(500).json({ error: "Failed to save" });
    }
  });

  app.delete("/api/thumbnails/:id", (req, res) => {
    let items = readData(THUMBNAILS_PATH);
    items = items.filter((i: any) => i.id !== req.params.id);
    if (writeData(THUMBNAILS_PATH, items)) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to delete" });
    }
  });

  app.patch("/api/thumbnails/:id", (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    let items = readData(THUMBNAILS_PATH);
    const index = items.findIndex((i: any) => i.id === id);
    if (index === -1) return res.status(404).json({ error: "Not found" });
    
    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    if (writeData(THUMBNAILS_PATH, items)) {
      res.json(items[index]);
    } else {
      res.status(500).json({ error: "Failed to update" });
    }
  });

  // BTS (Behind The Scenes)
  app.get("/api/bts", (req, res) => {
    const data = readData(BTS_PATH);
    res.json(data);
  });

  app.post("/api/bts", (req, res) => {
    const items = readData(BTS_PATH);
    const newItem = { ...req.body, createdAt: new Date().toISOString() };
    items.unshift(newItem);
    if (writeData(BTS_PATH, items)) {
      res.status(201).json(newItem);
    } else {
      res.status(500).json({ error: "Failed to save" });
    }
  });

  app.delete("/api/bts/:id", (req, res) => {
    let items = readData(BTS_PATH);
    items = items.filter((i: any) => i.id !== req.params.id);
    if (writeData(BTS_PATH, items)) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to delete" });
    }
  });

  app.patch("/api/bts/:id", (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    let items = readData(BTS_PATH);
    const index = items.findIndex((i: any) => i.id === id);
    if (index === -1) return res.status(404).json({ error: "Not found" });
    
    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    if (writeData(BTS_PATH, items)) {
      res.json(items[index]);
    } else {
      res.status(500).json({ error: "Failed to update" });
    }
  });

  // Comments (Testimonials)
  app.get("/api/comments", (req, res) => {
    const data = readData(COMMENTS_PATH);
    res.json(data);
  });

  app.post("/api/comments", (req, res) => {
    const data = req.body;
    const items = readData(COMMENTS_PATH);
    const newItem = { ...data, id: `cmt-${Date.now()}`, createdAt: new Date().toISOString() };
    items.unshift(newItem);
    if (writeData(COMMENTS_PATH, items)) {
      res.json(newItem);
    } else {
      res.status(500).json({ error: "Failed to save comment" });
    }
  });

  app.delete("/api/comments/:id", (req, res) => {
    let items = readData(COMMENTS_PATH);
    items = items.filter((i: any) => i.id !== req.params.id);
    if (writeData(COMMENTS_PATH, items)) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // Hero Thumbnails
  app.get("/api/hero-thumbnails", (req, res) => {
    res.json(readData(HERO_PATH));
  });

  app.post("/api/hero-thumbnails", (req, res) => {
    const data = req.body;
    const items = readData(HERO_PATH);
    const newItem = { ...data, id: `hero-${Date.now()}` };
    items.unshift(newItem);
    if (writeData(HERO_PATH, items)) res.json(newItem);
    else res.status(500).json({ error: "Failed to save hero thumbnail" });
  });

  app.delete("/api/hero-thumbnails/:id", (req, res) => {
    let items = readData(HERO_PATH);
    items = items.filter((i: any) => i.id !== req.params.id);
    if (writeData(HERO_PATH, items)) res.json({ success: true });
    else res.status(500).json({ error: "Failed to delete" });
  });

  // Random Posts
  app.get("/api/posts", (req, res) => {
    res.json(readData(POSTS_PATH));
  });

  app.post("/api/posts", (req, res) => {
    const data = req.body;
    const items = readData(POSTS_PATH);
    const newItem = { ...data, id: `post-${Date.now()}`, createdAt: new Date().toISOString() };
    items.unshift(newItem);
    if (writeData(POSTS_PATH, items)) res.json(newItem);
    else res.status(500).json({ error: "Failed to save post" });
  });

  app.delete("/api/posts/:id", (req, res) => {
    let items = readData(POSTS_PATH);
    items = items.filter((i: any) => i.id !== req.params.id);
    if (writeData(POSTS_PATH, items)) res.json({ success: true });
    else res.status(500).json({ error: "Failed to delete" });
  });

  // --- Vite & Static Assets ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(ROOT, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Z-Score Server running at http://localhost:${PORT}`);
    console.log(`Database Path: ${THUMBNAILS_PATH}`);
  });
}

startServer();
