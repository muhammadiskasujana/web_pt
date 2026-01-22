// Tenant-scoped Navigation Menu
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

function defineNavMenuModel(schema){
    return sequelize.define('NavMenu', {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        // Nama set menu (kalau mau banyak varian; default satu aja "main")
        key: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'main' },
        name: { type: DataTypes.STRING(120), allowNull: false, defaultValue: 'Main Menu' },
        is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, { schema, tableName: 'nav_menus', underscored: true, timestamps: true });
}

function defineNavItemModel(schema){
    return sequelize.define('NavItem', {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        menu_id: { type: DataTypes.UUID, allowNull: false },

        // struktur
        parent_id: { type: DataTypes.UUID, allowNull: true }, // null = root
        order_index: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        group_label: { type: DataTypes.STRING(80), allowNull: true }, // "Aktivitas", "Operasional", ...

        // tampilan
        label: { type: DataTypes.STRING(120), allowNull: false },
        path: { type: DataTypes.STRING(255), allowNull: true }, // route path
        icon: { type: DataTypes.STRING(60), allowNull: true }, // nama ikon lucide (e.g. "Package")

        // kontrol akses
        roles_allowed: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true }, // ['owner','manager','admin','user']
        features_required: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true }, // ['products','sales'] → cocok dgn modules

        is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, { schema, tableName: 'nav_items', underscored: true, timestamps: true, indexes: [
            { fields:['menu_id'] }, { fields:['parent_id'] }, { fields:['order_index'] },
        ]});
}

module.exports = { defineNavMenuModel, defineNavItemModel };
