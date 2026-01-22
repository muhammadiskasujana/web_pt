// modules/docType/model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

function defineDocTypeModel(schema) {
    return sequelize.define('DocType', {
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
            comment: 'Kode dokumen, misal FOTO_UNIT, BA_TARIK, SK_PENARIKAN',
        },
        name: {
            type: DataTypes.STRING(150),
            allowNull: false,
            validate: { notEmpty: true },
        },
        category: {
            type: DataTypes.ENUM('TARIKAN', 'SK', 'ALL'),
            allowNull: false,
            defaultValue: 'ALL',
            comment: 'Dipakai di mana: dokumen tarikan, SK, atau keduanya',
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        is_required: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Wajib di-upload untuk proses tertentu',
        },
        sort_order: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
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
        tableName: 'doc_types',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['code'], name: 'doc_types_code_unique_idx' },
            { fields: ['category'], name: 'doc_types_category_idx' },
            { fields: ['is_active'], name: 'doc_types_is_active_idx' },
        ],
        defaultScope: {
            where: { is_active: true },
            order: [['sort_order', 'ASC'], ['name', 'ASC']],
        },
        scopes: {
            all: { where: {} },
        },
    });
}

module.exports = defineDocTypeModel;
