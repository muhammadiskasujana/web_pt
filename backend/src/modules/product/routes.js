// modules/product/routes.js
const express = require('express');
const router = express.Router();
const productController = require('./controller');
const { authenticateJWT } = require('../../middleware/authMiddleware');
const tenantResolver = require('../../middleware/tenantResolver');
const upload = require('./uploader');

// semua endpoint produk butuh auth + tenant
router.use(authenticateJWT, tenantResolver);

// list & detail
router.get('/', productController.getAll.bind(productController));
router.get('/:id', productController.getById.bind(productController));

// create dengan foto (field name: "photo")
router.post(
    '/',
    upload.single('photo'),
    productController.create.bind(productController)
);

// update bisa ganti foto (optional)
router.put(
    '/:id',
    upload.single('photo'),
    productController.update.bind(productController)
);

// hapus
router.delete('/:id', productController.delete.bind(productController));

// special price
router.post('/:id/special-prices', productController.upsertSpecialPrice.bind(productController));
router.delete('/:id/special-prices/:pspId', productController.removeSpecialPrice.bind(productController));

// ====== Multi Images ======
// Tambah banyak gambar (field array: "images")
router.post('/:id/images', upload.array('images', 10), productController.addImages.bind(productController));
// List gambar
router.get('/:id/images', productController.listImages.bind(productController));
// Set primary
router.put('/:id/images/:imageId/primary', productController.setPrimaryImage.bind(productController));
// Hapus satu gambar
router.delete('/:id/images/:imageId', productController.deleteImage.bind(productController));

// ====== Hapus foto utama produk ======
router.delete('/:id/photo', productController.deleteMainPhoto.bind(productController));


module.exports = router;
