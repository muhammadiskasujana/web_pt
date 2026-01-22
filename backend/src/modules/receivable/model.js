// modules/receivable/model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

function defineReceivableModel(schema) {
    return sequelize.define('Receivable', {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        sales_order_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: { tableName: 'sales_orders', schema }, // penting: tableName + schema
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        // ⬇⬇⬇ Tambahkan ini agar match dengan association di TenantModelLoader
        customer_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: { tableName: 'customers', schema }, key: 'id' },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
        },

        customer_name: { type: DataTypes.STRING(255), allowNull: false },
        total_due: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        balance: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        installments_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
        schedule_type: { type: DataTypes.ENUM('auto', 'custom'), allowNull: false, defaultValue: 'auto' },
        status: { type: DataTypes.ENUM('open','closed'), allowNull: false, defaultValue:'open' },
        next_due_at: { type: DataTypes.DATE, allowNull: true },
    }, {
        schema, tableName: 'receivables', timestamps: true,
        indexes: [{ fields: ['sales_order_id'] }, { fields: ['status'] }, { fields: ['customer_id'] }]
    });
}

function defineReceivableScheduleModel(schema) {
    return sequelize.define('ReceivableSchedule', {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        // ⬇⬇⬇ Pastikan FK ke Receivable juga CASCADE
        receivable_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: { tableName: 'receivables', schema },
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        installment_no: { type: DataTypes.INTEGER, allowNull: false },
        due_at: { type: DataTypes.DATE, allowNull: false },
        amount: { type: DataTypes.INTEGER, allowNull: false },
        paid_amount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        status: { type: DataTypes.ENUM('unpaid','partial','paid'), allowNull: false, defaultValue: 'unpaid' },
    }, {
        schema, tableName: 'receivable_schedules', timestamps: true,
        indexes: [{ fields: ['receivable_id'] }, { fields: ['status'] }, { fields: ['due_at'] }]
    });
}

function defineReceivablePaymentModel(schema) {
    return sequelize.define('ReceivablePayment', {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        // ⬇⬇⬇ FK ke Receivable CASCADE
        receivable_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: { tableName: 'receivables', schema },
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        paid_at: { type: DataTypes.DATE, allowNull: false },
        amount: { type: DataTypes.INTEGER, allowNull: false },
        method: { type: DataTypes.ENUM('tunai','transfer'), allowNull: false, defaultValue:'tunai' },
        reference_no: { type: DataTypes.STRING(50), allowNull: true },
        notes: { type: DataTypes.TEXT, allowNull: true }
    }, {
        schema, tableName: 'receivable_payments', timestamps: true,
        indexes: [{ fields: ['receivable_id'] }, { fields: ['paid_at'] }]
    });
}

module.exports = {
    defineReceivableModel,
    defineReceivableScheduleModel,
    defineReceivablePaymentModel,
};
