const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const UserRole = sequelize.define('UserRole', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
    },
    name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true,
            len: [1, 50],
        },
    },
    display_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 100],
        },
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Role hierarchy level (higher = more permissions)',
    },
    permissions: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of permission strings',
    },
    is_system: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'System roles cannot be deleted',
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'ID of the user who created this role',
    },
}, {
    tableName: 'user_roles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['name'],
            unique: true,
        },
        {
            fields: ['level'],
        },
        {
            fields: ['is_active'],
        },
    ],
});

module.exports = UserRole;