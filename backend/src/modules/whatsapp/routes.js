
// modules/whatsapp/routes.js
const express = require("express");
const router = express.Router();
const ctrl = require("./controller");

const { authenticateJWT } = require("../../middleware/authMiddleware");
const tenantResolver = require("../../middleware/tenantResolver");
const TenantModelLoader = require("../../tenants/loader");

// === Middleware izin khusus WhatsApp (hanya owner/admin di tenant aktif) ===
const canManageWhatsapp = async (req, res, next) => {
    try {
        // 1) wajib JWT valid
        const currentUser = req.user;
        if (!currentUser) {
            return res.status(401).json({ error: "UNAUTHENTICATED" });
        }

        // 2) konteks tenant wajib ada (dari tenantResolver)
        const schema = req.schema;
        if (!schema) {
            return res.status(400).json({ error: "TENANT_SCHEMA_REQUIRED" });
        }

        // 3) hanya JWT bertipe "tenant" yang boleh; tolak master/role lain
        if (currentUser.role !== "tenant") {
            return res.status(403).json({ error: "TENANT_JWT_REQUIRED" });
        }

        // 4) di dalam tenant tsb, hanya user role owner/admin yang boleh
        const User = TenantModelLoader.getModel("User", schema);
        const tenantUser = await User.findByPk(currentUser.userId);
        if (!tenantUser || !["owner", "admin"].includes(tenantUser.role)) {
            return res.status(403).json({ error: "INSUFFICIENT_PERMISSIONS" });
        }

        return next();
    } catch (err) {
        console.error("[WA] canManageWhatsapp error:", err);
        return res.status(500).json({ error: "SERVER_ERROR" });
    }
};

// === Apply middleware ke seluruh endpoint WhatsApp ===
// urutan penting: auth -> tenantResolver -> permission
router.use(authenticateJWT, tenantResolver, canManageWhatsapp);

// ============ SESSION MANAGEMENT ============
router.post("/session", (req, res) => ctrl.create(req, res));
router.get("/sessions", (req, res) => ctrl.list(req, res));
router.get("/session/:id", (req, res) => ctrl.detail(req, res));
router.put("/session/:id", (req, res) => ctrl.update(req, res));
router.get("/session/:id/status", (req, res) => ctrl.status(req, res));
router.post("/session/:id/start", (req, res) => ctrl.start(req, res));
router.get("/session/:id/qr", (req, res) => ctrl.qr(req, res));
router.post("/session/:id/stop", (req, res) => ctrl.stop(req, res));
router.delete("/session/:id", (req, res) => ctrl.destroy(req, res));

// ============ SESSION MODES MANAGEMENT ============
router.post("/session-modes", (req, res) => ctrl.createSessionMode(req, res));
router.get("/session-modes", (req, res) => ctrl.listSessionModes(req, res));
router.get("/session-modes/:id", (req, res) => ctrl.detailSessionMode(req, res));
router.put("/session-modes/:id", (req, res) => ctrl.updateSessionMode(req, res));
router.delete("/session-modes/:id", (req, res) => ctrl.deleteSessionMode(req, res));

// ============ GROUP MANAGEMENT ============
router.post("/groups", (req, res) => ctrl.createGroup(req, res));
router.get("/groups", (req, res) => ctrl.listGroups(req, res));
router.get("/groups/:id", (req, res) => ctrl.detailGroup(req, res));
router.put("/groups/:id", (req, res) => ctrl.updateGroup(req, res));
router.delete("/groups/:id", (req, res) => ctrl.deleteGroup(req, res));
router.post("/groups/:id/sync-metadata", (req, res) => ctrl.syncGroupMetadata(req, res));
router.post("/groups/:id/toggle-active", (req, res) => ctrl.toggleGroupActive(req, res));

// ============ GROUP MODES MANAGEMENT ============
router.post("/group-modes", (req, res) => ctrl.createGroupMode(req, res));
router.get("/group-modes", (req, res) => ctrl.listGroupModes(req, res));
router.get("/group-modes/:id", (req, res) => ctrl.detailGroupMode(req, res));
router.put("/group-modes/:id", (req, res) => ctrl.updateGroupMode(req, res));
router.delete("/group-modes/:id", (req, res) => ctrl.deleteGroupMode(req, res));

// ============ DETAIL MODES MANAGEMENT ============
router.post("/detail-modes", (req, res) => ctrl.createDetailMode(req, res));
router.get("/detail-modes", (req, res) => ctrl.listDetailModes(req, res));
router.get("/detail-modes/:id", (req, res) => ctrl.detailDetailMode(req, res));
router.put("/detail-modes/:id", (req, res) => ctrl.updateDetailMode(req, res));
router.delete("/detail-modes/:id", (req, res) => ctrl.deleteDetailMode(req, res));

// ============ AUTHORIZED USERS MANAGEMENT ============
router.post("/authorized-users", (req, res) => ctrl.createAuthorizedUser(req, res));
router.get("/authorized-users", (req, res) => ctrl.listAuthorizedUsers(req, res));
router.get("/authorized-users/:id", (req, res) => ctrl.detailAuthorizedUser(req, res));
router.put("/authorized-users/:id", (req, res) => ctrl.updateAuthorizedUser(req, res));
router.delete("/authorized-users/:id", (req, res) => ctrl.deleteAuthorizedUser(req, res));

// ============ BULK OPERATIONS ============
router.post("/groups/bulk-sync", (req, res) => ctrl.bulkSyncGroups(req, res));
router.post("/authorized-users/bulk-add", (req, res) => ctrl.bulkAddAuthorizedUsers(req, res));
router.post("/groups/bulk-toggle", (req, res) => ctrl.bulkToggleGroups(req, res));

// ============ MESSAGING ============
router.post("/send", (req, res) => ctrl.send(req, res));
router.post("/send/text", (req, res) => ctrl.sendText(req, res));
router.post("/send/image", (req, res) => ctrl.sendImage(req, res));
router.post("/send/document", (req, res) => ctrl.sendDocument(req, res)); // NEW

// ============ REPORTS & ANALYTICS ============
router.get("/analytics/sessions", (req, res) => ctrl.getSessionAnalytics(req, res));
router.get("/analytics/groups", (req, res) => ctrl.getGroupAnalytics(req, res));
router.get("/analytics/messages", (req, res) => ctrl.getMessageAnalytics(req, res));

// Tambahkan route baru untuk progress notifications
router.post("/progress/notify", (req, res) => ctrl.sendProgressNotification(req, res));

// Tambahkan route untuk webhook progress dari sales
router.post("/webhook/progress", (req, res) => ctrl.handleProgressWebhook(req, res));


module.exports = router;