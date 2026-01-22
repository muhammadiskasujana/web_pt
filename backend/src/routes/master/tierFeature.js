const express = require("express");
const router = express.Router();
const tierFeatureController = require("../../controllers/tierFeatureController");
const { authenticateJWT, requireMaster } = require('../../middleware/authMiddleware');
router.use(authenticateJWT, requireMaster);
// GET all tier-features
router.get("/", tierFeatureController.getAll);

// GET tier-features by tier
router.get("/tier/:tierId", tierFeatureController.getByTier);

// POST create tier-feature
router.post("/", tierFeatureController.create);

// PUT update tier-feature
router.put("/:id", tierFeatureController.update);

// DELETE tier-feature
router.delete("/:id", tierFeatureController.delete);

// PUT enable feature for tier
router.put("/tier/:tierId/feature/:featureId/enable", tierFeatureController.enableFeature);

// PUT disable feature for tier
router.put("/tier/:tierId/feature/:featureId/disable", tierFeatureController.disableFeature);

module.exports = router;