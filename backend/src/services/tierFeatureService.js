const TierFeature = require("../models/tierFeature");
const Tier = require("../models/Tier");
const Feature = require("../models/Feature");

async function getAllTierFeatures() {
    return TierFeature.findAll({
        include: [
            { model: Tier, as: 'tier', attributes: ['id', 'name'] }, // Use 'as: tier' alias
            { model: Feature, as: 'feature', attributes: ['id', 'key', 'name'] } // Use 'as: feature' alias
        ]
    });
}

async function getTierFeaturesByTier(tierId) {
    return TierFeature.findAll({
        where: { tier_id: tierId },
        include: [{ model: Feature, as: 'feature', attributes: ['id', 'key', 'name'] }] // Use 'as: feature' alias
    });
}

async function createTierFeature(data) {
    const { tier_id, feature_id, is_enabled = true, config = {} } = data;

    // Check if tier and feature exist
    const tier = await Tier.findByPk(tier_id);
    if (!tier) throw new Error("Tier not found");

    const feature = await Feature.findByPk(feature_id);
    if (!feature) throw new Error("Feature not found");

    return TierFeature.create({
        tier_id,
        feature_id,
        is_enabled,
        config
    });
}

async function updateTierFeature(id, data) {
    const tierFeature = await TierFeature.findByPk(id);
    if (!tierFeature) throw new Error("TierFeature not found");

    const updates = {};
    if (data.is_enabled !== undefined) updates.is_enabled = data.is_enabled;
    if (data.config !== undefined) updates.config = data.config;

    return tierFeature.update(updates);
}

async function deleteTierFeature(id) {
    const tierFeature = await TierFeature.findByPk(id);
    if (!tierFeature) throw new Error("TierFeature not found");
    await tierFeature.destroy();
    return true;
}

async function enableFeatureForTier(tierId, featureId, config = {}) {
    const [tierFeature, created] = await TierFeature.findOrCreate({
        where: { tier_id: tierId, feature_id: featureId },
        defaults: { is_enabled: true, config }
    });

    if (!created && !tierFeature.is_enabled) {
        await tierFeature.update({ is_enabled: true, config });
    }

    return tierFeature;
}

async function disableFeatureForTier(tierId, featureId) {
    const tierFeature = await TierFeature.findOne({
        where: { tier_id: tierId, feature_id: featureId }
    });

    if (!tierFeature) throw new Error("TierFeature relationship not found");

    return tierFeature.update({ is_enabled: false });
}

module.exports = {
    getAllTierFeatures,
    getTierFeaturesByTier,
    createTierFeature,
    updateTierFeature,
    deleteTierFeature,
    enableFeatureForTier,
    disableFeatureForTier,
};