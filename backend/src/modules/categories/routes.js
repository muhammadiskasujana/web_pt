const express = require("express");
const router = express.Router();
const categoriesController = require("./controller");
const tenantResolver = require("../../middleware/tenantResolver");
const { authenticateJWT } = require("../../middleware/authMiddleware");

// izin: owner/admin manage, semua tenant user read
const canManage = async (req, res, next) => {
    const currentUser = req.user;
    if (currentUser.role === "master") return next();
    if (currentUser.role === "tenant") {
        const schema = req.schema;
        if (!schema) return res.status(400).json({ error: "Tenant context missing", code: "TENANT_REQUIRED" });
        const TenantModelLoader = require("../../tenants/loader");
        const User = TenantModelLoader.getModel("User", schema);
        const actor = await User.findByPk(currentUser.userId);
        if (actor && ["owner", "admin"].includes(actor.role)) return next();
    }
    return res.status(403).json({ error: "Insufficient permissions", code: "INSUFFICIENT_PERMISSIONS" });
};

const canRead = async (req, res, next) => {
    const currentUser = req.user;
    if (currentUser.role === "master") return next();
    if (currentUser.role === "tenant") return next();
    return res.status(403).json({ error: "Insufficient permissions", code: "INSUFFICIENT_PERMISSIONS" });
};

// Auth
router.use(authenticateJWT);

// generic: /api/catalog/:type(product|size|unit|customer)
router.get("/:type", tenantResolver, canRead, categoriesController.list.bind(categoriesController));
router.get("/:type/:id", tenantResolver, canRead, categoriesController.getById.bind(categoriesController));
router.post("/:type", tenantResolver, canManage, categoriesController.create.bind(categoriesController));
router.put("/:type/:id", tenantResolver, canManage, categoriesController.update.bind(categoriesController));
router.delete("/:type/:id", tenantResolver, canManage, categoriesController.delete.bind(categoriesController));

module.exports = router;
