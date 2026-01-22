// modules/user/model.js
const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");
const { v4: uuidv4 } = require('uuid');

function defineUserModel(schema) {
    return sequelize.define(
        "User",
        {
            id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
            name: {
                type: DataTypes.STRING(255),
                allowNull: false,
                validate: { len: [1, 255], notEmpty: true },
            },
            email: {
                type: DataTypes.STRING(255),
                allowNull: false,
                unique: true,
                validate: { isEmail: true, notEmpty: true },
            },
            password_hash: {
                type: DataTypes.STRING(255),
                allowNull: false,
                validate: { notEmpty: true, len: [6, 255] },
            },

            // SYSTEM ROLE
            role: {
                type: DataTypes.ENUM("owner", "admin", "kasir", "viewer"),
                allowNull: false,
                defaultValue: "kasir",
            },

            // NEW: EXPLICIT PERMISSIONS (Postgres text[])
            permissions: {
                // gunakan ARRAY supaya simpel; kalau nanti mau lebih kompleks bisa pindah ke tabel relasi
                type: DataTypes.ARRAY(DataTypes.STRING),
                allowNull: false,
                defaultValue: [],
                comment: "List permission key, ex: ['sales.read','sales.create'] atau ['*'] untuk full access"
            },

            device_id: { type: DataTypes.STRING(255), allowNull: true, validate: { len: [1, 255] } },

            first_name: { type: DataTypes.STRING(100), allowNull: true },
            last_name: { type: DataTypes.STRING(100), allowNull: true },
            phone: { type: DataTypes.STRING(20), allowNull: true },
            avatar_url: { type: DataTypes.STRING(500), allowNull: true, validate: { isUrl: true } },

            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            last_login_at: { type: DataTypes.DATE, allowNull: true },
            email_verified_at: { type: DataTypes.DATE, allowNull: true },

            // reset password fields
            reset_otp: { type: DataTypes.STRING(6), allowNull: true },
            reset_otp_expires_at: { type: DataTypes.DATE, allowNull: true },
            reset_otp_attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

            preferences: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
            metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
        },
        {
            schema,
            tableName: "users",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            indexes: [
                { unique: true, fields: ["email"], name: "users_email_unique_idx" },
                { fields: ["role"], name: "users_role_idx" },
                { fields: ["is_active"], name: "users_is_active_idx" },
                { fields: ["created_at"], name: "users_created_at_idx" },
                { fields: ["last_login_at"], name: "users_last_login_at_idx" },
                { fields: ["device_id"], name: "users_device_id_idx" },
                { fields: ["reset_otp"], name: "users_reset_otp_idx" },
                { fields: ["reset_otp_expires_at"], name: "users_reset_otp_expires_at_idx" },
            ],
            hooks: {
                beforeCreate: (user) => {
                    if (user.email) user.email = user.email.toLowerCase().trim();
                    if (!user.device_id) user.device_id = uuidv4();
                },
                beforeUpdate: (user) => {
                    if (user.email) user.email = user.email.toLowerCase().trim();
                },
            },
            defaultScope: {
                attributes: { exclude: ["password_hash", "reset_otp"] },
            },
            scopes: {
                withPassword: { attributes: { include: ["password_hash"] } },
                withOTP: {
                    attributes: { include: ["reset_otp", "reset_otp_expires_at", "reset_otp_attempts"] },
                },
                active: { where: { is_active: true } },
            },
        }
    );
}

module.exports = defineUserModel;
