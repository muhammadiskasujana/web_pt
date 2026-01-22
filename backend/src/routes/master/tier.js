const express = require("express");
const router = express.Router();
const tierController = require("../../controllers/tierController");
const { authenticateJWT, requireMaster } = require('../../middleware/authMiddleware');
router.use(authenticateJWT, requireMaster);


// GET all tiers
router.get("/", tierController.getAll);

// POST create tier
router.post("/", tierController.create);

// PUT update tier
router.put("/:id", tierController.update);

// DELETE tier
router.delete("/:id", tierController.delete);

module.exports = router;
