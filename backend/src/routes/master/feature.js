const express = require("express");
const router = express.Router();
const featureController = require("../../controllers/featureController");
const { authenticateJWT, requireMaster } = require('../../middleware/authMiddleware');
router.use(authenticateJWT, requireMaster);


// GET all features
router.get("/", featureController.getAll);

// POST create feature
router.post("/", featureController.create);

// PUT update feature
router.put("/:id", featureController.update);

// DELETE feature
router.delete("/:id", featureController.delete);

module.exports = router;
