const Tier = require('./Tier');
const Feature = require('./Feature');
const TierFeature = require('./tierFeature');
const Tenant = require('./Tenant');

// Many-to-many through TierFeature
Tier.belongsToMany(Feature, {
    through: TierFeature,
    foreignKey: 'tier_id',
    otherKey: 'feature_id',
    onDelete: 'CASCADE',
    as: 'features' // Add alias
});

Feature.belongsToMany(Tier, {
    through: TierFeature,
    foreignKey: 'feature_id',
    otherKey: 'tier_id',
    onDelete: 'CASCADE',
    as: 'tiers' // Add alias
});

// Direct associations for includes
TierFeature.belongsTo(Tier, {
    foreignKey: 'tier_id',
    as: 'tier' // Add alias
});
TierFeature.belongsTo(Feature, {
    foreignKey: 'feature_id',
    as: 'feature' // Add alias
});

// Inverse associations
Tier.hasMany(TierFeature, {
    foreignKey: 'tier_id',
    as: 'tierFeatures'
});
Feature.hasMany(TierFeature, {
    foreignKey: 'feature_id',
    as: 'tierFeatures'
});

// Tenant belongs to Tier
Tenant.belongsTo(Tier, {
    foreignKey: 'tier_id',
    as: 'tier'
});
Tier.hasMany(Tenant, {
    foreignKey: 'tier_id',
    as: 'tenants'
});

module.exports = { Tier, Feature, TierFeature, Tenant };