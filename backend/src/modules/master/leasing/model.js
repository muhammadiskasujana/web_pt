// modules/leasing/model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

function defineLeasingModel(schema) {
    return sequelize.define('Leasing', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4,
        },
        code: {
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true,
            validate: { notEmpty: true },
            comment: 'Kode leasing, misal ADIRA, BFI, WOM, dsb.',
        },
        name: {
            type: DataTypes.STRING(150),
            allowNull: false,
            validate: { notEmpty: true },
        },
        pic_name: {
            type: DataTypes.STRING(150),
            allowNull: true,
            comment: 'Nama PIC utama',
        },
        pic_position: {
            type: DataTypes.ENUM('HO', 'AREA', 'CABANG'),
            allowNull: true,
        },
        pic_phone: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: 'No WA PIC',
        },
        sla_days: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'SLA pembayaran (hari)',
        },
        address: {
            type: DataTypes.TEXT,
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
        tableName: 'leasings',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['code'], name: 'leasings_code_unique_idx' },
            { fields: ['name'], name: 'leasings_name_idx' },
            { fields: ['is_active'], name: 'leasings_is_active_idx' },
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

module.exports = defineLeasingModel;
