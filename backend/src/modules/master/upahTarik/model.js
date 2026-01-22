// modules/upahTarik/model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

function defineUpahTarikRateModel(schema) {
    return sequelize.define('UpahTarikRate', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4,
        },
        leasing_id: {
            type: DataTypes.UUID,
            allowNull: false,
            comment: 'Relasi ke Leasing',
        },
        region_id: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'Relasi ke Wilayah (opsional: kalau null artinya nasional)',
        },
        unit_type: {
            type: DataTypes.ENUM('R2', 'R4', 'OTHER'),
            allowNull: false,
            defaultValue: 'R2',
        },
        gross_fee: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            comment: 'Upah tarik kotor yang dibayarkan oleh finance ke BHJP',
        },
        bhjp_cut_percent: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 0,
            comment: 'Persentase potongan BHJP dari gross_fee sebelum dibayarkan ke Matel',
        },
        matel_net_fee: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            comment: 'Opsional: disimpan net-nya; kalau kosong bisa dihitung di runtime',
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
    }, {
        schema,
        tableName: 'upah_tarik_rates',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['leasing_id'], name: 'upah_tarik_leasing_idx' },
            { fields: ['region_id'], name: 'upah_tarik_region_idx' },
            { fields: ['unit_type'], name: 'upah_tarik_unit_type_idx' },
        ],
    });
}

module.exports = defineUpahTarikRateModel;
