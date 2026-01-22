// modules/whatsapp/model.js
const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

// Session
function defineWhatsappSessionModel(schema) {
    return sequelize.define(
        "WhatsappSession",
        {
            id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },

            name: { type: DataTypes.STRING(120), allowNull: false },

            user_id: { type: DataTypes.UUID, allowNull: true },

            // ✅ Tambah session_mode_id
            session_mode_id: { type: DataTypes.UUID, allowNull: true },

            status: {
                type: DataTypes.ENUM("created", "starting", "connected", "disconnected", "stopped", "error"),
                allowNull: false,
                defaultValue: "created",
            },

            wa_number: { type: DataTypes.STRING(32), allowNull: true },
            device_name: { type: DataTypes.STRING(120), allowNull: true },

            last_qr_at: { type: DataTypes.DATE, allowNull: true },
            connected_at: { type: DataTypes.DATE, allowNull: true },
            disconnected_at: { type: DataTypes.DATE, allowNull: true },

            meta: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },

            created_by: { type: DataTypes.UUID, allowNull: true },
            updated_by: { type: DataTypes.UUID, allowNull: true },
        },
        {
            schema,
            tableName: "whatsapp_sessions",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            underscored: true,
            indexes: [
                { fields: ["status"], name: "wa_session_status_idx" },
                { fields: ["wa_number"], name: "wa_session_number_idx" },
                { fields: ["created_at"], name: "wa_session_created_idx" },
                { fields: ["name"], name: "wa_session_name_idx" },
                { fields: ["session_mode_id"], name: "wa_session_mode_idx" },
            ],
            defaultScope: {},
            scopes: {},
        }
    );
}

// ✅ List Session Mode
function defineWhatsappSessionModeModel(schema) {
    return sequelize.define(
        "WhatsappSessionMode",
        {
            id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
            name: { type: DataTypes.STRING(100), allowNull: false },
            description: { type: DataTypes.TEXT, allowNull: true },
            config: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} }, // config khusus untuk mode ini
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            created_by: { type: DataTypes.UUID, allowNull: true },
            updated_by: { type: DataTypes.UUID, allowNull: true },
        },
        {
            schema,
            tableName: "whatsapp_session_modes",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            underscored: true,
            indexes: [
                { fields: ["name"], name: "wa_session_mode_name_idx" },
                { fields: ["is_active"], name: "wa_session_mode_active_idx" },
            ],
        }
    );
}

// ✅ Groups yang bot ada di dalamnya
function defineWhatsappGroupModel(schema) {
    return sequelize.define(
        "WhatsappGroup",
        {
            id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },

            session_id: { type: DataTypes.UUID, allowNull: false }, // relasi ke session
            group_jid: { type: DataTypes.STRING(100), allowNull: false, unique: true }, // ID group WhatsApp
            group_name: { type: DataTypes.STRING(200), allowNull: true },

            // ✅ Aktif/nonaktif group
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

            // ✅ Mode group
            group_mode_id: { type: DataTypes.UUID, allowNull: true },

            // ✅ Detail mode (keterangan tambahan)
            detail_mode_id: { type: DataTypes.UUID, allowNull: true },

            // ✅ Izin akses group
            permission_type: {
                type: DataTypes.ENUM("umum", "privat", "admin"),
                allowNull: false,
                defaultValue: "umum"
            },

            // ✅ Metadata group (participants, description, dll)
            group_metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },

            // Admin group (array JID)
            group_admins: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },

            // Participants group (array JID)
            group_participants: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },

            last_updated_metadata: { type: DataTypes.DATE, allowNull: true },

            created_by: { type: DataTypes.UUID, allowNull: true },
            updated_by: { type: DataTypes.UUID, allowNull: true },
        },
        {
            schema,
            tableName: "whatsapp_groups",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            underscored: true,
            indexes: [
                { fields: ["session_id"], name: "wa_group_session_idx" },
                { fields: ["group_jid"], name: "wa_group_jid_idx" },
                { fields: ["is_active"], name: "wa_group_active_idx" },
                { fields: ["group_mode_id"], name: "wa_group_mode_idx" },
                { fields: ["permission_type"], name: "wa_group_permission_idx" },
            ],
        }
    );
}

// ✅ List Mode Group
function defineWhatsappGroupModeModel(schema) {
    return sequelize.define(
        "WhatsappGroupMode",
        {
            id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
            name: { type: DataTypes.STRING(100), allowNull: false },
            description: { type: DataTypes.TEXT, allowNull: true },
            config: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            created_by: { type: DataTypes.UUID, allowNull: true },
            updated_by: { type: DataTypes.UUID, allowNull: true },
        },
        {
            schema,
            tableName: "whatsapp_group_modes",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            underscored: true,
            indexes: [
                { fields: ["name"], name: "wa_group_mode_name_idx" },
                { fields: ["is_active"], name: "wa_group_mode_active_idx" },
            ],
        }
    );
}

// ✅ Detail Mode (keterangan tambahan untuk mode)
function defineWhatsappDetailModeModel(schema) {
    return sequelize.define(
        "WhatsappDetailMode",
        {
            id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
            group_mode_id: { type: DataTypes.UUID, allowNull: false }, // relasi ke group mode
            name: { type: DataTypes.STRING(100), allowNull: false },
            description: { type: DataTypes.TEXT, allowNull: true },
            config: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            created_by: { type: DataTypes.UUID, allowNull: true },
            updated_by: { type: DataTypes.UUID, allowNull: true },
        },
        {
            schema,
            tableName: "whatsapp_detail_modes",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            underscored: true,
            indexes: [
                { fields: ["group_mode_id"], name: "wa_detail_mode_group_mode_idx" },
                { fields: ["name"], name: "wa_detail_mode_name_idx" },
                { fields: ["is_active"], name: "wa_detail_mode_active_idx" },
            ],
        }
    );
}

// ✅ Authorized Users (nomor yang bisa akses privat)
function defineWhatsappAuthorizedUserModel(schema) {
    return sequelize.define(
        "WhatsappAuthorizedUser",
        {
            id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },

            // Bisa untuk group atau session individual
            session_id: { type: DataTypes.UUID, allowNull: true },
            group_id: { type: DataTypes.UUID, allowNull: true },

            user_jid: { type: DataTypes.STRING(100), allowNull: false }, // nomor WhatsApp user
            user_name: { type: DataTypes.STRING(200), allowNull: true }, // nama user (optional)
            phone_number: { type: DataTypes.STRING(32), allowNull: true }, // nomor clean

            // Tipe akses
            access_type: {
                type: DataTypes.ENUM("full", "limited", "readonly"),
                allowNull: false,
                defaultValue: "full"
            },

            // Permission khusus
            permissions: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },

            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

            expires_at: { type: DataTypes.DATE, allowNull: true }, // masa berlaku (optional)

            created_by: { type: DataTypes.UUID, allowNull: true },
            updated_by: { type: DataTypes.UUID, allowNull: true },
        },
        {
            schema,
            tableName: "whatsapp_authorized_users",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            underscored: true,
            indexes: [
                { fields: ["session_id"], name: "wa_auth_user_session_idx" },
                { fields: ["group_id"], name: "wa_auth_user_group_idx" },
                { fields: ["user_jid"], name: "wa_auth_user_jid_idx" },
                { fields: ["phone_number"], name: "wa_auth_user_phone_idx" },
                { fields: ["is_active"], name: "wa_auth_user_active_idx" },
                { fields: ["access_type"], name: "wa_auth_user_access_idx" },
            ],
        }
    );
}

// Message log (existing - tidak berubah)
function defineWhatsappMessageLogModel(schema) {
    return sequelize.define(
        "WhatsappMessageLog",
        {
            id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },

            session_id: { type: DataTypes.UUID, allowNull: false },
            group_id: { type: DataTypes.UUID, allowNull: true }, // ✅ Tambah group_id

            direction: { type: DataTypes.ENUM("in", "out"), allowNull: false },

            to_jid: { type: DataTypes.STRING(100), allowNull: true },
            from_jid: { type: DataTypes.STRING(100), allowNull: true },

            mtype: { type: DataTypes.STRING(40), allowNull: true }, // text, image, dll
            content_preview: { type: DataTypes.TEXT, allowNull: true },

            raw: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },

            error: { type: DataTypes.TEXT, allowNull: true },

            sent_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        {
            schema,
            tableName: "whatsapp_message_logs",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            underscored: true,
            indexes: [
                { fields: ["session_id"], name: "wa_msglog_session_idx" },
                { fields: ["group_id"], name: "wa_msglog_group_idx" },
                { fields: ["direction"], name: "wa_msglog_direction_idx" },
                { fields: ["sent_at"], name: "wa_msglog_sent_at_idx" },
            ],
        }
    );
}

module.exports = {
    defineWhatsappSessionModel,
    defineWhatsappSessionModeModel,
    defineWhatsappGroupModel,
    defineWhatsappGroupModeModel,
    defineWhatsappDetailModeModel,
    defineWhatsappAuthorizedUserModel,
    defineWhatsappMessageLogModel
};