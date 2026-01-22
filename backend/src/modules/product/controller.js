const { Op } = require("sequelize");
const path = require('path');
const fs = require('fs');
const TenantModelLoader = require("../../tenants/loader");

class ProductController {
    // List + filter + paging
    async getAll(req, res) {
        try {
            const schema = req.schema;
            if (!schema) return res.status(400).json({ error: "Tenant context missing", code: "TENANT_REQUIRED" });

            const { q, category_id, size_category_id, unit_category_id, is_active, page = 1, limit = 10 } = req.query;
            const Product = TenantModelLoader.getModel("Product", schema);
            const ProductCategory = TenantModelLoader.getModel("ProductCategory", schema);
            const SizeCategory = TenantModelLoader.getModel("SizeCategory", schema);
            const UnitCategory = TenantModelLoader.getModel("UnitCategory", schema);

            const where = {};
            if (q) where.name = { [Op.iLike]: `%${q}%` };
            if (category_id) where.product_category_id = category_id;
            if (size_category_id) where.size_category_id = size_category_id;
            if (unit_category_id) where.unit_category_id = unit_category_id;
            if (is_active !== undefined) where.is_active = is_active === "true";

            const offset = (parseInt(page) - 1) * parseInt(limit);

            const { count, rows } = await Product.findAndCountAll({
                where,
                include: [
                    { model: ProductCategory, as: "category", attributes: ["id", "name"] },
                    { model: SizeCategory, as: "sizeCategory", attributes: ["id", "name", "unit"] },
                    { model: UnitCategory, as: "unitCategory", attributes: ["id", "name", "abbreviation"] },
                ],
                order: [["created_at", "DESC"]],
                limit: parseInt(limit),
                offset,
            });

            res.json({
                products: rows,
                pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / parseInt(limit)) },
            });
        } catch (err) {
            console.error("Get products error:", err);
            res.status(500).json({ error: "Internal server error", code: "SERVER_ERROR" });
        }
    }

    async getById(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error: "Tenant context missing", code: "TENANT_REQUIRED" });

            const Product = TenantModelLoader.getModel("Product", schema);
            const ProductCategory = TenantModelLoader.getModel("ProductCategory", schema);
            const SizeCategory = TenantModelLoader.getModel("SizeCategory", schema);
            const UnitCategory = TenantModelLoader.getModel("UnitCategory", schema);
            const ProductSpecialPrice = TenantModelLoader.getModel("ProductSpecialPrice", schema);
            const CustomerCategory = TenantModelLoader.getModel("CustomerCategory", schema);

            const product = await Product.findByPk(id, {
                include: [
                    { model: ProductCategory, as: "category", attributes: ["id", "name"] },
                    { model: SizeCategory, as: "sizeCategory", attributes: ["id", "name", "unit"] },
                    { model: UnitCategory, as: "unitCategory", attributes: ["id", "name", "abbreviation"] },
                    {
                        model: ProductSpecialPrice,
                        as: "specialPrices",
                        include: [{ model: CustomerCategory, as: "customerCategory", attributes: ["id", "name"] }],
                    },
                ],
            });

            if (!product) return res.status(404).json({ error: "Product not found", code: "PRODUCT_NOT_FOUND" });
            res.json({ product });
        } catch (err) {
            console.error("Get product error:", err);
            res.status(500).json({ error: "Internal server error", code: "SERVER_ERROR" });
        }
    }

    // helper public URL
    buildPublicUrl(req, absPath) {
        // cari relative dari folder uploads
        const uploadsRoot = path.join(__dirname, '../../uploads');
        let rel = path.relative(uploadsRoot, absPath).split(path.sep).join('/'); // normalize slash
        // protocol aman di belakang proxy
        const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http');
        const host = req.get('host');
        return `${proto}://${host}/uploads/${rel}`;
    }

    // helper hapus file aman
    safeUnlink(absPath) {
        if (!absPath) return;
        fs.promises.unlink(absPath).catch(() => {});
    }

    // ============ MULTI IMAGE ============

    // POST /api/products/:id/images  (multipart form-data, field: images[])
    async addImages(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error: "Tenant context missing", code: "TENANT_REQUIRED" });

            const Product = TenantModelLoader.getModel("Product", schema);
            const ProductImage = TenantModelLoader.getModel("ProductImage", schema);

            const product = await Product.findByPk(id);
            if (!product) return res.status(404).json({ error: "Product not found", code: "PRODUCT_NOT_FOUND" });

            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ error: "No files uploaded", code: "NO_FILES" });
            }

            const created = [];
            for (const file of req.files) {
                const abs = file.path;
                const url = this.buildPublicUrl(req, abs);
                const img = await ProductImage.create({
                    product_id: id,
                    url,
                    path: abs,
                    is_primary: false
                });
                created.push(img);
            }

            return res.status(201).json({ message: "Images added", images: created });
        } catch (err) {
            console.error("Add images error:", err);
            res.status(500).json({ error: "Internal server error", code: "SERVER_ERROR" });
        }
    }

    // GET /api/products/:id/images
    async listImages(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error: "Tenant context missing", code: "TENANT_REQUIRED" });

            const Product = TenantModelLoader.getModel("Product", schema);
            const ProductImage = TenantModelLoader.getModel("ProductImage", schema);

            const product = await Product.findByPk(id);
            if (!product) return res.status(404).json({ error: "Product not found", code: "PRODUCT_NOT_FOUND" });

            const images = await ProductImage.findAll({
                where: { product_id: id },
                order: [['is_primary', 'DESC'], ['created_at', 'ASC']]
            });

            res.json({ images });
        } catch (err) {
            console.error("List images error:", err);
            res.status(500).json({ error: "Internal server error", code: "SERVER_ERROR" });
        }
    }

    // PUT /api/products/:id/images/:imageId/primary
    async setPrimaryImage(req, res) {
        try {
            const schema = req.schema;
            const { id, imageId } = req.params;
            if (!schema) return res.status(400).json({ error: "Tenant context missing", code: "TENANT_REQUIRED" });

            const Product = TenantModelLoader.getModel("Product", schema);
            const ProductImage = TenantModelLoader.getModel("ProductImage", schema);

            const product = await Product.findByPk(id);
            if (!product) return res.status(404).json({ error: "Product not found", code: "PRODUCT_NOT_FOUND" });

            const img = await ProductImage.findOne({ where: { id: imageId, product_id: id } });
            if (!img) return res.status(404).json({ error: "Image not found", code: "IMAGE_NOT_FOUND" });

            // reset semua is_primary = false
            await ProductImage.update({ is_primary: false }, { where: { product_id: id } });
            // set yang dipilih jadi true
            await img.update({ is_primary: true });

            // Opsional: update juga foto utama product (photo_url) supaya konsisten
            await product.update({ photo_url: img.url });

            res.json({ message: "Primary image set", image: img });
        } catch (err) {
            console.error("Set primary image error:", err);
            res.status(500).json({ error: "Internal server error", code: "SERVER_ERROR" });
        }
    }

    // DELETE /api/products/:id/images/:imageId
    async deleteImage(req, res) {
        try {
            const schema = req.schema;
            const { id, imageId } = req.params;
            if (!schema) return res.status(400).json({ error: "Tenant context missing", code: "TENANT_REQUIRED" });

            const Product = TenantModelLoader.getModel("Product", schema);
            const ProductImage = TenantModelLoader.getModel("ProductImage", schema);

            const product = await Product.findByPk(id);
            if (!product) return res.status(404).json({ error: "Product not found", code: "PRODUCT_NOT_FOUND" });

            const img = await ProductImage.findOne({ where: { id: imageId, product_id: id } });
            if (!img) return res.status(404).json({ error: "Image not found", code: "IMAGE_NOT_FOUND" });

            // kalau image yang dihapus adalah primary dan sama dengan photo_url produk → kosongkan photo_url
            if (img.is_primary && product.photo_url === img.url) {
                await product.update({ photo_url: null });
            }

            // hapus file fisik
            if (img.path) this.safeUnlink(img.path);

            await img.destroy();
            res.json({ message: "Image deleted" });
        } catch (err) {
            console.error("Delete image error:", err);
            res.status(500).json({ error: "Internal server error", code: "SERVER_ERROR" });
        }
    }

    // ============ HAPUS FOTO UTAMA (bukan dari tabel images) ============

    // DELETE /api/products/:id/photo
    async deleteMainPhoto(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error: "Tenant context missing", code: "TENANT_REQUIRED" });

            const Product = TenantModelLoader.getModel("Product", schema);
            const ProductImage = TenantModelLoader.getModel("ProductImage", schema);

            const product = await Product.findByPk(id);
            if (!product) return res.status(404).json({ error: "Product not found", code: "PRODUCT_NOT_FOUND" });

            // Hapus file fisik jika kita menyimpan path foto utama di kolom photo_path (opsional)
            if (product.photo_path) this.safeUnlink(product.photo_path);

            // Kosongkan foto utama
            await product.update({ photo_url: null, photo_path: null });

            // (opsional) reset semua is_primary di images
            await ProductImage.update({ is_primary: false }, { where: { product_id: id } });

            res.json({ message: "Main photo removed" });
        } catch (err) {
            console.error("Delete main photo error:", err);
            res.status(500).json({ error: "Internal server error", code: "SERVER_ERROR" });
        }
    }

    async create(req, res) {
        try {
            const schema = req.schema;
            if (!schema) return res.status(400).json({ error: "Tenant context missing", code: "TENANT_REQUIRED" });

            const {
                name,
                sku, // optional
                product_category_id,
                size_category_id,
                unit_category_id,
                price_normal = 0,
                is_stock = true,
                stock = 0,
                is_area = false,
                metadata = {},
            } = req.body;

            if (!name) return res.status(400).json({ error: "Name is required", code: "MISSING_NAME" });

            const Product = TenantModelLoader.getModel("Product", schema);

            // file upload (optional)
            let photo_url = null;
            let photo_abs_path = null;
            if (req.file) {
                photo_abs_path = req.file.path; // absolute path
                photo_url = this.buildPublicUrl(req, photo_abs_path);
            }

            const product = await Product.create({
                name,
                sku,
                product_category_id,
                size_category_id,
                unit_category_id,
                price_normal,
                is_stock,
                stock,
                is_area,
                photo_url,              // simpan URL publik
                photo_path: photo_abs_path || null, // OPTIONAL: kalau di model kamu tambahkan kolom ini
                metadata,
            });

            res.status(201).json({ message: "Product created", product });
        } catch (err) {
            if (err.name === "SequelizeUniqueConstraintError") {
                return res.status(409).json({ error: "SKU already exists", code: "SKU_EXISTS" });
            }
            console.error("Create product error:", err);
            res.status(500).json({ error: "Internal server error", code: "SERVER_ERROR" });
        }
    }

    async update(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error: "Tenant context missing", code: "TENANT_REQUIRED" });

            const Product = TenantModelLoader.getModel("Product", schema);
            const product = await Product.findByPk(id);
            if (!product) return res.status(404).json({ error: "Product not found", code: "PRODUCT_NOT_FOUND" });

            const updates = { ...req.body };

            // SKU normalisasi
            if (updates.sku) updates.sku = String(updates.sku).toUpperCase().trim();

            // jika ada file baru → generate url & hapus file lama
            if (req.file) {
                const newAbs = req.file.path;
                updates.photo_url = this.buildPublicUrl(req, newAbs);
                updates.photo_path = newAbs; // OPTIONAL kolom
                // hapus lama bila ada & kolom photo_path tersedia
                if (product.photo_path) this.safeUnlink(product.photo_path);
            }

            await product.update(updates);
            res.json({ message: "Product updated", product });
        } catch (err) {
            if (err.name === "SequelizeUniqueConstraintError") {
                return res.status(409).json({ error: "SKU already exists", code: "SKU_EXISTS" });
            }
            console.error("Update product error:", err);
            res.status(500).json({ error: "Internal server error", code: "SERVER_ERROR" });
        }
    }

    async delete(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error: "Tenant context missing", code: "TENANT_REQUIRED" });

            const Product = TenantModelLoader.getModel("Product", schema);
            const product = await Product.findByPk(id);
            if (!product) return res.status(404).json({ error: "Product not found", code: "PRODUCT_NOT_FOUND" });

            // hapus file fisik kalau ada path-nya
            if (product.photo_path) this.safeUnlink(product.photo_path);

            await product.destroy();
            res.json({ message: "Product deleted" });
        } catch (err) {
            console.error("Delete product error:", err);
            res.status(500).json({ error: "Internal server error", code: "SERVER_ERROR" });
        }
    }

    // ===== Special Price per Customer Category =====
    async upsertSpecialPrice(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params; // product id
            const { customer_category_id, special_price, valid_from = null, valid_to = null } = req.body;

            if (!schema) return res.status(400).json({ error: "Tenant context missing", code: "TENANT_REQUIRED" });
            if (!customer_category_id || special_price == null) {
                return res.status(400).json({ error: "customer_category_id and special_price are required", code: "MISSING_FIELDS" });
            }

            const Product = TenantModelLoader.getModel("Product", schema);
            const ProductSpecialPrice = TenantModelLoader.getModel("ProductSpecialPrice", schema);

            const product = await Product.findByPk(id);
            if (!product) return res.status(404).json({ error: "Product not found", code: "PRODUCT_NOT_FOUND" });

            const [psp, created] = await ProductSpecialPrice.findOrCreate({
                where: { product_id: id, customer_category_id },
                defaults: { special_price, valid_from, valid_to },
            });

            if (!created) {
                await psp.update({ special_price, valid_from, valid_to });
            }

            res.json({ message: created ? "Special price created" : "Special price updated", special_price: psp });
        } catch (err) {
            console.error("Upsert special price error:", err);
            res.status(500).json({ error: "Internal server error", code: "SERVER_ERROR" });
        }
    }

    async removeSpecialPrice(req, res) {
        try {
            const schema = req.schema;
            const { id, pspId } = req.params;
            if (!schema) return res.status(400).json({ error: "Tenant context missing", code: "TENANT_REQUIRED" });

            const ProductSpecialPrice = TenantModelLoader.getModel("ProductSpecialPrice", schema);
            const psp = await ProductSpecialPrice.findOne({ where: { id: pspId, product_id: id } });
            if (!psp) return res.status(404).json({ error: "Special price not found", code: "SPECIAL_PRICE_NOT_FOUND" });

            await psp.destroy();
            res.json({ message: "Special price removed" });
        } catch (err) {
            console.error("Remove special price error:", err);
            res.status(500).json({ error: "Internal server error", code: "SERVER_ERROR" });
        }
    }
}

module.exports = new ProductController();
