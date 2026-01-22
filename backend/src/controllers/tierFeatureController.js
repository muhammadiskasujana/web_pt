const tierFeatureService = require("../services/tierFeatureService");

exports.getAll = async (req, res) => {
    try {
        const tierFeatures = await tierFeatureService.getAllTierFeatures();
        res.json(tierFeatures);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getByTier = async (req, res) => {
    try {
        const { tierId } = req.params;
        const tierFeatures = await tierFeatureService.getTierFeaturesByTier(tierId);
        res.json(tierFeatures);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const { tier_id, feature_id, is_enabled, config } = req.body;
        const tierFeature = await tierFeatureService.createTierFeature({
            tier_id,
            feature_id,
            is_enabled,
            config,
        });
        res.status(201).json(tierFeature);
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            res.status(409).json({ error: "TierFeature relationship already exists" });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const tierFeature = await tierFeatureService.updateTierFeature(id, req.body);
        res.json(tierFeature);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        await tierFeatureService.deleteTierFeature(id);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.enableFeature = async (req, res) => {
    try {
        const { tierId, featureId } = req.params;
        const { config } = req.body;
        const tierFeature = await tierFeatureService.enableFeatureForTier(
            tierId,
            featureId,
            config
        );
        res.json(tierFeature);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.disableFeature = async (req, res) => {
    try {
        const { tierId, featureId } = req.params;
        const tierFeature = await tierFeatureService.disableFeatureForTier(
            tierId,
            featureId
        );
        res.json(tierFeature);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};