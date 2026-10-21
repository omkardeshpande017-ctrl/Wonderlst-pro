const path = require("path");
const fs = require("fs");
const multer = require("multer");

const useCloud =
  !!process.env.CLOUD_NAME &&
  !!process.env.CLOUD_API_KEY &&
  !!process.env.CLOUD_API_SECRET;

// Serverless platforms (Vercel) mount the code read-only and have no writable
// disk, so never try to create an uploads folder there — keep files in memory
// and just echo a data URL back. Locally nothing changes.
const readOnlyFilesystem = !!process.env.VERCEL || process.env.NODE_ENV === "production";

const uploadsDir = path.join(__dirname, "..", "uploads");
if (useCloud || readOnlyFilesystem) {
  // nothing to prepare
} else {
  try {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (err) {
    console.warn("uploads folder could not be created:", err.message);
  }
}

let storage;
if (useCloud) {
  storage = require("../config/cloudinary").storage;
} else if (readOnlyFilesystem) {
  storage = multer.memoryStorage();
} else {
  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".png";
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  });
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"), false);
  },
});

// Returns { url, filename } for an uploaded file, whichever storage is active
const fileInfo = (file) => {
  if (!file) return null;
  if (useCloud) return { url: file.path, filename: file.filename };
  if (readOnlyFilesystem && file.buffer) {
    // Serverless: inline the image so it survives inside the response
    const mime = file.mimetype || "image/png";
    const dataUrl = `data:${mime};base64,${file.buffer.toString("base64")}`;
    return { url: dataUrl, filename: file.originalname || "upload" };
  }
  return { url: `/uploads/${file.filename}`, filename: file.filename };
};

module.exports = upload;
module.exports.fileInfo = fileInfo;
module.exports.useCloud = useCloud;
