const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

function defineEmployeeModel(schema) {
    return sequelize.define(
        'Employee',
        {
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            branch_id: { type: DataTypes.UUID, allowNull: true },
            code: { type: DataTypes.STRING(32), allowNull: false, unique: true },
            full_name: { type: DataTypes.STRING(255), allowNull: false },
            email: { type: DataTypes.STRING(255), allowNull: true, validate: { isEmail: true } },
            phone: { type: DataTypes.STRING(32), allowNull: true },
            address: { type: DataTypes.TEXT, allowNull: true },
            position: { type: DataTypes.STRING(120), allowNull: true },
            join_date: { type: DataTypes.DATE, allowNull: true },
            // payroll ringkas
            base_salary: { type: DataTypes.DECIMAL(18,2), allowNull: false, defaultValue: 0 },
            allowance: { type: DataTypes.DECIMAL(18,2), allowNull: false, defaultValue: 0 },
            deduction: { type: DataTypes.DECIMAL(18,2), allowNull: false, defaultValue: 0 },
            pay_cycle: { type: DataTypes.ENUM('monthly','weekly','daily'), defaultValue: 'monthly' },
            bank_name: { type: DataTypes.STRING(120), allowNull: true },
            bank_account_no: { type: DataTypes.STRING(120), allowNull: true },
            photo_url: { type: DataTypes.STRING(500), allowNull: true },
            photo_path: { type: DataTypes.STRING(500), allowNull: true },
            user_id: { type: DataTypes.UUID, allowNull: true }, // link ke tabel User (tenant)
            is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
            metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} }
        },
        {
            schema,
            tableName: 'employees',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            indexes: [{ unique: true, fields: ['code'] }, { fields: ['branch_id'] }]
        }
    );
}

module.exports = defineEmployeeModel;
