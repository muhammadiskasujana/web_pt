// modules/matel/model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

function defineMatelModel(schema) {
    return sequelize.define('Matel', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4,
        },
        name: {
            type: DataTypes.STRING(150),
            allowNull: false,
            validate: { notEmpty: true, len: [1, 150] },
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: false,
            validate: { notEmpty: true },
            comment: 'Nomor WA',
        },
        nik: {
            type: DataTypes.STRING(30),
            allowNull: true,
            comment: 'NIK / No KTP',
        },
        address: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        bank_account: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'No rekening / bank',
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive', 'suspended'),
            allowNull: false,
            defaultValue: 'active',
        },
        photo_url: {
            type: DataTypes.STRING(500),
            allowNull: true,
            validate: { isUrl: true },
            comment: 'Foto Matel (opsional)',
        },
        sppi: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'Misalnya nomor / kode SPPI / surat penugasan khusus',
        },
        metadata: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
        },
    }, {
        schema,
        tableName: 'matels',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['name'], name: 'matels_name_idx' },
            { fields: ['phone'], name: 'matels_phone_idx' },
            { fields: ['status'], name: 'matels_status_idx' },
        ],
        hooks: {
            beforeCreate: (matel) => {
                if (!matel.id) matel.id = uuidv4();
                if (matel.phone) matel.phone = matel.phone.trim();
            },
            beforeUpdate: (matel) => {
                if (matel.phone) matel.phone = matel.phone.trim();
            },
        },
        defaultScope: {
            order: [['created_at', 'DESC']],
        },
    });
}

module.exports = defineMatelModel;
