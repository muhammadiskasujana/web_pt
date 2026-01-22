// modules/pool/model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

function definePoolModel(schema) {
    return sequelize.define('Pool', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4,
        },
        code: {
            type: DataTypes.STRING(30),
            allowNull: false,
            unique: true,
            validate: { notEmpty: true },
            comment: 'Kode pool, misal POOL_BJB1',
        },
        name: {
            type: DataTypes.STRING(150),
            allowNull: false,
            validate: { notEmpty: true },
        },
        region_id: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'Relasi ke Region (opsional)',
        },
        address: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        city: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        capacity: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Perkiraan kapasitas unit',
        },
        pic_name: {
            type: DataTypes.STRING(150),
            allowNull: true,
        },
        pic_phone: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        latitude: {
            type: DataTypes.DECIMAL(10, 7),
            allowNull: true,
        },
        longitude: {
            type: DataTypes.DECIMAL(10, 7),
            allowNull: true,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        metadata: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
        },
    }, {
        schema,
        tableName: 'pools',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['code'], name: 'pools_code_unique_idx' },
            { fields: ['name'], name: 'pools_name_idx' },
            { fields: ['region_id'], name: 'pools_region_idx' },
            { fields: ['is_active'], name: 'pools_is_active_idx' },
        ],
        defaultScope: {
            where: { is_active: true },
            order: [['name', 'ASC']],
        },
        scopes: {
            all: { where: {} },
        },
    });
}

module.exports = definePoolModel;
