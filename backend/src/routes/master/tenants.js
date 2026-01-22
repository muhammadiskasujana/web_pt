const express = require("express");
const router = express.Router();
const {
  createTenant,
  updateTenant,
  deleteTenant,
  getAllTenants,    // ✅ NOW ACTUALLY USED
  checkTenantTables
} = require("../../services/tenantService");
const { authenticateJWT, requireMaster } = require('../../middleware/authMiddleware');
router.use(authenticateJWT, requireMaster);

// GET all tenants - NOW USES SERVICE FUNCTION
router.get("/", async (req, res) => {
  try {
    const { includeInactive = false } = req.query;
    const list = await getAllTenants(includeInactive === 'true'); // ✅ USE SERVICE
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single tenant by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const tenant = await Tenant.findByPk(id, {
      include: [
        {
          model: require("../../models/Tier"),
          as: 'tier',
          attributes: ['id', 'name', 'description', 'limits']
        }
      ]
    });

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    res.json(tenant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET tenant tables
router.get("/:id/tables", async (req, res) => {
  try {
    const { id } = req.params;
    const tenant = await Tenant.findByPk(id);

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    const tables = await checkTenantTables(tenant.schema_name);
    res.json({
      tenant_id: id,
      schema_name: tenant.schema_name,
      tables: tables
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create tenant
router.post("/", async (req, res) => {
  try {
    const {
      name,
      slug,
      tierId,
      domain,
      enabledFeatures = [],
      metadata = {}
    } = req.body;

    const tenant = await createTenant({
      name,
      slug,
      tierId,
      domain,
      enabledFeatures,
      metadata
    });

    res.status(201).json(tenant);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      res.status(409).json({ error: "Tenant slug or domain must be unique" });
    } else if (err.message.includes("Features not available in tier")) {
      res.status(400).json({ error: err.message });
    } else if (err.message.includes("Invalid tier ID")) {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// PUT update tenant
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    delete updateData.id;

    if (updateData.enabledFeatures && !updateData.modules) {
      const modules = {};
      updateData.enabledFeatures.forEach(feature => {
        modules[feature] = true;
      });
      updateData.modules = modules;
    }

    const tenant = await updateTenant(id, updateData);
    res.json(tenant);
  } catch (err) {
    if (err.message === "Tenant not found") {
      res.status(404).json({ error: err.message });
    } else if (err.name === 'SequelizeUniqueConstraintError') {
      res.status(409).json({ error: "Tenant slug or domain must be unique" });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// PATCH activate/deactivate tenant
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: "is_active must be boolean" });
    }

    const tenant = await updateTenant(id, { is_active });
    res.json(tenant);
  } catch (err) {
    if (err.message === "Tenant not found") {
      res.status(404).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// PATCH update tenant features
router.patch("/:id/features", async (req, res) => {
  try {
    const { id } = req.params;
    const { enabledFeatures } = req.body;

    if (!Array.isArray(enabledFeatures)) {
      return res.status(400).json({ error: "enabledFeatures must be an array" });
    }

    const modules = {};
    enabledFeatures.forEach(feature => {
      modules[feature] = true;
    });

    const tenant = await updateTenant(id, { modules });
    res.json(tenant);
  } catch (err) {
    if (err.message === "Tenant not found") {
      res.status(404).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// DELETE tenant
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { hard = false } = req.query;

    const result = await deleteTenant(id, { hard: hard === 'true' });

    if (hard === 'true') {
      res.status(204).send();
    } else {
      res.json(result);
    }
  } catch (err) {
    if (err.message === "Tenant not found") {
      res.status(404).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

module.exports = router;