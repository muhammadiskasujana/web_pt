// modules/customer/model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

function defineCustomerModel(schema) {
    return sequelize.define('Customer', {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        customer_category_id: { type: DataTypes.UUID, allowNull: true },
        code: { type: DataTypes.STRING(30), allowNull: true, unique: true, comment: 'kode unik opsional' },
        name: { type: DataTypes.STRING(255), allowNull: false },
        email: { type: DataTypes.STRING(255), allowNull: true, validate: { isEmail: true } },
        phone: { type: DataTypes.STRING(30), allowNull: true },
        address: { type: DataTypes.TEXT, allowNull: true },
        note: { type: DataTypes.TEXT, allowNull: true },
        is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    }, {
        schema,
        tableName: 'customers',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['customer_category_id'] },
            { fields: ['name'] },
            { fields: ['phone'] },
            { fields: ['created_at'] },
        ]
    });
}

function defineCustomerDepositModel(schema) {
    return sequelize.define('CustomerDeposit', {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        customer_id: { type: DataTypes.UUID, allowNull: false },
        type: { type: DataTypes.ENUM('credit','debit'), allowNull: false }, // credit=masuk, debit=keluar
        amount: { type: DataTypes.INTEGER, allowNull: false },
        reference_type: { type: DataTypes.STRING(50), allowNull: true }, // e.g. 'sales_order', 'manual'
        reference_id: { type: DataTypes.UUID, allowNull: true },
        description: { type: DataTypes.TEXT, allowNull: true },
    }, {
        schema,
        tableName: 'customer_deposits',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['customer_id'] },
            { fields: ['created_at'] }
        ]
    });
}

function defineCustomerComplaintModel(schema) {
    return sequelize.define('CustomerComplaint', {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        customer_id: { type: DataTypes.UUID, allowNull: false },
        sales_order_id: { type: DataTypes.UUID, allowNull: true },
        title: { type: DataTypes.STRING(255), allowNull: false },
        content: { type: DataTypes.TEXT, allowNull: false },
        status: { type: DataTypes.ENUM('open','in_progress','resolved','rejected'), allowNull: false, defaultValue: 'open' },
        resolution_note: { type: DataTypes.TEXT, allowNull: true },
        resolved_at: { type: DataTypes.DATE, allowNull: true },
    }, {
        schema,
        tableName: 'customer_complaints',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['customer_id'] },
            { fields: ['sales_order_id'] },
            { fields: ['status'] },
            { fields: ['created_at'] }
        ]
    });
}

module.exports = {
    defineCustomerModel,
    defineCustomerDepositModel,
    defineCustomerComplaintModel,
};
