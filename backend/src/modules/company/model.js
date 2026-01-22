const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

function defineCompanyProfileModel(schema) {
    return sequelize.define(
        'CompanyProfile',
        {
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            name: { type: DataTypes.STRING(255), allowNull: false },
            legal_name: { type: DataTypes.STRING(255), allowNull: true },
            tax_id: { type: DataTypes.STRING(64), allowNull: true },
            phone: { type: DataTypes.STRING(32), allowNull: true },
            email: { type: DataTypes.STRING(255), allowNull: true, validate: { isEmail: true } },
            address: { type: DataTypes.TEXT, allowNull: true },
            city: { type: DataTypes.STRING(100), allowNull: true },
            country: { type: DataTypes.STRING(100), allowNull: true },
            logo_url: { type: DataTypes.STRING(500), allowNull: true },
            logo_path: { type: DataTypes.STRING(500), allowNull: true },
            theme: {
                // untuk FE: warna primer/sekunder, font, dsb
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: { primary: '#0ea5e9', secondary: '#111827', mode: 'light' }
            },
            structure: {
                // struktur organisasi ringkas (opsional)
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {}
            },
            metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
            is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
        },
        {
            schema,
            tableName: 'company_profiles',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    );
}

module.exports = defineCompanyProfileModel;
