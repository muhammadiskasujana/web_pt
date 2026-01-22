const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Feature = sequelize.define(
  "Feature",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    key: { type: DataTypes.TEXT, allowNull: false, unique: true }, // Changed to TEXT to match schema
    name: { type: DataTypes.TEXT, allowNull: false }, // Changed to TEXT to match schema
    description: DataTypes.TEXT,
  },
  {
    tableName: "features",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = Feature;