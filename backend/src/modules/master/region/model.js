// modules/region/model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

function defineRegionModel(schema) {
    return sequelize.define('Region', {
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
            comment: 'Kode wilayah, misal KALSEL01, JKT_BARAT, dsb.',
        },
        name: {
            type: DataTypes.STRING(150),
            allowNull: false,
            validate: { notEmpty: true },
            comment: 'Nama wilayah tampil di UI',
        },
        province: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        city: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        district: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        postal_code: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        notes: {
            type: DataTypes.TEXT,
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
        tableName: 'regions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['code'], name: 'regions_code_unique_idx' },
            { fields: ['name'], name: 'regions_name_idx' },
            { fields: ['province'], name: 'regions_province_idx' },
            { fields: ['is_active'], name: 'regions_is_active_idx' },
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

module.exports = defineRegionModel;
