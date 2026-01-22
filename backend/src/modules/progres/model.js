const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

function defineProgressCategoryModel(schema){
    return sequelize.define('ProgressCategory', {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        name: { type: DataTypes.STRING(120), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        is_locked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    }, { schema, tableName: 'progress_categories', underscored: true });
}

function defineProgressStageModel(schema){
    return sequelize.define('ProgressStage', {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        // ⬇⬇⬇ FK ke Receivable CASCADE
        // ⬇⬇⬇ FK ke ProgressCategory (BENAR)
        category_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: { tableName: 'progress_categories', schema },
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },

        name: { type: DataTypes.STRING(120), allowNull: false },
        order_index: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        sla_hours: { type: DataTypes.INTEGER, allowNull: true },
        color: { type: DataTypes.STRING(20), allowNull: true },
    }, { schema, tableName: 'progress_stages', underscored: true });
}

function defineProgressInstanceModel(schema){
    return sequelize.define('ProgressInstance', {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        // ⬇⬇⬇ FK ke SalesOrder (WAJIB CASCADE agar ikut terhapus)
        sales_order_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: { tableName: 'sales_orders', schema },
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },

        // ⬇⬇⬇ (opsional) FK ke SalesOrderItem, ikut CASCADE
        sales_order_item_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: { tableName: 'sales_order_items', schema },
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        product_id: { type: DataTypes.UUID, allowNull: false },
        product_name: { type: DataTypes.STRING(255), allowNull: false },
        // ⬇⬇⬇ FK ke ProgressCategory (boleh CASCADE)
        category_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: { tableName: 'progress_categories', schema },
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        pic_user_id: { type: DataTypes.UUID, allowNull: true },
        // ⬇⬇⬇ current_stage_id: SET NULL saat stage dihapus (lebih aman)
        current_stage_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: { tableName: 'progress_stages', schema },
                key: 'id',
            },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
        },
        percent: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
        status: { type: DataTypes.ENUM('ongoing','done','canceled'), allowNull: false, defaultValue: 'ongoing' },
        notes: { type: DataTypes.TEXT, allowNull: true },
        started_at: { type: DataTypes.DATE, allowNull: true },
        finished_at: { type: DataTypes.DATE, allowNull: true },
    }, { schema, tableName: 'progress_instances', underscored: true });
}

function defineProgressInstanceStageModel(schema){
    return sequelize.define('ProgressInstanceStage', {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        // ⬇⬇⬇ FK ke Instance (WAJIB CASCADE)
        instance_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: { tableName: 'progress_instances', schema },
                key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },

        // ⬇⬇⬇ FK ke Stage (biasanya RESTRICT / CASCADE tergantung kebijakan)
        stage_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: { tableName: 'progress_stages', schema },
                key: 'id',
            },
            onDelete: 'CASCADE', // jika stage dihapus, jejak instance_stage ikut terhapus
            onUpdate: 'CASCADE',
        },
        name: { type: DataTypes.STRING(120), allowNull: false },
        order_index: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        status: { type: DataTypes.ENUM('pending','in_progress','done','canceled'), allowNull: false, defaultValue: 'pending' },
        started_at: { type: DataTypes.DATE, allowNull: true },
        finished_at: { type: DataTypes.DATE, allowNull: true },
        actor_user_id: { type: DataTypes.UUID, allowNull: true },
        remarks: { type: DataTypes.TEXT, allowNull: true },
    }, { schema, tableName: 'progress_instance_stages', underscored: true });
}

module.exports = {
    defineProgressCategoryModel,
    defineProgressStageModel,
    defineProgressInstanceModel,
    defineProgressInstanceStageModel,
};