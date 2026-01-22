const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Tenant = sequelize.define(
  "Tenant",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: DataTypes.STRING,
    slug: DataTypes.STRING,
    schema_name: DataTypes.STRING,
    domain: DataTypes.STRING,
    tier_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "tiers", key: "id" },
      onDelete: "SET NULL",
    },
    modules: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} }, // Added allowNull: false
    metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} }, // Added allowNull: false
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }, // Added allowNull: false
  },
  {
    tableName: "tenants",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = Tenant;