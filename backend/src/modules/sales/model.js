// modules/sales/model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

function defineSalesOrderModel(schema) {
    return sequelize.define('SalesOrder', {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        resi_no: { type: DataTypes.STRING(30), unique: true, allowNull: false },
        customer_id: { type: DataTypes.UUID, allowNull: true },
        branch_id: { type: DataTypes.UUID, allowNull: true },
        customer_category_id: { type: DataTypes.UUID, allowNull: true },
        customer_name: { type: DataTypes.STRING(255), allowNull: false },
        deadline_at: { type: DataTypes.DATE, allowNull: true },
        payment_status: { type: DataTypes.ENUM('lunas', 'dp'), allowNull: false, defaultValue: 'lunas' },
        transaction_type: { type: DataTypes.ENUM('tunai', 'transfer'), allowNull: false, defaultValue: 'tunai' },
        progress_status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'registered' },
        created_by_user_id: { type: DataTypes.UUID, allowNull: false },
        processed_by_employee_id: { type: DataTypes.UUID, allowNull: true },

        subtotal: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        discount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        total: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        paid_amount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        balance: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

        notes: { type: DataTypes.TEXT, allowNull: true },
    }, {
        schema,
        tableName: 'sales_orders',
        timestamps: true,
        paranoid: true,
        underscored: true,                  // <= penting: created_at/updated_at/deleted_at
        indexes: [
            { fields: ['resi_no'], unique: true },
            { fields: ['payment_status'] },
            { fields: ['created_at'] },       // sekarang kolom ini ada
            { fields: ['branch_id'] },
            { fields: ['customer_id'] },
            { fields: ['customer_category_id'] },
        ]
    });
}

function defineSalesOrderItemModel(schema) {
    return sequelize.define('SalesOrderItem', {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        sales_order_id: { type: DataTypes.UUID, allowNull: false },
        product_id: { type: DataTypes.UUID, allowNull: false },
        product_name_snap: { type: DataTypes.STRING(255), allowNull: false },
        sku_snap: { type: DataTypes.STRING(50), allowNull: true },

        qty: { type: DataTypes.DECIMAL(12,2), allowNull: false },
        unit_price: { type: DataTypes.INTEGER, allowNull: false },

        is_area: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        area_w: { type: DataTypes.DECIMAL(10,2), allowNull: true },
        area_h: { type: DataTypes.DECIMAL(10,2), allowNull: true },
        area_unit_price: { type: DataTypes.INTEGER, allowNull: true },

        subtotal: { type: DataTypes.INTEGER, allowNull: false }
    }, {
        schema,
        tableName: 'sales_order_items',
        timestamps: true,
        underscored: true,                  // <= penting
        indexes: [
            { fields: ['sales_order_id'] },
            { fields: ['product_id'] },
            { fields: ['created_at'] }
        ]
    });
}

function defineSalesNoteRequestModel(schema) {
    return sequelize.define('SalesNoteRequest', {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        sales_order_id: { type: DataTypes.UUID, allowNull: false },
        type: { type: DataTypes.ENUM('revise', 'delete'), allowNull: false },
        status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'pending' },
        reason: { type: DataTypes.TEXT, allowNull: true },
        requested_by_user_id: { type: DataTypes.UUID, allowNull: false },
        approved_by_user_id: { type: DataTypes.UUID, allowNull: true },
        approved_at: { type: DataTypes.DATE, allowNull: true },
        payload_diff: { type: DataTypes.JSONB, allowNull: true },
    }, {
        schema,
        tableName: 'sales_note_requests',
        timestamps: true,
        underscored: true,                  // <= penting
        indexes: [
            { fields: ['sales_order_id'] },
            { fields: ['status'] },
            { fields: ['type'] },
            { fields: ['created_at'] }
        ]
    });
}

function defineSalesNoteActionLogModel(schema) {
    return sequelize.define('SalesNoteActionLog', {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        sales_order_id: { type: DataTypes.UUID, allowNull: false },
        action: { type: DataTypes.STRING(50), allowNull: false },
        actor_user_id: { type: DataTypes.UUID, allowNull: false },
        meta: { type: DataTypes.JSONB, allowNull: true },
    }, {
        schema,
        tableName: 'sales_note_action_logs',
        timestamps: true,
        underscored: true,                  // <= penting
        indexes: [
            { fields: ['sales_order_id'] },
            { fields: ['created_at'] }
        ]
    });
}

module.exports = {
    defineSalesOrderModel,
    defineSalesOrderItemModel,
    defineSalesNoteRequestModel,
    defineSalesNoteActionLogModel,
};