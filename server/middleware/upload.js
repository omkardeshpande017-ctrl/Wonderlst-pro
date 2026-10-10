const path = require("path");
const fs = require("fs");
const multer = require("multer");

const useCloud =
  !!process.env.CLOUD_NAME &&
  !!process.env.CLOUD_API_KEY &&
  !!process.env.CLOUD_API_SECRET;

const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

let storage;
if (useCloud) {
  storage = require("../config/cloudinary").storage;
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
  return { url: `/uploads/${file.filename}`, filename: file.filename };
};

module.exports = upload;
module.exports.fileInfo = fileInfo;
module.exports.useCloud = useCloud;
