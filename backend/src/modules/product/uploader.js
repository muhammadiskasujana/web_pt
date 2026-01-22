// modules/product/uploader.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function buildStorage() {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            // simpan per-tenant: uploads/<schema>/products
            const schema = req.schema || 'default';
            const dest = path.join(__dirname, '../../uploads', schema, 'products');
            ensureDir(dest);
            cb(null, dest);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            const base = path.basename(file.originalname, ext).replace(/[^a-z0-9-_]/gi, '_');
            const stamp = Date.now();
            cb(null, `${base}_${stamp}${ext}`);
        }
    });
}

const fileFilter = (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
    if (!ok) return cb(new Error('Only image files are allowed (jpg, png, webp, gif).'));
    cb(null, true);
};

const upload = multer({
    storage: buildStorage(),
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

module.exports = upload;
