const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const TierFeature = sequelize.define(
  "TierFeature",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tier_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "tiers", key: "id" },
      onDelete: "CASCADE",
    },
    feature_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "features", key: "id" },
      onDelete: "CASCADE",
    },
    is_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    config: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  },
  {
    tableName: "tier_features",
    timestamps: false, // table has no created_at/updated_at
    indexes: [
      {
        unique: true,
        fields: ["tier_id", "feature_id"],
        name: "tier_features_tier_id_feature_id_key",
      },
    ],
  }
);

module.exports = TierFeature;