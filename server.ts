import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { readDriveFile, writeDriveFile, getDriveClient } from "./src/server/driveService.ts";
import { uploadImage, deleteImage as deleteCloudinaryImage } from "./src/server/cloudinaryService.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standardize path resolution using process.cwd()
const ROOT = process.cwd();
const THUMBNAILS_FILE = "thumbnails.json";
const BTS_FILE = "bts.json";
const COMMENTS_FILE = "comments.json";
const HERO_FILE = "hero_thumbnails.json";
const POSTS_FILE = "random_posts.json";

// For local fallback
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

  const isDriveEnabled = !!(await getDriveClient());
  const isCloudinaryEnabled = !!process.env.CLOUDINARY_CLOUD_NAME;
  console.log(`Backend Mode: ${isDriveEnabled ? "GOOGLE DRIVE" : "LOCAL FILESYSTEM"}`);
  console.log(`Media Mode: ${isCloudinaryEnabled ? "CLOUDINARY" : "LOCAL/BASE64"}`);

  // Increase limit for base64 images
  app.use(express.json({ limit: "100mb" }));

  // Cloudinary Config Check
  app.get("/api/admin/cloudinary-check", async (req, res) => {
    const config = {
      cloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: !!process.env.CLOUDINARY_API_KEY,
      apiSecret: !!process.env.CLOUDINARY_API_SECRET,
      // Add debug info without exposing secrets
      details: {
        cloudNameValue: process.env.CLOUDINARY_CLOUD_NAME?.substring(0, 5) + '...',
        keyLen: process.env.CLOUDINARY_API_KEY?.length || 0,
        secretLen: process.env.CLOUDINARY_API_SECRET?.length || 0
      }
    };
    res.json(config);
  });

  // Helper to read data
  const readData = async (fileName: string, localPath: string) => {
    if (isDriveEnabled) {
      return await readDriveFile(fileName);
    }
    try {
      if (!fs.existsSync(localPath)) return [];
      const content = fs.readFileSync(localPath, "utf-8");
      if (!content || content.trim() === "") return [];
      return JSON.parse(content);
    } catch (e) {
      console.error(`Error reading ${localPath}:`, e);
      return [];
    }
  };

  // Helper to write data
  const writeData = async (fileName: string, localPath: string, data: any) => {
    if (isDriveEnabled) {
      return await writeDriveFile(fileName, data);
    }
    try {
      fs.writeFileSync(localPath, JSON.stringify(data, null, 2));
      return true;
    } catch (e) {
      console.error(`Error writing ${localPath}:`, e);
      return false;
    }
  };

  // --- API Routes ---

  // Thumbnails
  app.get("/api/thumbnails", async (req, res) => {
    const data = await readData(THUMBNAILS_FILE, THUMBNAILS_PATH);
    res.json(data);
  });

  app.post("/api/thumbnails", async (req, res) => {
    const items = await readData(THUMBNAILS_FILE, THUMBNAILS_PATH) as any[];
    const id = `thumb-${Date.now()}`;
    let imageUrl = req.body.imageUrl;

    // Upload to Cloudinary if it's base64
    if (isCloudinaryEnabled && imageUrl && imageUrl.startsWith('data:image')) {
      const uploadedUrl = await uploadImage(imageUrl);
      if (uploadedUrl) imageUrl = uploadedUrl;
    }

    const newItem = { ...req.body, id, imageUrl, createdAt: new Date().toISOString() };
    items.unshift(newItem);
    if (await writeData(THUMBNAILS_FILE, THUMBNAILS_PATH, items)) {
      res.status(201).json(newItem);
    } else {
      res.status(500).json({ error: "Failed to save" });
    }
  });

  app.delete("/api/thumbnails/:id", async (req, res) => {
    const { id } = req.params;
    let items = await readData(THUMBNAILS_FILE, THUMBNAILS_PATH) as any[];
    const itemToDelete = items.find((i: any) => i.id === id);
    
    // Optional: Delete from Cloudinary if it's an uploaded asset
    // This requires storing publicId, skipping for now unless needed.

    items = items.filter((i: any) => i.id !== id);
    if (await writeData(THUMBNAILS_FILE, THUMBNAILS_PATH, items)) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to delete" });
    }
  });

  app.patch("/api/thumbnails/:id", async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    let items = await readData(THUMBNAILS_FILE, THUMBNAILS_PATH) as any[];
    const index = items.findIndex((i: any) => i.id === id);
    if (index === -1) return res.status(404).json({ error: "Not found" });
    
    let imageUrl = updates.imageUrl || items[index].imageUrl;
    if (isCloudinaryEnabled && imageUrl && imageUrl.startsWith('data:image')) {
      const uploadedUrl = await uploadImage(imageUrl);
      if (uploadedUrl) imageUrl = uploadedUrl;
    }

    const updatedItem = { ...items[index], ...updates, imageUrl, updatedAt: new Date().toISOString() };
    items[index] = updatedItem;
    if (await writeData(THUMBNAILS_FILE, THUMBNAILS_PATH, items)) {
      res.json(updatedItem);
    } else {
      res.status(500).json({ error: "Failed to update" });
    }
  });

  // BTS (Behind The Scenes)
  app.get("/api/bts", async (req, res) => {
    const data = await readData(BTS_FILE, BTS_PATH);
    res.json(data);
  });

  app.post("/api/bts", async (req, res) => {
    const items = await readData(BTS_FILE, BTS_PATH) as any[];
    const id = `bts-${Date.now()}`;
    let imageUrl = req.body.imageUrl;

    if (isCloudinaryEnabled && imageUrl && imageUrl.startsWith('data:image')) {
      const uploadedUrl = await uploadImage(imageUrl);
      if (uploadedUrl) imageUrl = uploadedUrl;
    }

    const newItem = { ...req.body, id, imageUrl, createdAt: new Date().toISOString() };
    items.unshift(newItem);
    if (await writeData(BTS_FILE, BTS_PATH, items)) {
      res.status(201).json(newItem);
    } else {
      res.status(500).json({ error: "Failed to save" });
    }
  });

  app.delete("/api/bts/:id", async (req, res) => {
    const { id } = req.params;
    let items = await readData(BTS_FILE, BTS_PATH) as any[];
    items = items.filter((i: any) => i.id !== id);
    if (await writeData(BTS_FILE, BTS_PATH, items)) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to delete" });
    }
  });

  app.patch("/api/bts/:id", async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    let items = await readData(BTS_FILE, BTS_PATH) as any[];
    const index = items.findIndex((i: any) => i.id === id);
    if (index === -1) return res.status(404).json({ error: "Not found" });
    
    let imageUrl = updates.imageUrl || items[index].imageUrl;
    if (isCloudinaryEnabled && imageUrl && imageUrl.startsWith('data:image')) {
      const uploadedUrl = await uploadImage(imageUrl);
      if (uploadedUrl) imageUrl = uploadedUrl;
    }

    const updatedItem = { ...items[index], ...updates, imageUrl, updatedAt: new Date().toISOString() };
    items[index] = updatedItem;
    if (await writeData(BTS_FILE, BTS_PATH, items)) {
      res.json(updatedItem);
    } else {
      res.status(500).json({ error: "Failed to update" });
    }
  });

  // Comments (Testimonials)
  app.get("/api/comments", async (req, res) => {
    const data = await readData(COMMENTS_FILE, COMMENTS_PATH);
    res.json(data);
  });

  app.post("/api/comments", async (req, res) => {
    const id = `cmt-${Date.now()}`;
    const newItem = { ...req.body, id, createdAt: new Date().toISOString() };
    
    const items = await readData(COMMENTS_FILE, COMMENTS_PATH) as any[];
    items.unshift(newItem);
    if (await writeData(COMMENTS_FILE, COMMENTS_PATH, items)) {
      res.json(newItem);
    } else {
      res.status(500).json({ error: "Failed to save comment" });
    }
  });

  app.delete("/api/comments/:id", async (req, res) => {
    const { id } = req.params;
    let items = await readData(COMMENTS_FILE, COMMENTS_PATH) as any[];
    items = items.filter((i: any) => i.id !== id);
    if (await writeData(COMMENTS_FILE, COMMENTS_PATH, items)) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // Hero Thumbnails
  app.get("/api/hero-thumbnails", async (req, res) => {
    res.json(await readData(HERO_FILE, HERO_PATH));
  });

  app.post("/api/hero-thumbnails", async (req, res) => {
    const id = `hero-${Date.now()}`;
    let imageUrl = req.body.imageUrl;

    if (isCloudinaryEnabled && imageUrl && imageUrl.startsWith('data:image')) {
      const uploadedUrl = await uploadImage(imageUrl);
      if (uploadedUrl) imageUrl = uploadedUrl;
    }

    const newItem = { ...req.body, id, imageUrl };
    const items = await readData(HERO_FILE, HERO_PATH) as any[];
    items.unshift(newItem);
    if (await writeData(HERO_FILE, HERO_PATH, items)) res.json(newItem);
    else res.status(500).json({ error: "Failed to save hero thumbnail" });
  });

  app.delete("/api/hero-thumbnails/:id", async (req, res) => {
    const { id } = req.params;
    let items = await readData(HERO_FILE, HERO_PATH) as any[];
    items = items.filter((i: any) => i.id !== id);
    if (await writeData(HERO_FILE, HERO_PATH, items)) res.json({ success: true });
    else res.status(500).json({ error: "Failed to delete" });
  });

  // Random Posts
  app.get("/api/posts", async (req, res) => {
    res.json(await readData(POSTS_FILE, POSTS_PATH));
  });

  app.post("/api/posts", async (req, res) => {
    const id = `post-${Date.now()}`;
    const newItem = { ...req.body, id, createdAt: new Date().toISOString() };
    
    const items = await readData(POSTS_FILE, POSTS_PATH) as any[];
    items.unshift(newItem);
    if (await writeData(POSTS_FILE, POSTS_PATH, items)) res.json(newItem);
    else res.status(500).json({ error: "Failed to save post" });
  });

  app.delete("/api/posts/:id", async (req, res) => {
    const { id } = req.params;
    let items = await readData(POSTS_FILE, POSTS_PATH) as any[];
    items = items.filter((i: any) => i.id !== id);
    if (await writeData(POSTS_FILE, POSTS_PATH, items)) res.json({ success: true });
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
