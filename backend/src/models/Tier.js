const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Tier = sequelize.define(
  "Tier",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.TEXT, allowNull: false, unique: true },
    description: { type: DataTypes.TEXT },
    limits: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  },
  {
    tableName: "tiers",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = Tier;