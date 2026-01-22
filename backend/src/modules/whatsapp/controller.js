// modules/whatsapp/controller.js
const TenantModelLoader = require("../../tenants/loader");
const path = require("path");
const fs = require("fs");
const svc = require("./service");
const { Op } = require("sequelize");

class WhatsappController {
    _m(schema, name) {
        return TenantModelLoader.getModel(name, schema);
    }

    // ============ SESSION MANAGEMENT (Enhanced) ============

    // POST /api/whatsapp/session
    async create(req, res) {
        const schema = req.schema;
        try {
            const { name, user_id = null, session_mode_id = null } = req.body || {};
            if (!name) return res.status(400).json({ error: "NAME_REQUIRED" });

            // Validate session mode if provided
            if (session_mode_id) {
                const WaSessionMode = this._m(schema, "WaSessionMode");
                const mode = await WaSessionMode.findByPk(session_mode_id);
                if (!mode) return res.status(400).json({ error: "SESSION_MODE_NOT_FOUND" });
            }

            const WaSession = this._m(schema, "WaSession");
            const row = await WaSession.create({
                name,
                user_id,
                session_mode_id,
                status: "created",
                meta: {}
            });

            // Include session mode in response
            const created = await WaSession.findByPk(row.id, {
                include: [{ model: this._m(schema, "WaSessionMode"), as: "sessionMode" }]
            });

            res.json({ message: "Session created", data: created });
        } catch (e) {
            console.error("[WA:create]", e);
            res.status(500).json({ error: "CREATE_FAILED", detail: e?.message });
        }
    }

    // PUT /api/whatsapp/session/:id
    async update(req, res) {
        const schema = req.schema;
        const id = req.params.id;
        try {
            const { name, session_mode_id } = req.body || {};
            const WaSession = this._m(schema, "WaSession");

            const session = await WaSession.findByPk(id);
            if (!session) return res.status(404).json({ error: "SESSION_NOT_FOUND" });

            // Validate session mode if provided
            if (session_mode_id) {
                const WaSessionMode = this._m(schema, "WaSessionMode");
                const mode = await WaSessionMode.findByPk(session_mode_id);
                if (!mode) return res.status(400).json({ error: "SESSION_MODE_NOT_FOUND" });
            }

            await WaSession.update({ name, session_mode_id }, { where: { id } });

            const updated = await WaSession.findByPk(id, {
                include: [{ model: this._m(schema, "WaSessionMode"), as: "sessionMode" }]
            });

            res.json({ message: "Session updated", data: updated });
        } catch (e) {
            console.error("[WA:update]", e);
            res.status(500).json({ error: "UPDATE_FAILED", detail: e?.message });
        }
    }

    // GET /api/whatsapp/sessions
    async list(req, res) {
        const schema = req.schema;
        try {
            const WaSession = this._m(schema, "WaSession");
            const rows = await WaSession.findAll({
                order: [["created_at", "DESC"]],
                include: [
                    { model: this._m(schema, "WaSessionMode"), as: "sessionMode" },
                    { model: this._m(schema, "WaGroup"), as: "groups" }
                ]
            });

            const data = rows.map((r) => {
                const running = svc.isRunning({ schema, sessionId: r.id });
                const actual_status = running ? r.status : r.status === "connected" ? "disconnected" : r.status;
                return {
                    ...r.toJSON(),
                    is_running: running,
                    actual_status,
                    groups_count: r.groups?.length || 0
                };
            });
            res.json({ message: "OK", count: data.length, data });
        } catch (e) {
            console.error("[WA:list]", e);
            res.status(500).json({ error: "LIST_FAILED", detail: e?.message });
        }
    }

    // ============ SESSION MODES MANAGEMENT ============

    // POST /api/whatsapp/session-modes
    async createSessionMode(req, res) {
        const schema = req.schema;
        try {
            const { name, description, config = {} } = req.body || {};
            if (!name) return res.status(400).json({ error: "NAME_REQUIRED" });

            const WaSessionMode = this._m(schema, "WaSessionMode");
            const row = await WaSessionMode.create({
                name,
                description,
                config,
                is_active: true
            });

            res.json({ message: "Session mode created", data: row });
        } catch (e) {
            console.error("[WA:createSessionMode]", e);
            res.status(500).json({ error: "CREATE_FAILED", detail: e?.message });
        }
    }

    // GET /api/whatsapp/session-modes
    async listSessionModes(req, res) {
        const schema = req.schema;
        try {
            const { is_active } = req.query;
            const WaSessionMode = this._m(schema, "WaSessionMode");

            const where = {};
            if (is_active !== undefined) where.is_active = is_active === 'true';

            const rows = await WaSessionMode.findAll({
                where,
                order: [["name", "ASC"]],
                include: [{ model: this._m(schema, "WaSession"), as: "sessions" }]
            });

            const data = rows.map(r => ({
                ...r.toJSON(),
                sessions_count: r.sessions?.length || 0
            }));

            res.json({ message: "OK", count: data.length, data });
        } catch (e) {
            console.error("[WA:listSessionModes]", e);
            res.status(500).json({ error: "LIST_FAILED", detail: e?.message });
        }
    }

    // GET /api/whatsapp/session-modes/:id
    async detailSessionMode(req, res) {
        const schema = req.schema;
        const id = req.params.id;
        try {
            const WaSessionMode = this._m(schema, "WaSessionMode");
            const row = await WaSessionMode.findByPk(id, {
                include: [{ model: this._m(schema, "WaSession"), as: "sessions" }]
            });

            if (!row) return res.status(404).json({ error: "SESSION_MODE_NOT_FOUND" });

            res.json({
                message: "OK",
                data: {
                    ...row.toJSON(),
                    sessions_count: row.sessions?.length || 0
                }
            });
        } catch (e) {
            console.error("[WA:detailSessionMode]", e);
            res.status(500).json({ error: "DETAIL_FAILED", detail: e?.message });
        }
    }

    // PUT /api/whatsapp/session-modes/:id
    async updateSessionMode(req, res) {
        const schema = req.schema;
        const id = req.params.id;
        try {
            const { name, description, config, is_active } = req.body || {};
            const WaSessionMode = this._m(schema, "WaSessionMode");

            const mode = await WaSessionMode.findByPk(id);
            if (!mode) return res.status(404).json({ error: "SESSION_MODE_NOT_FOUND" });

            await WaSessionMode.update(
                { name, description, config, is_active },
                { where: { id } }
            );

            const updated = await WaSessionMode.findByPk(id);
            res.json({ message: "Session mode updated", data: updated });
        } catch (e) {
            console.error("[WA:updateSessionMode]", e);
            res.status(500).json({ error: "UPDATE_FAILED", detail: e?.message });
        }
    }

    // DELETE /api/whatsapp/session-modes/:id
    async deleteSessionMode(req, res) {
        const schema = req.schema;
        const id = req.params.id;
        try {
            const WaSessionMode = this._m(schema, "WaSessionMode");
            const WaSession = this._m(schema, "WaSession");

            // Check if any sessions are using this mode
            const usedSessions = await WaSession.count({ where: { session_mode_id: id } });
            if (usedSessions > 0) {
                return res.status(400).json({
                    error: "MODE_IN_USE",
                    message: `Cannot delete mode. ${usedSessions} sessions are using this mode.`
                });
            }

            const deleted = await WaSessionMode.destroy({ where: { id } });
            if (!deleted) return res.status(404).json({ error: "SESSION_MODE_NOT_FOUND" });

            res.json({ message: "Session mode deleted" });
        } catch (e) {
            console.error("[WA:deleteSessionMode]", e);
            res.status(500).json({ error: "DELETE_FAILED", detail: e?.message });
        }
    }

    // ============ GROUP MANAGEMENT ============

    // POST /api/whatsapp/groups
    async createGroup(req, res) {
        const schema = req.schema;
        try {
            const {
                session_id,
                group_jid,
                group_name,
                group_mode_id,
                detail_mode_id,
                permission_type = 'umum',
                is_active = true
            } = req.body || {};

            if (!session_id || !group_jid) {
                return res.status(400).json({ error: "SESSION_ID_AND_GROUP_JID_REQUIRED" });
            }

            // Validate session exists
            const WaSession = this._m(schema, "WaSession");
            const session = await WaSession.findByPk(session_id);
            if (!session) return res.status(400).json({ error: "SESSION_NOT_FOUND" });

            // Validate modes if provided
            if (group_mode_id) {
                const WaGroupMode = this._m(schema, "WaGroupMode");
                const mode = await WaGroupMode.findByPk(group_mode_id);
                if (!mode) return res.status(400).json({ error: "GROUP_MODE_NOT_FOUND" });
            }

            if (detail_mode_id) {
                const WaDetailMode = this._m(schema, "WaDetailMode");
                const detail = await WaDetailMode.findByPk(detail_mode_id);
                if (!detail) return res.status(400).json({ error: "DETAIL_MODE_NOT_FOUND" });
            }

            const WaGroup = this._m(schema, "WaGroup");
            const row = await WaGroup.create({
                session_id,
                group_jid,
                group_name,
                group_mode_id,
                detail_mode_id,
                permission_type,
                is_active,
                group_metadata: {},
                group_admins: [],
                group_participants: []
            });

            const created = await WaGroup.findByPk(row.id, {
                include: [
                    { model: this._m(schema, "WaSession"), as: "session" },
                    { model: this._m(schema, "WaGroupMode"), as: "groupMode" },
                    { model: this._m(schema, "WaDetailMode"), as: "detailMode" }
                ]
            });

            res.json({ message: "Group created", data: created });
        } catch (e) {
            console.error("[WA:createGroup]", e);
            res.status(500).json({ error: "CREATE_FAILED", detail: e?.message });
        }
    }

    // GET /api/whatsapp/groups
    async listGroups(req, res) {
        const schema = req.schema;
        try {
            const { session_id, is_active, permission_type } = req.query;
            const WaGroup = this._m(schema, "WaGroup");

            const where = {};
            if (session_id) where.session_id = session_id;
            if (is_active !== undefined) where.is_active = is_active === 'true';
            if (permission_type) where.permission_type = permission_type;

            const rows = await WaGroup.findAll({
                where,
                order: [["created_at", "DESC"]],
                include: [
                    { model: this._m(schema, "WaSession"), as: "session" },
                    { model: this._m(schema, "WaGroupMode"), as: "groupMode" },
                    { model: this._m(schema, "WaDetailMode"), as: "detailMode" },
                    { model: this._m(schema, "WaAuthorizedUser"), as: "authorizedUsers" }
                ]
            });

            const data = rows.map(r => ({
                ...r.toJSON(),
                authorized_users_count: r.authorizedUsers?.length || 0,
                participants_count: (r.group_participants || []).length,
                admins_count: (r.group_admins || []).length
            }));

            res.json({ message: "OK", count: data.length, data });
        } catch (e) {
            console.error("[WA:listGroups]", e);
            res.status(500).json({ error: "LIST_FAILED", detail: e?.message });
        }
    }

    // GET /api/whatsapp/groups/:id
    async detailGroup(req, res) {
        const schema = req.schema;
        const id = req.params.id;
        try {
            const WaGroup = this._m(schema, "WaGroup");
            const row = await WaGroup.findByPk(id, {
                include: [
                    { model: this._m(schema, "WaSession"), as: "session" },
                    { model: this._m(schema, "WaGroupMode"), as: "groupMode" },
                    { model: this._m(schema, "WaDetailMode"), as: "detailMode" },
                    { model: this._m(schema, "WaAuthorizedUser"), as: "authorizedUsers" },
                    { model: this._m(schema, "WaLogSession"), as: "messageLogs", limit: 10, order: [["sent_at", "DESC"]] }
                ]
            });

            if (!row) return res.status(404).json({ error: "GROUP_NOT_FOUND" });

            res.json({
                message: "OK",
                data: {
                    ...row.toJSON(),
                    authorized_users_count: row.authorizedUsers?.length || 0,
                    participants_count: (row.group_participants || []).length,
                    admins_count: (row.group_admins || []).length,
                    recent_messages_count: row.messageLogs?.length || 0
                }
            });
        } catch (e) {
            console.error("[WA:detailGroup]", e);
            res.status(500).json({ error: "DETAIL_FAILED", detail: e?.message });
        }
    }

    // PUT /api/whatsapp/groups/:id
    // Update group creation/update to support progress mode
    async updateGroup(req, res) {
        try {
            const schema = req.schema;
            const id = req.params.id;
            const updates = req.body;

            const WaGroup = this._m(schema, "WaGroup");
            const group = await WaGroup.findByPk(id);

            if (!group) {
                return res.status(404).json({ error: "GROUP_NOT_FOUND" });
            }

            // Validate progress mode settings
            if (updates.group_mode === 'progress' && !updates.detail_mode) {
                return res.status(400).json({
                    error: "DETAIL_MODE_REQUIRED_FOR_PROGRESS",
                    detail: "detail_mode must specify the progress stage name"
                });
            }

            // Check for duplicate progress groups
            if (updates.group_mode === 'progress' && updates.detail_mode) {
                const existing = await WaGroup.findOne({
                    where: {
                        session_id: group.session_id,
                        group_mode: 'progress',
                        detail_mode: updates.detail_mode,
                        id: { [Op.ne]: id }
                    }
                });

                if (existing) {
                    return res.status(409).json({
                        error: "DUPLICATE_PROGRESS_GROUP",
                        detail: `Group for progress stage "${updates.detail_mode}" already exists`
                    });
                }
            }

            await group.update(updates);

            res.json({
                message: "Group updated successfully",
                data: group
            });

        } catch (error) {
            console.error("[WA:updateGroup]", error);
            res.status(500).json({ error: "UPDATE_FAILED", detail: error.message });
        }
    }


    // DELETE /api/whatsapp/groups/:id
    async deleteGroup(req, res) {
        const schema = req.schema;
        const id = req.params.id;
        try {
            const WaGroup = this._m(schema, "WaGroup");

            const deleted = await WaGroup.destroy({ where: { id } });
            if (!deleted) return res.status(404).json({ error: "GROUP_NOT_FOUND" });

            res.json({ message: "Group deleted" });
        } catch (e) {
            console.error("[WA:deleteGroup]", e);
            res.status(500).json({ error: "DELETE_FAILED", detail: e?.message });
        }
    }

    // POST /api/whatsapp/groups/:id/sync-metadata
    async syncGroupMetadata(req, res) {
        const schema = req.schema;
        const id = req.params.id;
        try {
            const WaGroup = this._m(schema, "WaGroup");
            const group = await WaGroup.findByPk(id, {
                include: [{ model: this._m(schema, "WaSession"), as: "session" }]
            });

            if (!group) return res.status(404).json({ error: "GROUP_NOT_FOUND" });

            // Get WhatsApp client
            const client = svc.live?.get(`${schema}:${group.session_id}`);
            if (!client) return res.status(400).json({ error: "SESSION_NOT_RUNNING" });

            // Fetch group metadata from WhatsApp
            const metadata = await client.groupMetadata(group.group_jid);

            await WaGroup.update({
                group_name: metadata.subject,
                group_metadata: {
                    subject: metadata.subject,
                    desc: metadata.desc,
                    creation: metadata.creation,
                    owner: metadata.owner,
                    restrict: metadata.restrict,
                    announce: metadata.announce,
                    size: metadata.size,
                    participants_count: metadata.participants?.length || 0
                },
                group_participants: metadata.participants?.map(p => p.id) || [],
                group_admins: metadata.participants?.filter(p => p.admin).map(p => p.id) || [],
                last_updated_metadata: new Date()
            }, { where: { id } });

            const updated = await WaGroup.findByPk(id);
            res.json({ message: "Group metadata synced", data: updated });
        } catch (e) {
            console.error("[WA:syncGroupMetadata]", e);
            res.status(500).json({ error: "SYNC_FAILED", detail: e?.message });
        }
    }

    // POST /api/whatsapp/groups/:id/toggle-active
    async toggleGroupActive(req, res) {
        const schema = req.schema;
        const id = req.params.id;
        try {
            const WaGroup = this._m(schema, "WaGroup");
            const group = await WaGroup.findByPk(id);

            if (!group) return res.status(404).json({ error: "GROUP_NOT_FOUND" });

            const newStatus = !group.is_active;
            await WaGroup.update({ is_active: newStatus }, { where: { id } });

            const updated = await WaGroup.findByPk(id);
            res.json({
                message: `Group ${newStatus ? 'activated' : 'deactivated'}`,
                data: updated
            });
        } catch (e) {
            console.error("[WA:toggleGroupActive]", e);
            res.status(500).json({ error: "TOGGLE_FAILED", detail: e?.message });
        }
    }

    // ============ GROUP MODES MANAGEMENT ============

    // POST /api/whatsapp/group-modes
    async createGroupMode(req, res) {
        const schema = req.schema;
        try {
            const { name, description, config = {} } = req.body || {};
            if (!name) return res.status(400).json({ error: "NAME_REQUIRED" });

            const WaGroupMode = this._m(schema, "WaGroupMode");
            const row = await WaGroupMode.create({
                name,
                description,
                config,
                is_active: true
            });

            res.json({ message: "Group mode created", data: row });
        } catch (e) {
            console.error("[WA:createGroupMode]", e);
            res.status(500).json({ error: "CREATE_FAILED", detail: e?.message });
        }
    }

    // GET /api/whatsapp/group-modes
    async listGroupModes(req, res) {
        const schema = req.schema;
        try {
            const { is_active } = req.query;
            const WaGroupMode = this._m(schema, "WaGroupMode");

            const where = {};
            if (is_active !== undefined) where.is_active = is_active === 'true';

            const rows = await WaGroupMode.findAll({
                where,
                order: [["name", "ASC"]],
                include: [
                    { model: this._m(schema, "WaGroup"), as: "groups" },
                    { model: this._m(schema, "WaDetailMode"), as: "detailModes" }
                ]
            });

            const data = rows.map(r => ({
                ...r.toJSON(),
                groups_count: r.groups?.length || 0,
                detail_modes_count: r.detailModes?.length || 0
            }));

            res.json({ message: "OK", count: data.length, data });
        } catch (e) {
            console.error("[WA:listGroupModes]", e);
            res.status(500).json({ error: "LIST_FAILED", detail: e?.message });
        }
    }

    // GET /api/whatsapp/group-modes/:id
    async detailGroupMode(req, res) {
        const schema = req.schema;
        const id = req.params.id;
        try {
            const WaGroupMode = this._m(schema, "WaGroupMode");
            const row = await WaGroupMode.findByPk(id, {
                include: [
                    { model: this._m(schema, "WaGroup"), as: "groups" },
                    { model: this._m(schema, "WaDetailMode"), as: "detailModes" }
                ]
            });

            if (!row) return res.status(404).json({ error: "GROUP_MODE_NOT_FOUND" });

            res.json({
                message: "OK",
                data: {
                    ...row.toJSON(),
                    groups_count: row.groups?.length || 0,
                    detail_modes_count: row.detailModes?.length || 0
                }
            });
        } catch (e) {
            console.error("[WA:detailGroupMode]", e);
            res.status(500).json({ error: "DETAIL_FAILED", detail: e?.message });
        }
    }

    // PUT /api/whatsapp/group-modes/:id
    async updateGroupMode(req, res) {
        const schema = req.schema;
        const id = req.params.id;
        try {
            const { name, description, config, is_active } = req.body || {};
            const WaGroupMode = this._m(schema, "WaGroupMode");

            const mode = await WaGroupMode.findByPk(id);
            if (!mode) return res.status(404).json({ error: "GROUP_MODE_NOT_FOUND" });

            await WaGroupMode.update(
                { name, description, config, is_active },
                { where: { id } }
            );

            const updated = await WaGroupMode.findByPk(id);
            res.json({ message: "Group mode updated", data: updated });
        } catch (e) {
            console.error("[WA:updateGroupMode]", e);
            res.status(500).json({ error: "UPDATE_FAILED", detail: e?.message });
        }
    }

    // DELETE /api/whatsapp/group-modes/:id
    async deleteGroupMode(req, res) {
        const schema = req.schema;
        const id = req.params.id;
        try {
            const WaGroupMode = this._m(schema, "WaGroupMode");
            const WaGroup = this._m(schema, "WaGroup");

            // Check if any groups are using this mode
            const usedGroups = await WaGroup.count({ where: { group_mode_id: id } });
            if (usedGroups > 0) {
                return res.status(400).json({
                    error: "MODE_IN_USE",
                    message: `Cannot delete mode. ${usedGroups} groups are using this mode.`
                });
            }

            const deleted = await WaGroupMode.destroy({ where: { id } });
            if (!deleted) return res.status(404).json({ error: "GROUP_MODE_NOT_FOUND" });

            res.json({ message: "Group mode deleted" });
        } catch (e) {
            console.error("[WA:deleteGroupMode]", e);
            res.status(500).json({ error: "DELETE_FAILED", detail: e?.message });
        }
    }

    // ============ DETAIL MODES MANAGEMENT ============

    // POST /api/whatsapp/detail-modes
    async createDetailMode(req, res) {
        const schema = req.schema;
        try {
            const { group_mode_id, name, description, config = {} } = req.body || {};
            if (!group_mode_id || !name) {
                return res.status(400).json({ error: "GROUP_MODE_ID_AND_NAME_REQUIRED" });
            }

            // Validate group mode exists
            const WaGroupMode = this._m(schema, "WaGroupMode");
            const groupMode = await WaGroupMode.findByPk(group_mode_id);
            if (!groupMode) return res.status(400).json({ error: "GROUP_MODE_NOT_FOUND" });

            const WaDetailMode = this._m(schema, "WaDetailMode");
            const row = await WaDetailMode.create({
                group_mode_id,
                name,
                description,
                config,
                is_active: true
            });

            const created = await WaDetailMode.findByPk(row.id, {
                include: [{ model: this._m(schema, "WaGroupMode"), as: "groupMode" }]
            });

            res.json({ message: "Detail mode created", data: created });
        } catch (e) {
            console.error("[WA:createDetailMode]", e);
            res.status(500).json({ error: "CREATE_FAILED", detail: e?.message });
        }
    }

    // GET /api/whatsapp/detail-modes
    async listDetailModes(req, res) {
        const schema = req.schema;
        try {
            const { group_mode_id, is_active } = req.query;
            const WaDetailMode = this._m(schema, "WaDetailMode");

            const where = {};
            if (group_mode_id) where.group_mode_id = group_mode_id;
            if (is_active !== undefined) where.is_active = is_active === 'true';

            const rows = await WaDetailMode.findAll({
                where,
                order: [["name", "ASC"]],
                include: [
                    { model: this._m(schema, "WaGroupMode"), as: "groupMode" },
                    { model: this._m(schema, "WaGroup"), as: "groups" }
                ]
            });

            const data = rows.map(r => ({
                ...r.toJSON(),
                groups_count: r.groups?.length || 0
            }));

            res.json({ message: "OK", count: data.length, data });
        } catch (e) {
            console.error("[WA:listDetailModes]", e);
            res.status(500).json({ error: "LIST_FAILED", detail: e?.message });
        }
    }

    // GET /api/whatsapp/detail-modes/:id
    async detailDetailMode(req, res) {
        const schema = req.schema;
        const id = req.params.id;
        try {
            const WaDetailMode = this._m(schema, "WaDetailMode");
            const row = await WaDetailMode.findByPk(id, {
                include: [
                    { model: this._m(schema, "WaGroupMode"), as: "groupMode" },
                    { model: this._m(schema, "WaGroup"), as: "groups" }
                ]
            });

            if (!row) return res.status(404).json({ error: "DETAIL_MODE_NOT_FOUND" });

            res.json({
                message: "OK",
                data: {
                    ...row.toJSON(),
                    groups_count: row.groups?.length || 0
                }
            });
        } catch (e) {
            console.error("[WA:detailDetailMode]", e);
            res.status(500).json({ error: "DETAIL_FAILED", detail: e?.message });
        }
    }

    // PUT /api/whatsapp/detail-modes/:id
    async updateDetailMode(req, res) {
        const schema = req.schema;
        const id = req.params.id;
        try {
            const { group_mode_id, name, description, config, is_active } = req.body || {};
            const WaDetailMode = this._m(schema, "WaDetailMode");

            const mode = await WaDetailMode.findByPk(id);
            if (!mode) return res.status(404).json({ error: "DETAIL_MODE_NOT_FOUND" });

            // Validate group mode if provided
            if (group_mode_id) {
                const WaGroupMode = this._m(schema, "WaGroupMode");
                const groupMode = await WaGroupMode.findByPk(group_mode_id);
                if (!groupMode) return res.status(400).json({ error: "GROUP_MODE_NOT_FOUND" });
            }

            await WaDetailMode.update(
                { group_mode_id, name, description, config, is_active },
                { where: { id } }
            );

            const updated = await WaDetailMode.findByPk(id, {
                include: [{ model: this._m(schema, "WaGroupMode"), as: "groupMode" }]
            });

            res.json({ message: "Detail mode updated", data: updated });
        } catch (e) {
            console.error("[WA:updateDetailMode]", e);
            res.status(500).json({ error: "UPDATE_FAILED", detail: e?.message });
        }
    }

    // DELETE /api/whatsapp/detail-modes/:id
    async deleteDetailMode(req, res) {
        const schema = req.schema;
        const id = req.params.id;
        try {
            const WaDetailMode = this._m(schema, "WaDetailMode");
            const WaGroup = this._m(schema, "WaGroup");

            // Check if any groups are using this detail mode
            const usedGroups = await WaGroup.count({ where: { detail_mode_id: id } });
            if (usedGroups > 0) {
                return res.status(400).json({
                    error: "DETAIL_MODE_IN_USE",
                    message: `Cannot delete detail mode. ${usedGroups} groups are using this detail mode.`
                });
            }

            const deleted = await WaDetailMode.destroy({ where: { id } });
            if (!deleted) return res.status(404).json({ error: "DETAIL_MODE_NOT_FOUND" });

            res.json({ message: "Detail mode deleted" });
        } catch (e) {
            console.error("[WA:deleteDetailMode]", e);
            res.status(500).json({ error: "DELETE_FAILED", detail: e?.message });
        }
    }

    // ============ AUTHORIZED USERS MANAGEMENT ============

    // POST /api/whatsapp/authorized-users
    async createAuthorizedUser(req, res) {
        const schema = req.schema;
        try {
            const {
                session_id,
                group_id,
                user_jid,
                user_name,
                phone_number,
                access_type = 'full',
                permissions = {},
                expires_at
            } = req.body || {};

            if (!user_jid) return res.status(400).json({ error: "USER_JID_REQUIRED" });
            if (!session_id && !group_id) {
                return res.status(400).json({ error: "SESSION_ID_OR_GROUP_ID_REQUIRED" });
            }

            // Validate session or group exists
            if (session_id) {
                const WaSession = this._m(schema, "WaSession");
                const session = await WaSession.findByPk(session_id);
                if (!session) return res.status(400).json({ error: "SESSION_NOT_FOUND" });
            }

            if (group_id) {
                const WaGroup = this._m(schema, "WaGroup");
                const group = await WaGroup.findByPk(group_id);
                if (!group) return res.status(400).json({ error: "GROUP_NOT_FOUND" });
            }

            const WaAuthorizedUser = this._m(schema, "WaAuthorizedUser");
            const row = await WaAuthorizedUser.create({
                session_id,
                group_id,
                user_jid,
                user_name,
                phone_number,
                access_type,
                permissions,
                expires_at,
                is_active: true
            });

            const created = await WaAuthorizedUser.findByPk(row.id, {
                include: [
                    { model: this._m(schema, "WaSession"), as: "session" },
                    { model: this._m(schema, "WaGroup"), as: "group" }
                ]
            });

            res.json({ message: "Authorized user created", data: created });
        } catch (e) {
            console.error("[WA:createAuthorizedUser]", e);
            res.status(500).json({ error: "CREATE_FAILED", detail: e?.message });
        }
    }

    // GET /api/whatsapp/authorized-users
    async listAuthorizedUsers(req, res) {
        const schema = req.schema;
        try {
            const { session_id, group_id, is_active, access_type } = req.query;
            const WaAuthorizedUser = this._m(schema, "WaAuthorizedUser");

            const where = {};
            if (session_id) where.session_id = session_id;
            if (group_id) where.group_id = group_id;
            if (is_active !== undefined) where.is_active = is_active === 'true';
            if (access_type) where.access_type = access_type;

            const rows = await WaAuthorizedUser.findAll({
                where,
                order: [["created_at", "DESC"]],
                include: [
                    { model: this._m(schema, "WaSession"), as: "session" },
                    { model: this._m(schema, "WaGroup"), as: "group" }
                ]
            });

            res.json({ message: "OK", count: rows.length, data: rows });
        } catch (e) {
            console.error("[WA:listAuthorizedUsers]", e);
            res.status(500).json({ error: "LIST_FAILED", detail: e?.message });
        }
    }

    // GET /api/whatsapp/authorized-users/:id
    async detailAuthorizedUser(req, res) {
        const schema = req.schema;
        const id = req.params.id;
        try {
            const WaAuthorizedUser = this._m(schema, "WaAuthorizedUser");
            const row = await WaAuthorizedUser.findByPk(id, {
                include: [
                    { model: this._m(schema, "WaSession"), as: "session" },
                    { model: this._m(schema, "WaGroup"), as: "group" }
                ]
            });

            if (!row) return res.status(404).json({ error: "AUTHORIZED_USER_NOT_FOUND" });

            res.json({ message: "OK", data: row });
        } catch (e) {
            console.error("[WA:detailAuthorizedUser]", e);
            res.status(500).json({ error: "DETAIL_FAILED", detail: e?.message });
        }
    }

    // PUT /api/whatsapp/authorized-users/:id
    async updateAuthorizedUser(req, res) {
        const schema = req.schema;
        const id = req.params.id;
        try {
            const {
                user_name,
                access_type,
                permissions,
                is_active,
                expires_at
            } = req.body || {};

            const WaAuthorizedUser = this._m(schema, "WaAuthorizedUser");
            const user = await WaAuthorizedUser.findByPk(id);
            if (!user) return res.status(404).json({ error: "AUTHORIZED_USER_NOT_FOUND" });

            await WaAuthorizedUser.update({
                user_name,
                access_type,
                permissions,
                is_active,
                expires_at
            }, { where: { id } });

            const updated = await WaAuthorizedUser.findByPk(id, {
                include: [
                    { model: this._m(schema, "WaSession"), as: "session" },
                    { model: this._m(schema, "WaGroup"), as: "group" }
                ]
            });

            res.json({ message: "Authorized user updated", data: updated });
        } catch (e) {
            console.error("[WA:updateAuthorizedUser]", e);
            res.status(500).json({ error: "UPDATE_FAILED", detail: e?.message });
        }
    }

    // DELETE /api/whatsapp/authorized-users/:id
    async deleteAuthorizedUser(req, res) {
        const schema = req.schema;
        const id = req.params.id;
        try {
            const WaAuthorizedUser = this._m(schema, "WaAuthorizedUser");

            const deleted = await WaAuthorizedUser.destroy({ where: { id } });
            if (!deleted) return res.status(404).json({ error: "AUTHORIZED_USER_NOT_FOUND" });

            res.json({ message: "Authorized user deleted" });
        } catch (e) {
            console.error("[WA:deleteAuthorizedUser]", e);
            res.status(500).json({ error: "DELETE_FAILED", detail: e?.message });
        }
    }

    // ============ BULK OPERATIONS ============

    // POST /api/whatsapp/groups/bulk-sync
    async bulkSyncGroups(req, res) {
        const schema = req.schema;

        try {
            const { session_id } = req.body; // Jika ada session spesifik

            const WaSession = this._m(schema, "WaSession");
            const WaGroup = this._m(schema, "WaGroup");

            // Jika ada session_id spesifik, gunakan itu. Jika tidak, ambil semua yang connected
            let sessions;
            if (session_id) {
                const session = await WaSession.findByPk(session_id);
                if (!session) {
                    return res.status(404).json({ error: "SESSION_NOT_FOUND" });
                }
                if (session.status !== 'connected') {
                    return res.status(400).json({
                        error: "SESSION_NOT_CONNECTED",
                        message: `Session status is ${session.status}`
                    });
                }
                sessions = [session];
            } else {
                sessions = await WaSession.findAll({
                    where: { status: 'connected' }
                });
            }

            if (sessions.length === 0) {
                return res.status(400).json({
                    error: "NO_CONNECTED_SESSIONS",
                    message: "Tidak ada session WhatsApp yang terkoneksi"
                });
            }

            const results = [];

            for (const session of sessions) {
                try {
                    console.log(`🔄 Syncing groups for session ${session.id} (${session.name})`);

                    // Pastikan session benar-benar running di memory
                    if (!svc.isRunning({ schema, sessionId: session.id })) {
                        console.warn(`⚠️ Session ${session.id} not running in memory, attempting to start...`);

                        try {
                            // Coba start session dulu
                            await svc.start({ schema, sessionRow: session });

                            // Tunggu sebentar sampai running
                            let retries = 0;
                            while (!svc.isRunning({ schema, sessionId: session.id }) && retries < 10) {
                                await new Promise(resolve => setTimeout(resolve, 500));
                                retries++;
                            }

                            if (!svc.isRunning({ schema, sessionId: session.id })) {
                                throw new Error("Failed to start session");
                            }
                        } catch (startError) {
                            results.push({
                                session_id: session.id,
                                session_name: session.name,
                                status: 'failed',
                                error: `Cannot start session: ${startError.message}`
                            });
                            continue;
                        }
                    }

                    // Dapatkan client
                    const client = await svc.ensureClient({
                        schema,
                        sessionId: session.id,
                        maxWait: 15000 // 15 detik timeout
                    });

                    if (!client) {
                        throw new Error("Client not available");
                    }

                    // Ambil daftar groups dari WhatsApp
                    console.log(`📱 Fetching groups from WhatsApp for session ${session.id}`);
                    const waGroups = await client.groupFetchAllParticipating();

                    if (!waGroups || Object.keys(waGroups).length === 0) {
                        results.push({
                            session_id: session.id,
                            session_name: session.name,
                            status: 'success',
                            message: 'No groups found in WhatsApp',
                            groups_synced: 0
                        });
                        continue;
                    }

                    let syncedCount = 0;
                    let errorCount = 0;
                    const groupDetails = [];

                    // Sync setiap group
                    for (const [groupJid, groupData] of Object.entries(waGroups)) {
                        try {
                            // Cari atau buat record group
                            let [group, created] = await WaGroup.findOrCreate({
                                where: {
                                    session_id: session.id,
                                    group_jid: groupJid
                                },
                                defaults: {
                                    group_name: groupData.subject || 'Unknown Group',
                                    is_active: true,
                                    group_metadata: groupData,
                                    group_participants: groupData.participants?.map(p => p.id) || [],
                                    group_admins: groupData.participants?.filter(p => p.admin).map(p => p.id) || [],
                                    last_updated_metadata: new Date()
                                }
                            });

                            // Update jika sudah ada
                            if (!created) {
                                await group.update({
                                    group_name: groupData.subject || group.group_name,
                                    group_metadata: groupData,
                                    group_participants: groupData.participants?.map(p => p.id) || [],
                                    group_admins: groupData.participants?.filter(p => p.admin).map(p => p.id) || [],
                                    last_updated_metadata: new Date()
                                });
                            }

                            groupDetails.push({
                                jid: groupJid,
                                name: groupData.subject,
                                participants_count: groupData.participants?.length || 0,
                                action: created ? 'created' : 'updated'
                            });

                            syncedCount++;

                        } catch (groupError) {
                            console.error(`❌ Error syncing group ${groupJid}:`, groupError.message);
                            errorCount++;
                        }
                    }

                    results.push({
                        session_id: session.id,
                        session_name: session.name,
                        status: 'success',
                        groups_synced: syncedCount,
                        errors: errorCount,
                        total_groups: Object.keys(waGroups).length,
                        groups: groupDetails
                    });

                    console.log(`✅ Synced ${syncedCount} groups for session ${session.id}`);

                } catch (error) {
                    console.error(`❌ Bulk sync failed for session ${session.id}:`, error.message);
                    results.push({
                        session_id: session.id,
                        session_name: session.name,
                        status: 'failed',
                        error: error.message
                    });
                }
            }

            // Hitung summary
            const successful = results.filter(r => r.status === 'success').length;
            const failed = results.filter(r => r.status === 'failed').length;
            const totalSynced = results.reduce((sum, r) => sum + (r.groups_synced || 0), 0);

            res.json({
                success: true,
                message: "Bulk sync completed",
                summary: {
                    sessions_processed: results.length,
                    sessions_successful: successful,
                    sessions_failed: failed,
                    total_groups_synced: totalSynced
                },
                results
            });

        } catch (error) {
            console.error("❌ Bulk sync groups error:", error);
            res.status(500).json({
                error: error.message,
                details: "Internal server error during bulk sync"
            });
        }
    }


    // POST /api/whatsapp/authorized-users/bulk-add
    async bulkAddAuthorizedUsers(req, res) {
        const schema = req.schema;
        try {
            const { session_id, group_id, users = [] } = req.body || {};

            if (!session_id && !group_id) {
                return res.status(400).json({ error: "SESSION_ID_OR_GROUP_ID_REQUIRED" });
            }
            if (!Array.isArray(users) || users.length === 0) {
                return res.status(400).json({ error: "USERS_ARRAY_REQUIRED" });
            }

            // Validate session or group
            if (session_id) {
                const WaSession = this._m(schema, "WaSession");
                const session = await WaSession.findByPk(session_id);
                if (!session) return res.status(400).json({ error: "SESSION_NOT_FOUND" });
            }

            if (group_id) {
                const WaGroup = this._m(schema, "WaGroup");
                const group = await WaGroup.findByPk(group_id);
                if (!group) return res.status(400).json({ error: "GROUP_NOT_FOUND" });
            }

            const WaAuthorizedUser = this._m(schema, "WaAuthorizedUser");
            const results = [];

            for (const user of users) {
                try {
                    const { user_jid, user_name, phone_number, access_type = 'full' } = user;
                    if (!user_jid) {
                        results.push({ user_jid, success: false, error: "USER_JID_REQUIRED" });
                        continue;
                    }

                    const created = await WaAuthorizedUser.create({
                        session_id,
                        group_id,
                        user_jid,
                        user_name,
                        phone_number,
                        access_type,
                        permissions: {},
                        is_active: true
                    });

                    results.push({ user_jid, success: true, id: created.id });
                } catch (error) {
                    results.push({ user_jid: user.user_jid, success: false, error: error.message });
                }
            }

            const successful = results.filter(r => r.success).length;
            res.json({
                message: `Bulk add completed: ${successful}/${users.length} users added`,
                data: results
            });
        } catch (e) {
            console.error("[WA:bulkAddAuthorizedUsers]", e);
            res.status(500).json({ error: "BULK_ADD_FAILED", detail: e?.message });
        }
    }

    // POST /api/whatsapp/groups/bulk-toggle
    async bulkToggleGroups(req, res) {
        const schema = req.schema;
        try {
            const { group_ids = [], is_active } = req.body || {};

            if (!Array.isArray(group_ids) || group_ids.length === 0) {
                return res.status(400).json({ error: "GROUP_IDS_ARRAY_REQUIRED" });
            }
            if (typeof is_active !== 'boolean') {
                return res.status(400).json({ error: "IS_ACTIVE_BOOLEAN_REQUIRED" });
            }

            const WaGroup = this._m(schema, "WaGroup");
            const updated = await WaGroup.update(
                { is_active },
                { where: { id: { [Op.in]: group_ids } } }
            );

            res.json({
                message: `${updated[0]} groups ${is_active ? 'activated' : 'deactivated'}`,
                data: { affected_count: updated[0], is_active }
            });
        } catch (e) {
            console.error("[WA:bulkToggleGroups]", e);
            res.status(500).json({ error: "BULK_TOGGLE_FAILED", detail: e?.message });
        }
    }

    // ============ REPORTS & ANALYTICS ============

    // GET /api/whatsapp/analytics/sessions
    async getSessionAnalytics(req, res) {
        const schema = req.schema;
        try {
            const WaSession = this._m(schema, "WaSession");
            const WaLogSession = this._m(schema, "WaLogSession");

            const totalSessions = await WaSession.count();
            const activeSessions = await WaSession.count({ where: { status: 'connected' } });
            const errorSessions = await WaSession.count({ where: { status: 'error' } });

            const messageStats = await WaLogSession.findAll({
                attributes: [
                    'direction',
                    [WaLogSession.sequelize.fn('COUNT', WaLogSession.sequelize.col('id')), 'count']
                ],
                where: {
                    sent_at: {
                        [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                    }
                },
                group: ['direction']
            });

            const sessionsByStatus = await WaSession.findAll({
                attributes: [
                    'status',
                    [WaSession.sequelize.fn('COUNT', WaSession.sequelize.col('id')), 'count']
                ],
                group: ['status']
            });

            res.json({
                message: "OK",
                data: {
                    summary: {
                        total_sessions: totalSessions,
                        active_sessions: activeSessions,
                        error_sessions: errorSessions,
                        success_rate: totalSessions > 0 ? ((activeSessions / totalSessions) * 100).toFixed(2) + '%' : '0%'
                    },
                    messages_24h: messageStats.reduce((acc, stat) => {
                        acc[stat.direction] = parseInt(stat.dataValues.count);
                        return acc;
                    }, { in: 0, out: 0 }),
                    sessions_by_status: sessionsByStatus.map(s => ({
                        status: s.status,
                        count: parseInt(s.dataValues.count)
                    }))
                }
            });
        } catch (e) {
            console.error("[WA:getSessionAnalytics]", e);
            res.status(500).json({ error: "ANALYTICS_FAILED", detail: e?.message });
        }
    }

    // // GET /api/whatsapp/analytics/groups
    // async getGroupAnalytics(req, res) {
    //     const schema = req.schema;
    //     try {
    //         const WaGroup = this._m(schema, "WaGroup");
    //         const WaLogSession = this._m(schema, "WaLogSession");
    //
    //         const totalGroups = await WaGroup.count();
    //         const activeGroups = await WaGroup.count({ where: { is_active: true } });
    //
    //         const groupsByPermission = await WaGroup.findAll({
    //             attributes: [
    //                 'permission_type',
    //                 [WaGroup.sequelize.fn('COUNT', WaGroup.sequelize.col('WaGroup.id')), 'count']
    //             ],
    //             group: ['permission_type']
    //         });
    //
    //         // ✅ FIX: Specify exact table.column for ambiguous columns
    //         const groupMessages = await WaLogSession.findAll({
    //             attributes: [
    //                 'group_id',
    //                 [WaLogSession.sequelize.fn('COUNT', WaLogSession.sequelize.col('WaLogSession.id')), 'message_count']
    //             ],
    //             where: {
    //                 group_id: { [Op.not]: null },
    //                 sent_at: {
    //                     [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
    //                 }
    //             },
    //             group: ['group_id'],
    //             order: [[WaLogSession.sequelize.literal('message_count'), 'DESC']],
    //             limit: 10,
    //             include: [{
    //                 model: this._m(schema, "WaGroup"),
    //                 as: "group",
    //                 attributes: ['id', 'group_name', 'group_jid', 'is_active']
    //             }]
    //         });
    //
    //         res.json({
    //             message: "OK",
    //             data: {
    //                 summary: {
    //                     total_groups: totalGroups,
    //                     active_groups: activeGroups,
    //                     inactive_groups: totalGroups - activeGroups,
    //                     activity_rate: totalGroups > 0 ? ((activeGroups / totalGroups) * 100).toFixed(2) + '%' : '0%'
    //                 },
    //                 groups_by_permission: groupsByPermission.map(g => ({
    //                     permission_type: g.permission_type,
    //                     count: parseInt(g.dataValues.count)
    //                 })),
    //                 top_active_groups: groupMessages.map(g => ({
    //                     group_id: g.group_id,
    //                     group_name: g.group?.group_name || 'Unknown',
    //                     group_jid: g.group?.group_jid || null,
    //                     is_active: g.group?.is_active || false,
    //                     message_count: parseInt(g.dataValues.message_count)
    //                 }))
    //             }
    //         });
    //     } catch (e) {
    //         console.error("[WA:getGroupAnalytics]", e);
    //         res.status(500).json({ error: "ANALYTICS_FAILED", detail: e?.message });
    //     }
    // }

    // // GET /api/whatsapp/analytics/messages

    async getGroupAnalytics(req, res) {
        const schema = req.schema;
        try {
            const WaGroup = this._m(schema, "WaGroup");
            const WaLogSession = this._m(schema, "WaLogSession");

            const totalGroups = await WaGroup.count();
            const activeGroups = await WaGroup.count({ where: { is_active: true } });

            // ✅ FIX: Use sequelize.fn properly without column reference to avoid alias issues
            const groupsByPermission = await WaGroup.findAll({
                attributes: [
                    'permission_type',
                    [WaGroup.sequelize.fn('COUNT', WaGroup.sequelize.col('id')), 'count']
                ],
                group: ['permission_type'],
                raw: true
            });

// Perbaiki implementasi bulkSyncGroups
            async function bulkSyncGroups(req, res) {
                const schema = req.headers["x-tenant"] || req.schema || "public";

                try {
                    const { session_id } = req.body; // Jika ada session spesifik

                    const WaSession = TenantModelLoader.getModel("WaSession", schema);
                    const WaGroup = TenantModelLoader.getModel("WaGroup", schema);

                    // Jika ada session_id spesifik, gunakan itu. Jika tidak, ambil semua yang connected
                    let sessions;
                    if (session_id) {
                        const session = await WaSession.findByPk(session_id);
                        if (!session) {
                            return res.status(404).json({ error: "SESSION_NOT_FOUND" });
                        }
                        if (session.status !== 'connected') {
                            return res.status(400).json({
                                error: "SESSION_NOT_CONNECTED",
                                message: `Session status is ${session.status}`
                            });
                        }
                        sessions = [session];
                    } else {
                        sessions = await WaSession.findAll({
                            where: { status: 'connected' }
                        });
                    }

                    if (sessions.length === 0) {
                        return res.status(400).json({
                            error: "NO_CONNECTED_SESSIONS",
                            message: "Tidak ada session WhatsApp yang terkoneksi"
                        });
                    }

                    const results = [];
                    const whatsappService = require("./service");

                    for (const session of sessions) {
                        try {
                            console.log(`🔄 Syncing groups for session ${session.id} (${session.name})`);

                            // Pastikan session benar-benar running di memory
                            if (!whatsappService.isRunning({ schema, sessionId: session.id })) {
                                console.warn(`⚠️ Session ${session.id} not running in memory, attempting to start...`);

                                try {
                                    // Coba start session dulu
                                    await whatsappService.start({ schema, sessionRow: session });

                                    // Tunggu sebentar sampai running
                                    let retries = 0;
                                    while (!whatsappService.isRunning({ schema, sessionId: session.id }) && retries < 10) {
                                        await new Promise(resolve => setTimeout(resolve, 500));
                                        retries++;
                                    }

                                    if (!whatsappService.isRunning({ schema, sessionId: session.id })) {
                                        throw new Error("Failed to start session");
                                    }
                                } catch (startError) {
                                    results.push({
                                        session_id: session.id,
                                        session_name: session.name,
                                        status: 'failed',
                                        error: `Cannot start session: ${startError.message}`
                                    });
                                    continue;
                                }
                            }

                            // Dapatkan client
                            const client = await whatsappService.ensureClient({
                                schema,
                                sessionId: session.id,
                                maxWait: 15000 // 15 detik timeout
                            });

                            if (!client) {
                                throw new Error("Client not available");
                            }

                            // Ambil daftar groups dari WhatsApp
                            console.log(`📱 Fetching groups from WhatsApp for session ${session.id}`);
                            const waGroups = await client.groupFetchAllParticipating();

                            if (!waGroups || Object.keys(waGroups).length === 0) {
                                results.push({
                                    session_id: session.id,
                                    session_name: session.name,
                                    status: 'success',
                                    message: 'No groups found in WhatsApp',
                                    groups_synced: 0
                                });
                                continue;
                            }

                            let syncedCount = 0;
                            let errorCount = 0;
                            const groupDetails = [];

                            // Sync setiap group
                            for (const [groupJid, groupData] of Object.entries(waGroups)) {
                                try {
                                    // Cari atau buat record group
                                    let [group, created] = await WaGroup.findOrCreate({
                                        where: {
                                            session_id: session.id,
                                            group_jid: groupJid
                                        },
                                        defaults: {
                                            group_name: groupData.subject || 'Unknown Group',
                                            is_active: true,
                                            group_metadata: groupData,
                                            group_participants: groupData.participants?.map(p => p.id) || [],
                                            group_admins: groupData.participants?.filter(p => p.admin).map(p => p.id) || [],
                                            last_updated_metadata: new Date()
                                        }
                                    });

                                    // Update jika sudah ada
                                    if (!created) {
                                        await group.update({
                                            group_name: groupData.subject || group.group_name,
                                            group_metadata: groupData,
                                            group_participants: groupData.participants?.map(p => p.id) || [],
                                            group_admins: groupData.participants?.filter(p => p.admin).map(p => p.id) || [],
                                            last_updated_metadata: new Date()
                                        });
                                    }

                                    groupDetails.push({
                                        jid: groupJid,
                                        name: groupData.subject,
                                        participants_count: groupData.participants?.length || 0,
                                        action: created ? 'created' : 'updated'
                                    });

                                    syncedCount++;

                                } catch (groupError) {
                                    console.error(`❌ Error syncing group ${groupJid}:`, groupError.message);
                                    errorCount++;
                                }
                            }

                            results.push({
                                session_id: session.id,
                                session_name: session.name,
                                status: 'success',
                                groups_synced: syncedCount,
                                errors: errorCount,
                                total_groups: Object.keys(waGroups).length,
                                groups: groupDetails
                            });

                            console.log(`✅ Synced ${syncedCount} groups for session ${session.id}`);

                        } catch (error) {
                            console.error(`❌ Bulk sync failed for session ${session.id}:`, error.message);
                            results.push({
                                session_id: session.id,
                                session_name: session.name,
                                status: 'failed',
                                error: error.message
                            });
                        }
                    }

                    // Hitung summary
                    const successful = results.filter(r => r.status === 'success').length;
                    const failed = results.filter(r => r.status === 'failed').length;
                    const totalSynced = results.reduce((sum, r) => sum + (r.groups_synced || 0), 0);

                    res.json({
                        success: true,
                        message: "Bulk sync completed",
                        summary: {
                            sessions_processed: results.length,
                            sessions_successful: successful,
                            sessions_failed: failed,
                            total_groups_synced: totalSynced
                        },
                        results
                    });

                } catch (error) {
                    console.error("❌ Bulk sync groups error:", error);
                    res.status(500).json({
                        error: error.message,
                        details: "Internal server error during bulk sync"
                    });
                }
            }
            // ✅ FIX: Specify exact table.column for ambiguous columns
            const groupMessages = await WaLogSession.findAll({
                attributes: [
                    'group_id',
                    [WaLogSession.sequelize.fn('COUNT', WaLogSession.sequelize.col('WaLogSession.id')), 'message_count']
                ],
                where: {
                    group_id: { [Op.not]: null },
                    sent_at: {
                        [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                    }
                },
                group: ['group_id'],
                order: [[WaLogSession.sequelize.literal('message_count'), 'DESC']],
                limit: 10,
                include: [{
                    model: this._m(schema, "WaGroup"),
                    as: "group",
                    attributes: ['id', 'group_name', 'group_jid', 'is_active']
                }]
            });

            res.json({
                message: "OK",
                data: {
                    summary: {
                        total_groups: totalGroups,
                        active_groups: activeGroups,
                        inactive_groups: totalGroups - activeGroups,
                        activity_rate: totalGroups > 0 ? ((activeGroups / totalGroups) * 100).toFixed(2) + '%' : '0%'
                    },
                    groups_by_permission: groupsByPermission.map(g => ({
                        permission_type: g.permission_type,
                        count: parseInt(g.count)
                    })),
                    top_active_groups: groupMessages.map(g => ({
                        group_id: g.group_id,
                        group_name: g.group?.group_name || 'Unknown',
                        group_jid: g.group?.group_jid || null,
                        is_active: g.group?.is_active || false,
                        message_count: parseInt(g.dataValues.message_count)
                    }))
                }
            });
        } catch (e) {
            console.error("[WA:getGroupAnalytics]", e);
            res.status(500).json({ error: "ANALYTICS_FAILED", detail: e?.message });
        }
    }

    // ============ EXISTING METHODS (updated) ============

    // GET /api/whatsapp/session/:id
    async detail(req, res) {
        const schema = req.schema,
            id = req.params.id;
        try {
            const WaSession = this._m(schema, "WaSession");
            const row = await WaSession.findByPk(id, {
                include: [
                    { model: this._m(schema, "WaSessionMode"), as: "sessionMode" },
                    { model: this._m(schema, "WaGroup"), as: "groups" }
                ]
            });
            if (!row) return res.status(404).json({ error: "NOT_FOUND" });

            const running = svc.isRunning({ schema, sessionId: id });
            const actual_status = running ? row.status : row.status === "connected" ? "disconnected" : row.status;

            res.json({
                message: "OK",
                data: {
                    ...row.toJSON(),
                    is_running: running,
                    actual_status,
                    groups_count: row.groups?.length || 0
                }
            });
        } catch (e) {
            console.error("[WA:detail]", e);
            res.status(500).json({ error: "DETAIL_FAILED", detail: e?.message });
        }
    }

    // GET /api/whatsapp/session/:id/status
    async status(req, res) {
        const schema = req.schema,
            id = req.params.id;
        try {
            const WaSession = this._m(schema, "WaSession");
            const row = await WaSession.findByPk(id, {
                include: [{ model: this._m(schema, "WaSessionMode"), as: "sessionMode" }]
            });
            if (!row) return res.status(404).json({ error: "NOT_FOUND" });

            const running = svc.isRunning({ schema, sessionId: id });
            const actual_status = running ? row.status : row.status === "connected" ? "disconnected" : row.status;

            res.json({
                message: "OK",
                data: {
                    id,
                    name: row.name,
                    status: actual_status,
                    is_running: running,
                    wa_number: row.wa_number,
                    device_name: row.device_name,
                    session_mode: row.sessionMode,
                    last_qr_at: row.last_qr_at,
                    updated_at: row.updated_at,
                },
            });
        } catch (e) {
            console.error("[WA:status]", e);
            res.status(500).json({ error: "STATUS_FAILED", detail: e?.message });
        }
    }

    // POST /api/whatsapp/session/:id/start
    async start(req, res) {
        const schema = req.schema,
            id = req.params.id;
        try {
            const WaSession = this._m(schema, "WaSession");
            const row = await WaSession.findByPk(id);
            if (!row) return res.status(404).json({ error: "NOT_FOUND" });

            if (["error"].includes(row.status)) {
                const authDir = path.join(process.cwd(), "session", schema, id);
                if (fs.existsSync(authDir)) fs.rmSync(authDir, { recursive: true, force: true });
            }
            await WaSession.update({ status: "starting" }, { where: { id } });
            await svc.start({ schema, sessionRow: row });
            res.json({ message: "STARTING", data: { id, name: row.name, status: "starting" } });
        } catch (e) {
            console.error("[WA:start]", e);
            res.status(500).json({ error: "START_FAILED", detail: e?.message });
        }
    }

    // GET /api/whatsapp/session/:id/qr
    async qr(req, res) {
        const schema = req.schema,
            id = req.params.id;
        try {
            const dataUrl = await svc.getQRDataURL({ schema, sessionId: id });
            if (!dataUrl) return res.status(404).json({ error: "QR_NOT_AVAILABLE" });
            res.json({ message: "OK", data: { qr: dataUrl } });
        } catch (e) {
            console.error("[WA:qr]", e);
            res.status(500).json({ error: "QR_FAILED", detail: e?.message });
        }
    }

    // POST /api/whatsapp/session/:id/stop
    async stop(req, res) {
        const schema = req.schema,
            id = req.params.id;
        try {
            const ok = await svc.stop({ schema, sessionId: id });
            const WaSession = this._m(schema, "WaSession");
            if (ok) await WaSession.update({ status: "stopped", disconnected_at: new Date() }, { where: { id } });
            res.json({ message: "STOPPED", data: { id, status: "stopped" } });
        } catch (e) {
            console.error("[WA:stop]", e);
            res.status(500).json({ error: "STOP_FAILED", detail: e?.message });
        }
    }

    // DELETE /api/whatsapp/session/:id
    async destroy(req, res) {
        const schema = req.schema,
            id = req.params.id;

        try {
            const WaSession = this._m(schema, "WaSession");
            const row = await WaSession.findByPk(id);
            if (!row) return res.status(404).json({ error: "NOT_FOUND" });

            // Stop session if running
            if (svc.isRunning({ schema, sessionId: id })) {
                await svc.stop({ schema, sessionId: id });
            }

            // Delete session files
            const authDir = path.join(process.cwd(), "session", schema, id);
            if (fs.existsSync(authDir)) fs.rmSync(authDir, { recursive: true, force: true });

            // Delete from database (cascades will handle related records)
            await WaSession.destroy({ where: { id } });

            res.json({ message: "SESSION_DELETED" });
        } catch (e) {
            console.error("[WA:destroy]", e);
            res.status(500).json({ error: "DELETE_FAILED", detail: e?.message });
        }
    }

    // ============ MESSAGING (existing methods) ============

    async send(req, res) {
        const schema = req.schema;
        try {
            const { session_id, to, message, type = "text", image_url, caption } = req.body || {};
            if (!session_id || !to) return res.status(400).json({ error: "SESSION_ID_AND_TO_REQUIRED" });

            let result;
            if (type === "text") {
                if (!message) return res.status(400).json({ error: "MESSAGE_REQUIRED" });
                result = await svc.sendText({ schema, sessionId: session_id, to, message });
            } else if (type === "image") {
                if (!image_url) return res.status(400).json({ error: "IMAGE_URL_REQUIRED" });
                result = await svc.sendImage({ schema, sessionId: session_id, to, image_url, caption });
            } else {
                return res.status(400).json({ error: "UNSUPPORTED_MESSAGE_TYPE" });
            }

            res.json({ message: "SENT", data: result });
        } catch (e) {
            console.error("[WA:send]", e);
            res.status(500).json({ error: "SEND_FAILED", detail: e?.message });
        }
    }

    async sendText(req, res) {
        const schema = req.schema;
        try {
            const { session_id, to, message } = req.body || {};
            if (!session_id || !to || !message) {
                return res.status(400).json({ error: "SESSION_ID_TO_MESSAGE_REQUIRED" });
            }
            const result = await svc.sendText({ schema, sessionId: session_id, to, message });
            res.json({ message: "TEXT_SENT", data: result });
        } catch (e) {
            console.error("[WA:sendText]", e);
            res.status(500).json({ error: "SEND_TEXT_FAILED", detail: e?.message });
        }
    }

    async sendImage(req, res) {
        const schema = req.schema;
        try {
            const { session_id, to, image_url, caption = "" } = req.body || {};
            if (!session_id || !to || !image_url) {
                return res.status(400).json({ error: "SESSION_ID_TO_IMAGE_REQUIRED" });
            }
            const result = await svc.sendImage({ schema, sessionId: session_id, to, image_url, caption });
            res.json({ message: "IMAGE_SENT", data: result });
        } catch (e) {
            console.error("[WA:sendImage]", e);
            res.status(500).json({ error: "SEND_IMAGE_FAILED", detail: e?.message });
        }
    }

    // ========= NEW: sendDocument =========
    async sendDocument(req, res) {
        const schema = req.schema;
        try {
            const { session_id, to, filename = "document.pdf", mimetype = "application/pdf", caption = "", base64, file_url } = req.body || {};
            if (!session_id || !to) return res.status(400).json({ error: "SESSION_ID_AND_TO_REQUIRED" });
            if (!base64 && !file_url) return res.status(400).json({ error: "BASE64_OR_FILE_URL_REQUIRED" });

            const result = await svc.sendDocument({
                schema, sessionId: session_id, to,
                filename, mimetype, caption, base64, file_url
            });

            res.json({ message: "DOCUMENT_SENT", data: result });
        } catch (e) {
            console.error("[WA:sendDocument]", e);
            res.status(500).json({ error: "SEND_DOCUMENT_FAILED", detail: e?.message });
        }
    }

    // Tambahkan method untuk progress notification
    async sendProgressNotification(req, res) {
        try {
            const schema = req.schema;
            const { instance_id, stage_name, action, data } = req.body;

            if (!instance_id || !stage_name || !action) {
                return res.status(400).json({ error: "MISSING_REQUIRED_FIELDS" });
            }

            const WaSession       = this._m(schema, "WaSession");
            const WaGroup         = this._m(schema, "WaGroup");
            const WaGroupMode     = this._m(schema, "WaGroupMode");
            const WaDetailMode    = this._m(schema, "WaDetailMode");
            const ProgressInstance= this._m(schema, "ProgressInstance");
            const ProgressCategory= this._m(schema, "ProgressCategory");
            const ProgressInstanceStage = this._m(schema, "ProgressInstanceStage");
            const SalesOrder      = this._m(schema, "SalesOrder");

            // 1) Ambil instance + stages
            const instance = await ProgressInstance.findByPk(instance_id, {
                include: [
                    { model: ProgressCategory, as: 'category' },
                    { model: ProgressInstanceStage, as: 'stages' }
                ]
            });
            if (!instance) {
                return res.status(404).json({ error: "PROGRESS_INSTANCE_NOT_FOUND" });
            }

            // 2) Lengkapi customer_name dari SO (opsional)
            let customerName = instance.customer_name || null;
            if (!customerName && instance.sales_order_id && SalesOrder) {
                const so = await SalesOrder.findByPk(instance.sales_order_id);
                customerName = so?.customer_name || null;
            }

            // 3) Cari session yang connected & running
            let session = null;
            const candidates = await WaSession.findAll({
                where: { status: 'connected' },
                order: [['updated_at', 'DESC']]
            });

            for (const s of candidates) {
                if (svc.isRunning({ schema, sessionId: s.id })) {
                    session = s;
                    break;
                }
            }

            // Coba start yang terbaru kalau belum ada yang running
            if (!session && candidates.length > 0) {
                const tryStart = candidates[0];
                try {
                    await svc.start({ schema, sessionRow: tryStart });
                    let retries = 0;
                    while (!svc.isRunning({ schema, sessionId: tryStart.id }) && retries < 10) {
                        await new Promise(r => setTimeout(r, 500));
                        retries += 1; // FIX: increment
                    }
                    if (svc.isRunning({ schema, sessionId: tryStart.id })) {
                        session = tryStart;
                    }
                } catch (_) {
                    // biarkan jatuh ke 404 di bawah
                }
            }

            if (!session) {
                return res.status(404).json({ error: "NO_ACTIVE_SESSION", detail: "Tidak ada session yang connected & running" });
            }

            // 4) Resolve mode via RELASI (BUKAN nama kolom langsung di WaGroup)
            //    - group mode "progress"
            const progressMode = await WaGroupMode.findOne({
                where: { name: 'progress', is_active: true }
            });
            if (!progressMode) {
                return res.status(404).json({ error: "GROUP_MODE_NOT_FOUND", detail: 'Mode "progress" tidak ditemukan/aktif' });
            }

            //    - detail mode = stage_name di dalam group mode tsb
            const detailMode = await WaDetailMode.findOne({
                where: { name: stage_name, group_mode_id: progressMode.id, is_active: true }
            });
            if (!detailMode) {
                return res.status(404).json({
                    error: "DETAIL_MODE_NOT_FOUND",
                    detail: `Detail mode "${stage_name}" untuk mode "progress" tidak ditemukan/aktif`
                });
            }

            // 5) Cari group berdasarkan ID relasi
            const targetGroup = await WaGroup.findOne({
                where: {
                    session_id: session.id,
                    group_mode_id: progressMode.id,
                    detail_mode_id: detailMode.id,
                    is_active: true
                }
            });
            if (!targetGroup) {
                return res.status(404).json({
                    error: "TARGET_GROUP_NOT_FOUND",
                    detail: `Tidak ada group untuk stage "${stage_name}" (mode progress) pada session ini`
                });
            }

            // 6) Siapkan pesan
            const currentStage =
                Array.isArray(instance.stages)
                    ? instance.stages.find(s => (s.name || s.stage_name) === stage_name)
                    : null;

            const messageText = this.formatProgressMessage(
                { ...instance.toJSON(), customer_name: customerName },
                currentStage || { name: stage_name }, // fallback agar formatMessage tetap punya nama
                action,
                data
            );

            // 7) Kirim via service
            await svc.sendText({
                schema,
                sessionId: session.id,
                to: targetGroup.group_jid,
                message: messageText
            });

            // 8) Log
            await this.logMessage(schema, {
                session_id: session.id,
                direction: "out",
                to_jid: targetGroup.group_jid,
                mtype: "text",
                content_preview: messageText.slice(0, 300),
                metadata: {
                    type: "progress_notification",
                    instance_id,
                    stage_name,
                    action,
                    group_id: targetGroup.id,
                    group_mode_id: progressMode.id,
                    detail_mode_id: detailMode.id
                }
            });

            res.json({
                success: true,
                message: "Progress notification sent",
                data: { group_name: targetGroup.group_name, stage_name, action }
            });

        } catch (error) {
            console.error("[WA:sendProgressNotification]", error);
            res.status(500).json({ error: "NOTIFICATION_FAILED", detail: error.message });
        }
    }

    // Tambahkan util logging sederhana
    async logMessage(schema, payload) {
        try {
            const WaLogSession = this._m(schema, "WaLogSession");
            await WaLogSession.create({ ...payload, sent_at: new Date() });
        } catch (e) {
            console.warn("[WA:logMessage] failed:", e?.message);
        }
    }


    formatProgressMessage(instance, stage, action, data = {}) {
        const customerName = instance.customer_name || 'Unknown Customer';
        const productName = instance.product_name || 'Unknown Product';
        const stageName = stage?.name || 'Unknown Stage';
        const currentTime = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        const pct = typeof data.percent === 'number' ? ` (${data.percent}%)` : '';

        let emoji = '';
        let statusText = '';

        switch (action) {
            case 'start':
                emoji = '🟡';
                statusText = 'DIMULAI';
                break;
            case 'done':
                emoji = '✅';
                statusText = 'SELESAI';
                break;
            case 'cancel':
                emoji = '❌';
                statusText = 'DIBATALKAN';
                break;
            case 'reset':
                emoji = '🔄';
                statusText = 'DIRESET';
                break;
            default:
                emoji = 'ℹ️';
                statusText = 'DIPERBARUI';
        }

        return `${emoji} *Progress ${statusText}*

📋 *Order Details:*
• Customer: ${customerName}
• Produk: ${productName}
• Stage: ${stageName}${pct}
• Status: ${statusText}
• Waktu: ${currentTime}

${(data.notes || data.remarks) ? `📝 *Catatan:*\n${data.notes || data.remarks}\n\n` : ''}${action === 'start' ? `⏰ _Balas pesan ini dengan "done" jika tahap ${stageName} sudah selesai_` : ''}${action === 'done' ? `🎉 _Tahap ${stageName} telah selesai! Otomatis lanjut ke tahap berikutnya._` : ''}

#Progress #${stageName.replace(/\s/g, '')} #OrderID${instance.id}`;
    }

}

module.exports = new WhatsappController();