// modules/payable/model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

function definePayableModel(schema) {
    return sequelize.define('Payable', {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        expense_id: { type: DataTypes.UUID, allowNull: false },
        supplier_name: { type: DataTypes.STRING(255), allowNull: false },
        total_due: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        balance: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        installments_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
        status: { type: DataTypes.ENUM('open','closed'), allowNull: false, defaultValue:'open' },
        next_due_at: { type: DataTypes.DATE, allowNull: true },
    }, {
        schema, tableName: 'payables', timestamps: true,
        indexes: [{ fields: ['expense_id'] }, { fields: ['status'] }]
    });
}

function definePayableScheduleModel(schema) {
    return sequelize.define('PayableSchedule', {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        payable_id: { type: DataTypes.UUID, allowNull: false },
        installment_no: { type: DataTypes.INTEGER, allowNull: false },
        due_at: { type: DataTypes.DATE, allowNull: false },
        amount: { type: DataTypes.INTEGER, allowNull: false },
        paid_amount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        status: { type: DataTypes.ENUM('unpaid','partial','paid'), allowNull: false, defaultValue: 'unpaid' },
    }, {
        schema, tableName: 'payable_schedules', timestamps: true,
        indexes: [{ fields: ['payable_id'] }, { fields: ['status'] }]
    });
}

function definePayablePaymentModel(schema) {
    return sequelize.define('PayablePayment', {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        payable_id: { type: DataTypes.UUID, allowNull: false },
        paid_at: { type: DataTypes.DATE, allowNull: false },
        amount: { type: DataTypes.INTEGER, allowNull: false },
        method: { type: DataTypes.ENUM('tunai','transfer'), allowNull: false, defaultValue:'tunai' },
        reference_no: { type: DataTypes.STRING(50), allowNull: true },
        notes: { type: DataTypes.TEXT, allowNull: true }
    }, {
        schema, tableName: 'payable_payments', timestamps: true,
        indexes: [{ fields: ['payable_id'] }]
    });
}

module.exports = {
    definePayableModel,
    definePayableScheduleModel,
    definePayablePaymentModel,
};
