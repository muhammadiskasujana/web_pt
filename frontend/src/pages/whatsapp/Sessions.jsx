import { useEffect, useMemo, useRef, useState } from "react";
import axios from "../../config/axios";
import {
    Plus, RefreshCcw, QrCode, Play, Square, Trash2, Send, Image as ImageIcon,
    Settings, Users, BarChart3, Edit, Eye, Power, PowerOff, MessageSquare,
    Upload, Download, ToggleLeft, ToggleRight, Search, Filter,
    TrendingUp, Activity, FileText, Zap, Globe, Info
} from "lucide-react";

import forceHttps from "../../utils/url.js";


// ————————————————————————————————————————
// Small WA logo (SVG)
// ————————————————————————————————————————
const WaLogo = ({ className = "h-9 w-9" }) => (
    <svg viewBox="0 0 32 32" className={className}>
        <path fill="#25D366" d="M16 3.2c-7.09 0-12.8 5.71-12.8 12.8 0 2.27.6 4.4 1.65 6.25L3.2 28.8l6.77-1.57A12.73 12.73 0 0 0 16 28.8c7.09 0 12.8-5.71 12.8-12.8S23.09 3.2 16 3.2z"/>
        <path fill="#fff" d="M24.25 20.31c-.37 1.03-1.82 1.89-2.53 1.94-.67.05-1.52.07-2.46-.15a10.67 10.67 0 0 1-4.32-2.2 12.89 12.89 0 0 1-2.52-2.87c-.77-1.28-1.63-3.44-1.63-3.44s-.4-1.01-.04-2.03c.38-1.07 1.39-1.68 1.39-1.68.38-.25.84-.18 1.02-.1.32.13.5.47.63.84.2.58.63 2 .63 2s.1.35-.08.63c-.17.26-.52.63-.52.63s-.27.26-.1.56c.16.29.72 1.26 1.65 2.15.97.93 2.27 1.57 2.27 1.57s.24.08.4-.02c.18-.12.7-.75.7-.75s.2-.24.53-.16 2.05.64 2.05.64s.49.16.62.34c.12.17.08.53.08.53z"/>
    </svg>
);

// ————————————————————————————————————————
// Small helpers
// ————————————————————————————————————————
const Badge = ({ color = "slate", children }) => (
    <span className={`px-2 py-0.5 text-xs rounded-full border bg-${color}-50 text-${color}-700 border-${color}-200`}>
        {children}
    </span>
);

const btn = "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors";
const btnGhost = `${btn} border-slate-200 text-slate-700 hover:bg-slate-50`;
const btnPrimary = `${btn} bg-sky-600 text-white hover:bg-sky-700 border-sky-600`;
const btnDanger = `${btn} bg-red-600 text-white hover:bg-red-700 border-red-600`;
const btnWarning = `${btn} bg-amber-600 text-white hover:bg-amber-700 border-amber-600`;
const btnSuccess = `${btn} bg-green-600 text-white hover:bg-green-700 border-green-600`;
const input = "w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400";
const select = "w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400";
const textarea = "w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400 min-h-[80px]";

// Map status → badge color
const statusColor = (s) => ({
    connected: "green",
    starting: "amber",
    disconnected: "slate",
    error: "red",
    created: "slate",
    stopped: "slate",
}[s] || "slate");

// ————————————————————————————————————————
// GROUP DETAIL MODAL (NEW)
// ————————————————————————————————————————
function GroupDetailModal({ open, onClose, group }) {
    if (!open || !group) return null;

    const g = group;
    const meta = g.group_metadata || {};
    const session = g.session || {};
    const participants =
        meta.participants ||
        g.group_participants?.map((lid) => ({ id: lid, lid, admin: null })) ||
        [];
    const adminsArray =
        g.group_admins ||
        participants.filter((p) => p.admin === "admin" || p.admin === "superadmin").map((p) => p.id);

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        Group Detail
                    </h3>
                    <button className={btnGhost} onClick={onClose}>Close</button>
                </div>

                {/* Header */}
                <div className="border rounded-xl p-4 mb-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="text-xl font-semibold">{g.group_name || g.name}</div>
                            <div className="text-sm text-slate-600">{g.group_jid || g.jid}</div>
                            <div className="text-xs text-slate-500 mt-1">
                                Permission: <b>{g.permission_type || "-"}</b> • Active: <b>{g.is_active ? "Yes" : "No"}</b>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-slate-500">Created</div>
                            <div className="text-sm">{g.created_at ? new Date(g.created_at).toLocaleString() : "-"}</div>
                            <div className="text-xs text-slate-500 mt-2">Updated</div>
                            <div className="text-sm">{g.updated_at ? new Date(g.updated_at).toLocaleString() : "-"}</div>
                        </div>
                    </div>
                </div>

                {/* Session info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="border rounded-xl p-4">
                        <div className="text-sm font-medium mb-2">Session</div>
                        <div className="text-sm">
                            <div><span className="text-slate-500">Name:</span> {session.name || "-"}</div>
                            <div><span className="text-slate-500">WA Number:</span> {session.wa_number || "-"}</div>
                            <div><span className="text-slate-500">Status:</span> {session.status || session.actual_status || "-"}</div>
                        </div>
                    </div>
                    <div className="border rounded-xl p-4">
                        <div className="text-sm font-medium mb-2">Counts</div>
                        <div className="text-sm">
                            <div><span className="text-slate-500">Participants:</span> {g.participants_count ?? meta.size ?? (participants?.length || 0)}</div>
                            <div><span className="text-slate-500">Admins:</span> {g.admins_count ?? (adminsArray?.length || 0)}</div>
                            <div><span className="text-slate-500">Authorized Users:</span> {g.authorized_users_count ?? (g.authorizedUsers?.length || 0)}</div>
                        </div>
                    </div>
                </div>

                {/* Metadata */}
                <div className="border rounded-xl p-4 mb-4">
                    <div className="text-sm font-medium mb-3">Group Metadata</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div><span className="text-slate-500">Subject:</span> {meta.subject || "-"}</div>
                        <div><span className="text-slate-500">Owner LID:</span> {meta.owner || "-"}</div>
                        <div><span className="text-slate-500">Owner JID:</span> {meta.ownerJid || "-"}</div>
                        <div><span className="text-slate-500">Announce:</span> {String(meta.announce ?? "-")}</div>
                        <div><span className="text-slate-500">Restrict:</span> {String(meta.restrict ?? "-")}</div>
                        <div><span className="text-slate-500">Member Add Mode:</span> {String(meta.memberAddMode ?? "-")}</div>
                        <div><span className="text-slate-500">Join Approval Mode:</span> {String(meta.joinApprovalMode ?? "-")}</div>
                        <div><span className="text-slate-500">Creation:</span> {meta.creation ? new Date(meta.creation * 1000).toLocaleString() : "-"}</div>
                        <div><span className="text-slate-500">Subject Time:</span> {meta.subjectTime ? new Date(meta.subjectTime * 1000).toLocaleString() : "-"}</div>
                        <div><span className="text-slate-500">Desc Time:</span> {meta.descTime ? new Date(meta.descTime * 1000).toLocaleString() : "-"}</div>
                        {"ephemeralDuration" in meta && (
                            <div><span className="text-slate-500">Ephemeral Duration:</span> {meta.ephemeralDuration}</div>
                        )}
                        <div><span className="text-slate-500">Country Code:</span> {meta.owner_country_code || "-"}</div>
                    </div>
                </div>

                {/* Admins & Participants */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="border rounded-xl p-4">
                        <div className="text-sm font-medium mb-3">Admins</div>
                        {adminsArray && adminsArray.length > 0 ? (
                            <ul className="text-sm list-disc pl-5 space-y-1">
                                {adminsArray.map((a, idx) => (
                                    <li key={idx} className="break-all">{a}</li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-sm text-slate-500">No data</div>
                        )}
                    </div>
                    <div className="border rounded-xl p-4">
                        <div className="text-sm font-medium mb-3">Participants</div>
                        {participants && participants.length > 0 ? (
                            <div className="max-h-56 overflow-y-auto pr-1">
                                <table className="w-full text-sm">
                                    <thead>
                                    <tr className="text-left text-slate-500">
                                        <th className="py-1 pr-2">LID</th>
                                        <th className="py-1 pr-2">JID</th>
                                        <th className="py-1">Role</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {participants.map((p, idx) => (
                                        <tr key={idx} className="border-t">
                                            <td className="py-1 pr-2 break-all">{p.id || p.lid}</td>
                                            <td className="py-1 pr-2 break-all">{p.jid || "-"}</td>
                                            <td className="py-1">{p.admin || "-"}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-sm text-slate-500">No data</div>
                        )}
                    </div>
                </div>

                {/* Raw JSON */}
                <details className="border rounded-xl p-4">
                    <summary className="cursor-pointer text-sm font-medium">Raw JSON</summary>
                    <pre className="text-xs text-slate-700 mt-3 p-3 bg-slate-50 rounded border overflow-x-auto">
                        {JSON.stringify(group, null, 2)}
                    </pre>
                </details>
            </div>
        </div>
    );
}


// ————————————————————————————————————————
// Groups Management Modal (aligned to controller/routes)
// ————————————————————————————————————————
// ————————————————————————————————————————
// Groups Management Modal — FULL CRUD
// ————————————————————————————————————————
 function GroupsModal({ open, onClose }) {
    const [groups, setGroups] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [groupModes, setGroupModes] = useState([]);
    const [detailModes, setDetailModes] = useState([]); // filtered by selected group_mode_id

    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [bulkSessionId, setBulkSessionId] = useState("ALL");

    const [showDetail, setShowDetail] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [editingGroup, setEditingGroup] = useState(null);

    // Form disesuaikan dgn controller create/update Group (pakai ID relasi)
    const blankForm = {
        session_id: "",
        group_jid: "",
        group_name: "",
        group_mode_id: "",
        detail_mode_id: "",
        permission_type: "umum",
        is_active: true
    };
    const [formData, setFormData] = useState(blankForm);

    useEffect(() => { if (open) loadData(); }, [open]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [groupsRes, sessionsRes, modesRes] = await Promise.all([
                axios.get("/api/whatsapp/groups"),
                axios.get("/api/whatsapp/sessions"),
                axios.get("/api/whatsapp/group-modes?is_active=true"),
            ]);
            setGroups(groupsRes.data?.data || []);
            setSessions(sessionsRes.data?.data || []);
            setGroupModes(modesRes.data?.data || []);
        } catch (e) {
            console.error("Load groups/sessions/modes failed:", e);
        } finally {
            setLoading(false);
        }
    };

    // Auto-load detail modes ketika group_mode_id berubah
    useEffect(() => {
        const loadDetailModes = async () => {
            try {
                if (!formData.group_mode_id) {
                    setDetailModes([]);
                    setFormData((p) => ({ ...p, detail_mode_id: "" }));
                    return;
                }
                const { data } = await axios.get(
                    `/api/whatsapp/detail-modes?group_mode_id=${formData.group_mode_id}&is_active=true`
                );
                setDetailModes(data?.data || []);
                // reset detail jika tidak lagi tersedia
                const stillExists = (data?.data || []).some(dm => dm.id === formData.detail_mode_id);
                if (!stillExists) {
                    setFormData((p) => ({ ...p, detail_mode_id: "" }));
                }
            } catch (e) {
                console.error("Load detail-modes failed:", e);
                setDetailModes([]);
            }
        };
        if (showForm) loadDetailModes();
    }, [formData.group_mode_id, showForm]);

    const openDetail = (group) => {
        setSelectedGroup(group);
        setShowDetail(true);
    };

    // ------- CREATE or UPDATE -------
    const handleSubmitGroup = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Validasi khusus: jika mode bernama "progress", detail wajib
            const selectedMode = groupModes.find(gm => gm.id === formData.group_mode_id);
            if (selectedMode?.name === "progress" && !formData.detail_mode_id) {
                alert("Detail mode wajib diisi untuk mode Progress.");
                setSaving(false);
                return;
            }

            const payload = {
                session_id: formData.session_id,
                group_jid: formData.group_jid,
                group_name: formData.group_name || undefined,
                group_mode_id: formData.group_mode_id || null,
                detail_mode_id: formData.detail_mode_id || null,
                permission_type: formData.permission_type,
                is_active: !!formData.is_active
            };

            if (editingGroup) {
                await axios.put(`/api/whatsapp/groups/${editingGroup.id}`, payload);
            } else {
                await axios.post("/api/whatsapp/groups", payload);
            }

            // reset form
            setEditingGroup(null);
            setFormData(blankForm);
            setDetailModes([]);
            setShowForm(false);
            loadData();
        } catch (e) {
            console.error("Save group failed:", e);
            alert(e.response?.data?.error || e.response?.data?.message || "Save failed");
        } finally {
            setSaving(false);
        }
    };

    const startCreate = () => {
        setEditingGroup(null);
        setFormData(blankForm);
        setDetailModes([]);
        setShowForm(true);
    };

    const startEditGroup = (g) => {
        setEditingGroup(g);
        setFormData({
            session_id: g.session_id || "",
            group_jid: g.group_jid || "",
            group_name: g.group_name || "",
            group_mode_id: g.group_mode_id || "",
            detail_mode_id: g.detail_mode_id || "",
            permission_type: g.permission_type || "umum",
            is_active: !!g.is_active
        });
        setShowForm(true);
    };

    const cancelForm = () => {
        setEditingGroup(null);
        setFormData(blankForm);
        setDetailModes([]);
        setShowForm(false);
    };

    // ------- MISC actions -------
    const handleToggleActive = async (group) => {
        try {
            await axios.post(`/api/whatsapp/groups/${group.id}/toggle-active`);
            loadData();
        } catch (e) {
            console.error("Toggle failed:", e);
            alert(e.response?.data?.error || "Toggle failed");
        }
    };

    const handleSyncMetadata = async (group) => {
        setSyncing(true);
        try {
            await axios.post(`/api/whatsapp/groups/${group.id}/sync-metadata`);
            loadData();
        } catch (e) {
            console.error("Sync failed:", e);
            alert(e.response?.data?.error || "Sync failed");
        } finally {
            setSyncing(false);
        }
    };

    const handleBulkSync = async () => {
        setSyncing(true);
        try {
            const payload = bulkSessionId === "ALL" ? {} : { session_id: bulkSessionId };
            await axios.post("/api/whatsapp/groups/bulk-sync", payload);
            loadData();
        } catch (e) {
            console.error("Bulk sync failed:", e);
            alert(e.response?.data?.error || "Bulk sync failed");
        } finally {
            setSyncing(false);
        }
    };

    const handleDeleteGroup = async (group) => {
        const _name = group.group_name || group.name || group.group_jid;
        if (!confirm(`Delete group "${_name}"?`)) return;
        try {
            await axios.delete(`/api/whatsapp/groups/${group.id}`);
            loadData();
        } catch (e) {
            console.error("Delete failed:", e);
            alert(e.response?.data?.error || "Delete failed");
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto" onClick={(e)=>e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5" /> Groups Management
                    </h3>
                    <div className="flex gap-2">
                        <button className={btnSuccess} onClick={startCreate}>
                            <Plus className="h-4 w-4" /> {editingGroup ? "New Group" : "Add Group"}
                        </button>
                        <div className="flex items-center gap-2">
                            <select
                                className={select + " w-56"}
                                value={bulkSessionId}
                                onChange={(e) => setBulkSessionId(e.target.value)}
                                title="Pilih session untuk Bulk Sync"
                            >
                                <option value="ALL">All connected sessions</option>
                                {sessions
                                    .filter(s => s.actual_status === "connected")
                                    .map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.wa_number || "no number"})
                                        </option>
                                    ))}
                            </select>
                            <button className={btnPrimary} onClick={handleBulkSync} disabled={syncing}>
                                <RefreshCcw className="h-4 w-4" /> Bulk Sync
                            </button>
                        </div>
                        <button className={btnGhost} onClick={onClose}>Close</button>
                    </div>
                </div>

                {/* Create / Edit Group Form */}
                {showForm && (
                    <form onSubmit={handleSubmitGroup} className="border rounded-xl p-4 mb-4 space-y-3">
                        <div className="text-sm font-medium mb-2">
                            {editingGroup ? "Edit Group" : "Create Group"}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Session</label>
                                <select
                                    className={select}
                                    value={formData.session_id}
                                    onChange={(e) => setFormData({ ...formData, session_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select session...</option>
                                    {sessions.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.wa_number || "-"})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Group JID</label>
                                <input
                                    className={input}
                                    value={formData.group_jid}
                                    onChange={(e) => setFormData({ ...formData, group_jid: e.target.value })}
                                    placeholder="120363xxxxx@g.us"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Group Name</label>
                            <input
                                className={input}
                                value={formData.group_name}
                                onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                                placeholder="Group name"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Group Mode</label>
                                <select
                                    className={select}
                                    value={formData.group_mode_id}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        group_mode_id: e.target.value,
                                        detail_mode_id: "" // reset saat ganti mode
                                    }))}
                                >
                                    <option value="">— Select Group Mode —</option>
                                    {groupModes.map(gm => (
                                        <option key={gm.id} value={gm.id}>{gm.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Detail Mode</label>
                                <select
                                    className={select}
                                    value={formData.detail_mode_id}
                                    onChange={(e) => setFormData(prev => ({ ...prev, detail_mode_id: e.target.value }))}
                                    disabled={!formData.group_mode_id}
                                >
                                    <option value="">— Optional (depends on Group Mode) —</option>
                                    {detailModes.map(dm => (
                                        <option key={dm.id} value={dm.id}>
                                            {dm.name} {dm.groupMode?.name ? `— ${dm.groupMode?.name}` : ""}
                                        </option>
                                    ))}
                                </select>
                                {/* Hint jika mode = progress */}
                                {(() => {
                                    const gm = groupModes.find(x => x.id === formData.group_mode_id);
                                    return gm?.name === "progress" ? (
                                        <div className="text-xs text-slate-500 mt-1">
                                            Untuk mode <b>progress</b>, detail mode wajib dipilih.
                                        </div>
                                    ) : null;
                                })()}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Permission</label>
                                <select
                                    className={select}
                                    value={formData.permission_type}
                                    onChange={(e) => setFormData({ ...formData, permission_type: e.target.value })}
                                >
                                    <option value="umum">Umum</option>
                                    <option value="admin_only">Admin Only</option>
                                    <option value="authorized_only">Authorized Only</option>
                                    <option value="all_members">All Members</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 mt-6">
                                <input
                                    id="is_active"
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                />
                                <label htmlFor="is_active" className="text-sm">Active</label>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button type="submit" className={btnSuccess} disabled={saving}>
                                {saving ? "Saving..." : (editingGroup ? "Update" : "Add")}
                            </button>
                            <button type="button" className={btnGhost} onClick={cancelForm}>
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                {/* Groups List */}
                {loading ? (
                    <div className="text-center py-8 text-slate-500">Loading...</div>
                ) : (
                    <div className="space-y-3">
                        {groups.map((group) => (
                            <div key={group.id} className="border rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        {/* Klik nama grup => buka detail */}
                                        <button
                                            className="font-medium text-left hover:underline"
                                            onClick={() => openDetail(group)}
                                            title="Click to view detail"
                                        >
                                            {group.group_name || group.name}
                                        </button>
                                        <p className="text-sm text-slate-600">{group.group_jid || group.jid}</p>
                                        <div className="text-xs text-slate-500">
                                            <span>Session: {group.session?.name || "-"} ({group.session?.wa_number || "-"})</span>
                                            <span className="ml-2">
                        • Mode: <b>{group.groupMode?.name || "-"}</b>
                                                {group.detailMode?.name ? <span> — {group.detailMode?.name}</span> : null}
                      </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge color={group.is_active ? "green" : "slate"}>
                                            {group.is_active ? "Active" : "Inactive"}
                                        </Badge>
                                        {group.groupMode?.name === 'progress' && (
                                            <Badge color="sky">Progress</Badge>
                                        )}

                                        {/* Edit */}
                                        <button
                                            className={btnGhost}
                                            onClick={() => startEditGroup(group)}
                                            title="Edit group"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>

                                        {/* Toggle Active */}
                                        <button
                                            className={group.is_active ? btnWarning : btnSuccess}
                                            onClick={() => handleToggleActive(group)}
                                            title="Toggle active"
                                        >
                                            {group.is_active ? <ToggleRight /> : <ToggleLeft />}
                                        </button>

                                        {/* Sync metadata */}
                                        <button
                                            className={btnPrimary}
                                            onClick={() => handleSyncMetadata(group)}
                                            disabled={syncing}
                                            title="Sync metadata"
                                        >
                                            <RefreshCcw className="h-4 w-4" />
                                        </button>

                                        {/* Delete */}
                                        <button
                                            className={btnDanger}
                                            onClick={() => handleDeleteGroup(group)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500">
                                    Members: {group.participants_count ?? (group.group_participants?.length || 0)} •
                                    Admins: {group.admins_count ?? (group.group_admins?.length || 0)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            <GroupDetailModal
                open={showDetail}
                onClose={() => setShowDetail(false)}
                group={selectedGroup}
            />
        </div>
    );
}

// ————————————————————————————————————————
// GroupModeModal — CRUD group modes
// ————————————————————————————————————————
function GroupModeModal({ open, onClose }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({
        name: "",
        description: "",
        config: {},
        is_active: true,
    });

    useEffect(() => {
        if (open) load();
    }, [open]);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/whatsapp/group-modes");
            setItems(data?.data || []);
        } catch (e) {
            console.error("Load group-modes failed:", e);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEditing(null);
        setForm({ name: "", description: "", config: {}, is_active: true });
        setShowForm(false);
    };

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editing) {
                await axios.put(`/api/whatsapp/group-modes/${editing.id}`, form);
            } else {
                await axios.post("/api/whatsapp/group-modes", form);
            }
            await load();
            resetForm();
        } catch (e) {
            console.error("Save group-mode failed:", e);
            alert(e.response?.data?.error || "Save failed");
        } finally {
            setSaving(false);
        }
    };

    const remove = async (row) => {
        if (!confirm(`Delete group mode "${row.name}"?`)) return;
        try {
            await axios.delete(`/api/whatsapp/group-modes/${row.id}`);
            await load();
        } catch (e) {
            console.error("Delete group-mode failed:", e);
            alert(e.response?.data?.error || "Delete failed");
        }
    };

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Settings className="h-5 w-5" /> Group Modes
                    </h3>
                    <div className="flex gap-2">
                        {!showForm && (
                            <button className={btnPrimary} onClick={() => setShowForm(true)}>
                                <Plus className="h-4 w-4" /> Add
                            </button>
                        )}
                        <button className={btnGhost} onClick={onClose}>Close</button>
                    </div>
                </div>

                {showForm && (
                    <form onSubmit={submit} className="border rounded-xl p-4 mb-4 bg-slate-50 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Name</label>
                                <input className={input} value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} required/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Status</label>
                                <select className={select} value={String(form.is_active)} onChange={(e)=>setForm({...form, is_active: e.target.value === "true"})}>
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Description</label>
                            <textarea className={textarea} value={form.description} onChange={(e)=>setForm({...form, description:e.target.value})}/>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Config (JSON)</label>
                            <textarea
                                className={textarea}
                                value={JSON.stringify(form.config, null, 2)}
                                onChange={(e)=>{
                                    try {
                                        const v = JSON.parse(e.target.value || "{}");
                                        setForm({...form, config:v});
                                    } catch {}
                                }}
                                placeholder="{}"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button className={btnPrimary} disabled={saving}>{editing ? "Update" : "Create"}</button>
                            <button type="button" className={btnGhost} onClick={resetForm}>Cancel</button>
                        </div>
                    </form>
                )}

                {loading ? (
                    <div className="text-center py-8 text-slate-500">Loading…</div>
                ) : items.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">No group modes</div>
                ) : (
                    <div className="space-y-3">
                        {items.map((row)=>(
                            <div key={row.id} className="border rounded-xl p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium">{row.name}</span>
                                            <Badge color={row.is_active ? "green" : "slate"}>{row.is_active ? "Active" : "Inactive"}</Badge>
                                        </div>
                                        {row.description && <div className="text-sm text-slate-600 mb-2">{row.description}</div>}
                                        <details className="text-xs">
                                            <summary className="cursor-pointer text-slate-600">Config</summary>
                                            <pre className="mt-2 p-2 bg-slate-50 rounded border overflow-x-auto">{JSON.stringify(row.config || {}, null, 2)}</pre>
                                        </details>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className={btnGhost} onClick={()=>{
                                            setEditing(row);
                                            setForm({
                                                name: row.name,
                                                description: row.description || "",
                                                config: row.config || {},
                                                is_active: !!row.is_active,
                                            });
                                            setShowForm(true);
                                        }}>
                                            <Edit className="h-4 w-4"/> Edit
                                        </button>
                                        <button className={btnDanger} onClick={()=>remove(row)}>
                                            <Trash2 className="h-4 w-4"/> Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ————————————————————————————————————————
// DetailModeModal — CRUD detail modes (fixed)
// ————————————————————————————————————————
function DetailModeModal({ open, onClose }) {
    const [items, setItems] = useState([]);
    const [groupModes, setGroupModes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({
        group_mode_id: "",
        name: "",
        description: "",
        config: {},
        is_active: true,
    });

    useEffect(() => { if (open) { load(); loadGroupModes(); } }, [open]);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/whatsapp/detail-modes");
            setItems(data?.data || []);
        } catch (e) {
            console.error("Load detail-modes failed:", e);
        } finally {
            setLoading(false);
        }
    };

    const loadGroupModes = async () => {
        try {
            const { data } = await axios.get("/api/whatsapp/group-modes?is_active=true");
            setGroupModes(data?.data || []);
        } catch (e) {
            console.error("Load group-modes failed:", e);
        }
    };

    const resetForm = () => {
        setEditing(null);
        setForm({ group_mode_id: "", name: "", description: "", config: {}, is_active: true });
        setShowForm(false);
    };

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (!form.group_mode_id) {
                alert("Group Mode is required");
                return;
            }
            if (editing) {
                await axios.put(`/api/whatsapp/detail-modes/${editing.id}`, form);
            } else {
                await axios.post("/api/whatsapp/detail-modes", form); // controller mewajibkan group_mode_id & name
            }
            await load();
            resetForm();
        } catch (e) {
            console.error("Save detail-mode failed:", e);
            alert(e.response?.data?.error || e.response?.data?.message || "Save failed");
        } finally {
            setSaving(false);
        }
    };

    const remove = async (row) => {
        if (!confirm(`Delete detail mode "${row.name}"?`)) return;
        try {
            await axios.delete(`/api/whatsapp/detail-modes/${row.id}`);
            await load();
        } catch (e) {
            console.error("Delete detail-mode failed:", e);
            alert(e.response?.data?.error || e.response?.data?.message || "Delete failed");
        }
    };

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[85vh] overflow-y-auto" onClick={(e)=>e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5" /> Detail Modes
                    </h3>
                    <div className="flex gap-2">
                        {!showForm && (
                            <button className={btnPrimary} onClick={()=>setShowForm(true)}>
                                <Plus className="h-4 w-4" /> Add
                            </button>
                        )}
                        <button className={btnGhost} onClick={onClose}>Close</button>
                    </div>
                </div>

                {showForm && (
                    <form onSubmit={submit} className="border rounded-xl p-4 mb-4 bg-slate-50 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Group Mode</label>
                                <select
                                    className={select}
                                    value={form.group_mode_id}
                                    onChange={(e)=>setForm({ ...form, group_mode_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select Group Mode</option>
                                    {groupModes.map((gm)=>(
                                        <option key={gm.id} value={gm.id}>{gm.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Name</label>
                                <input
                                    className={input}
                                    value={form.name}
                                    onChange={(e)=>setForm({...form, name:e.target.value})}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Status</label>
                                <select
                                    className={select}
                                    value={String(form.is_active)}
                                    onChange={(e)=>setForm({...form, is_active: e.target.value === "true"})}
                                >
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Description</label>
                            <textarea
                                className={textarea}
                                value={form.description}
                                onChange={(e)=>setForm({...form, description:e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Config (JSON)</label>
                            <textarea
                                className={textarea}
                                value={JSON.stringify(form.config, null, 2)}
                                onChange={(e)=>{
                                    try {
                                        const v = e.target.value?.trim();
                                        setForm({...form, config: v ? JSON.parse(v) : {}});
                                    } catch {
                                        // biarkan user mengetik; validasi ringan saat submit jika perlu
                                    }
                                }}
                                placeholder="{}"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button className={btnPrimary} disabled={saving}>{editing ? "Update" : "Create"}</button>
                            <button type="button" className={btnGhost} onClick={resetForm}>Cancel</button>
                        </div>
                    </form>
                )}

                {loading ? (
                    <div className="text-center py-8 text-slate-500">Loading…</div>
                ) : items.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">No detail modes</div>
                ) : (
                    <div className="space-y-3">
                        {items.map((row)=>(
                            <div key={row.id} className="border rounded-xl p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium">{row.name}</span>
                                            <Badge color={row.is_active ? "green" : "slate"}>
                                                {row.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-slate-600 mb-1">
                                            Group Mode: <b>{row.groupMode?.name || "-"}</b>
                                        </div>
                                        {row.description && (
                                            <div className="text-sm text-slate-600 mb-2">{row.description}</div>
                                        )}
                                        <div className="text-xs text-slate-500 mb-2">
                                            Groups using this detail: {row.groups_count ?? 0}
                                        </div>
                                        <details className="text-xs">
                                            <summary className="cursor-pointer text-slate-600">Config</summary>
                                            <pre className="mt-2 p-2 bg-slate-50 rounded border overflow-x-auto">
                        {JSON.stringify(row.config || {}, null, 2)}
                      </pre>
                                        </details>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            className={btnGhost}
                                            onClick={()=>{
                                                setEditing(row);
                                                setForm({
                                                    group_mode_id: row.group_mode_id || row.groupMode?.id || "",
                                                    name: row.name,
                                                    description: row.description || "",
                                                    config: row.config || {},
                                                    is_active: !!row.is_active,
                                                });
                                                setShowForm(true);
                                            }}
                                        >
                                            <Edit className="h-4 w-4" /> Edit
                                        </button>
                                        <button className={btnDanger} onClick={()=>remove(row)}>
                                            <Trash2 className="h-4 w-4" /> Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ————————————————————————————————————————
// Messaging Modal
// ————————————————————————————————————————
function MessagingModal({ open, onClose }) {
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState("");
    const [messageType, setMessageType] = useState("text");
    const [recipient, setRecipient] = useState("");
    const [message, setMessage] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [caption, setCaption] = useState("");
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (open) {
            loadSessions();
        }
    }, [open]);

    const loadSessions = async () => {
        try {
            const { data } = await axios.get("/api/whatsapp/sessions");
            setSessions(data.data?.filter(s => s.actual_status === "connected") || []);
        } catch (e) {
            console.error("Load sessions failed:", e);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!selectedSession || !recipient) return;

        setSending(true);
        try {
            if (messageType === "text") {
                await axios.post("/api/whatsapp/send/text", {
                    session_id: selectedSession,
                    to: recipient,
                    message
                });
            } else if (messageType === "image") {
                await axios.post("/api/whatsapp/send/image", {
                    session_id: selectedSession,
                    to: recipient,
                    image_url: imageUrl,
                    caption
                });
            }

            // Reset form
            setRecipient("");
            setMessage("");
            setImageUrl("");
            setCaption("");
            alert("Message sent successfully!");
        } catch (e) {
            console.error("Send failed:", e);
            alert(e.response?.data?.error || "Send failed");
        } finally {
            setSending(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Send Message
                    </h3>
                    <button className={btnGhost} onClick={onClose}>Close</button>
                </div>

                <form onSubmit={handleSendMessage} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Session</label>
                        <select
                            className={select}
                            value={selectedSession}
                            onChange={(e) => setSelectedSession(e.target.value)}
                            required
                        >
                            <option value="">Select connected session...</option>
                            {sessions.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.wa_number})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Message Type</label>
                        <select
                            className={select}
                            value={messageType}
                            onChange={(e) => setMessageType(e.target.value)}
                        >
                            <option value="text">Text Message</option>
                            <option value="image">Image Message</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Recipient</label>
                        <input
                            className={input}
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            placeholder="628123456789 or 120363xxx@g.us"
                            required
                        />
                        <div className="text-xs text-slate-500 mt-1">
                            Format: 628xxx for individual, group@g.us for group
                        </div>
                    </div>

                    {messageType === "text" ? (
                        <div>
                            <label className="block text-sm font-medium mb-1">Message</label>
                            <textarea
                                className={textarea}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Type your message..."
                                required
                            />
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium mb-1">Image URL</label>
                                <input
                                    className={input}
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(forceHttps(e.target.value))}
                                    placeholder="https://example.com/image.jpg"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Caption (optional)</label>
                                <textarea
                                    className={textarea}
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                    placeholder="Image caption..."
                                />
                            </div>
                        </>
                    )}

                    <div className="flex gap-2 pt-2">
                        <button type="submit" className={btnPrimary} disabled={sending}>
                            <Send className="h-4 w-4" />
                            {sending ? "Sending..." : "Send Message"}
                        </button>
                        <button type="button" className={btnGhost} onClick={onClose}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ————————————————————————————————————————
// Analytics Modal
// ————————————————————————————————————————
function AnalyticsModal({ open, onClose }) {
    const [analytics, setAnalytics] = useState({
        sessions: null,
        groups: null,
        messages: null
    });
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("sessions");

    useEffect(() => {
        if (open) {
            loadAnalytics();
        }
    }, [open]);

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            const [sessionsRes, groupsRes, messagesRes] = await Promise.all([
                axios.get("/api/whatsapp/analytics/sessions"),
                axios.get("/api/whatsapp/analytics/groups"),
                axios.get("/api/whatsapp/analytics/messages")
            ]);

            setAnalytics({
                sessions: sessionsRes.data.data,
                groups: groupsRes.data.data,
                messages: messagesRes.data.data
            });
        } catch (e) {
            console.error("Load analytics failed:", e);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: "sessions", label: "Sessions", icon: Settings },
        { id: "groups", label: "Groups", icon: Users },
        { id: "messages", label: "Messages", icon: MessageSquare }
    ];

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        WhatsApp Analytics
                    </h3>
                    <div className="flex gap-2">
                        <button className={btnPrimary} onClick={loadAnalytics} disabled={loading}>
                            <RefreshCcw className="h-4 w-4" /> Refresh
                        </button>
                        <button className={btnGhost} onClick={onClose}>Close</button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b mb-4">
                    <div className="flex space-x-8">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 py-2 border-b-2 font-medium text-sm ${
                                        activeTab === tab.id
                                            ? "border-sky-500 text-sky-600"
                                            : "border-transparent text-slate-500 hover:text-slate-700"
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="text-center py-8 text-slate-500">
                        <div className="animate-spin w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                        Loading analytics...
                    </div>
                ) : (
                    <div className="space-y-4">
                        {activeTab === "sessions" && analytics.sessions && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="border rounded-xl p-4">
                                    <div className="text-2xl font-bold text-slate-800">
                                        {analytics.sessions.total || 0}
                                    </div>
                                    <div className="text-sm text-slate-500">Total Sessions</div>
                                </div>
                                <div className="border border-green-200 bg-green-50 rounded-xl p-4">
                                    <div className="text-2xl font-bold text-green-800">
                                        {analytics.sessions.connected || 0}
                                    </div>
                                    <div className="text-sm text-green-600">Connected</div>
                                </div>
                                <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
                                    <div className="text-2xl font-bold text-amber-800">
                                        {analytics.sessions.starting || 0}
                                    </div>
                                    <div className="text-sm text-amber-600">Starting</div>
                                </div>
                                <div className="border border-red-200 bg-red-50 rounded-xl p-4">
                                    <div className="text-2xl font-bold text-red-800">
                                        {analytics.sessions.error || 0}
                                    </div>
                                    <div className="text-sm text-red-600">Errors</div>
                                </div>
                            </div>
                        )}

                        {activeTab === "groups" && analytics.groups && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="border rounded-xl p-4">
                                    <div className="text-2xl font-bold text-slate-800">
                                        {analytics.groups.total || 0}
                                    </div>
                                    <div className="text-sm text-slate-500">Total Groups</div>
                                </div>
                                <div className="border border-green-200 bg-green-50 rounded-xl p-4">
                                    <div className="text-2xl font-bold text-green-800">
                                        {analytics.groups.active || 0}
                                    </div>
                                    <div className="text-sm text-green-600">Active</div>
                                </div>
                                <div className="border border-slate-200 bg-slate-50 rounded-xl p-4">
                                    <div className="text-2xl font-bold text-slate-800">
                                        {analytics.groups.inactive || 0}
                                    </div>
                                    <div className="text-sm text-slate-600">Inactive</div>
                                </div>
                            </div>
                        )}

                        {activeTab === "messages" && analytics.messages && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="border rounded-xl p-4">
                                    <div className="text-2xl font-bold text-slate-800">
                                        {analytics.messages.total || 0}
                                    </div>
                                    <div className="text-sm text-slate-500">Total Messages</div>
                                </div>
                                <div className="border border-blue-200 bg-blue-50 rounded-xl p-4">
                                    <div className="text-2xl font-bold text-blue-800">
                                        {analytics.messages.sent || 0}
                                    </div>
                                    <div className="text-sm text-blue-600">Sent</div>
                                </div>
                                <div className="border border-purple-200 bg-purple-50 rounded-xl p-4">
                                    <div className="text-2xl font-bold text-purple-800">
                                        {analytics.messages.received || 0}
                                    </div>
                                    <div className="text-sm text-purple-600">Received</div>
                                </div>
                                <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4">
                                    <div className="text-2xl font-bold text-emerald-800">
                                        {analytics.messages.today || 0}
                                    </div>
                                    <div className="text-sm text-emerald-600">Today</div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ————————————————————————————————————————
// Bulk Operations Modal - FIXED
// ————————————————————————————————————————
function BulkOperationsModal({ open, onClose }) {
    const [operation, setOperation] = useState("bulk-sync-groups");
    const [processing, setProcessing] = useState(false);
    const [results, setResults] = useState(null);

    // Form states untuk berbagai operations
    const [sessions, setSessions] = useState([]);
    const [groups, setGroups] = useState([]);
    const [selectedSessionId, setSelectedSessionId] = useState("");
    const [selectedGroupIds, setSelectedGroupIds] = useState([]);
    const [bulkUsers, setBulkUsers] = useState("");
    const [loadingData, setLoadingData] = useState(false);

    const operations = [
        {
            id: "bulk-sync-groups",
            label: "Bulk Sync Groups",
            description: "Sync metadata for all groups from a specific session",
            requiresSession: true,
            requiresGroups: false
        },
        {
            id: "bulk-toggle-groups",
            label: "Bulk Toggle Groups",
            description: "Toggle active status for selected groups",
            requiresSession: false,
            requiresGroups: true
        },
        {
            id: "bulk-add-users",
            label: "Bulk Add Authorized Users",
            description: "Add multiple authorized users (JSON format)",
            requiresSession: false,
            requiresGroups: false
        }
    ];

    // Load sessions dan groups ketika modal dibuka
    useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open]);

    const loadData = async () => {
        setLoadingData(true);
        try {
            const [sessionsRes, groupsRes] = await Promise.all([
                axios.get("/api/whatsapp/sessions"),
                axios.get("/api/whatsapp/groups")
            ]);
            setSessions(sessionsRes.data.data?.filter(s => s.actual_status === "connected") || []);
            setGroups(groupsRes.data.data || []);
        } catch (e) {
            console.error("Load data failed:", e);
        } finally {
            setLoadingData(false);
        }
    };

    const currentOperation = operations.find(op => op.id === operation);

    const handleExecute = async () => {
        setProcessing(true);
        setResults(null);

        try {
            let response;
            let payload = {};

            switch (operation) {
                case "bulk-sync-groups":
                    if (!selectedSessionId) {
                        throw new Error("Please select a session");
                    }
                    payload = { session_id: selectedSessionId };
                    response = await axios.post("/api/whatsapp/groups/bulk-sync", payload);
                    break;

                case "bulk-toggle-groups":
                    if (selectedGroupIds.length === 0) {
                        throw new Error("Please select at least one group");
                    }
                    payload = { group_ids: selectedGroupIds };
                    response = await axios.post("/api/whatsapp/groups/bulk-toggle", payload);
                    break;

                case "bulk-add-users":
                    try {
                        const users = JSON.parse(bulkUsers || "[]");
                        if (!Array.isArray(users) || users.length === 0) {
                            throw new Error("Please provide valid users JSON array");
                        }
                        payload = { users };
                        response = await axios.post("/api/whatsapp/authorized-users/bulk-add", payload);
                    } catch (parseError) {
                        throw new Error("Invalid JSON format for users");
                    }
                    break;

                default:
                    throw new Error("Unknown operation");
            }

            setResults({
                success: true,
                message: "Operation completed successfully",
                data: response.data
            });
        } catch (e) {
            console.error("Bulk operation failed:", e);
            setResults({
                error: true,
                message: e.message || e.response?.data?.error || "Operation failed",
                details: e.response?.data
            });
        } finally {
            setProcessing(false);
        }
    };

    const handleGroupToggle = (groupId) => {
        setSelectedGroupIds(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    };

    const resetForm = () => {
        setSelectedSessionId("");
        setSelectedGroupIds([]);
        setBulkUsers("");
        setResults(null);
    };

    // Reset form ketika operation berubah
    useEffect(() => {
        resetForm();
    }, [operation]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Bulk Operations
                    </h3>
                    <button className={btnGhost} onClick={onClose}>Close</button>
                </div>

                <div className="space-y-6">
                    {/* Operation Selection */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Select Operation</label>
                        <div className="space-y-2">
                            {operations.map(op => (
                                <label key={op.id} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                                    <input
                                        type="radio"
                                        name="operation"
                                        value={op.id}
                                        checked={operation === op.id}
                                        onChange={(e) => setOperation(e.target.value)}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-medium">{op.label}</div>
                                        <div className="text-sm text-slate-600">{op.description}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Dynamic Form based on Operation */}
                    {currentOperation && (
                        <div className="border rounded-xl p-4 bg-slate-50">
                            <h4 className="font-medium mb-3">Configuration for {currentOperation.label}</h4>

                            {loadingData ? (
                                <div className="text-center py-4 text-slate-500">Loading...</div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Session Selection */}
                                    {currentOperation.requiresSession && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">
                                                Select Session <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                className={select}
                                                value={selectedSessionId}
                                                onChange={(e) => setSelectedSessionId(e.target.value)}
                                            >
                                                <option value="">Choose a connected session...</option>
                                                {sessions.map(session => (
                                                    <option key={session.id} value={session.id}>
                                                        {session.name} ({session.wa_number || 'No number'})
                                                    </option>
                                                ))}
                                            </select>
                                            {sessions.length === 0 && (
                                                <div className="text-xs text-amber-600 mt-1">
                                                    ⚠️ No connected sessions available
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Group Selection */}
                                    {currentOperation.requiresGroups && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">
                                                Select Groups <span className="text-red-500">*</span>
                                            </label>
                                            <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-2">
                                                {groups.length === 0 ? (
                                                    <div className="text-sm text-slate-500 py-4 text-center">
                                                        No groups available
                                                    </div>
                                                ) : (
                                                    groups.map(group => (
                                                        <label key={group.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedGroupIds.includes(group.id)}
                                                                onChange={() => handleGroupToggle(group.id)}
                                                            />
                                                            <div className="flex-1">
                                                                <div className="font-medium text-sm">{group.group_name || group.name}</div>
                                                                <div className="text-xs text-slate-500">{group.group_jid || group.jid}</div>
                                                            </div>
                                                            <Badge color={group.is_active ? "green" : "slate"}>
                                                                {group.is_active ? "Active" : "Inactive"}
                                                            </Badge>
                                                        </label>
                                                    ))
                                                )}
                                            </div>
                                            {selectedGroupIds.length > 0 && (
                                                <div className="text-xs text-sky-600 mt-1">
                                                    {selectedGroupIds.length} group(s) selected
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Bulk Users JSON Input */}
                                    {operation === "bulk-add-users" && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">
                                                Users JSON <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                className={textarea}
                                                value={bulkUsers}
                                                onChange={(e) => setBulkUsers(e.target.value)}
                                                placeholder={`[
  {
    "phone": "628123456789",
    "name": "John Doe",
    "role": "admin"
  },
  {
    "phone": "628987654321", 
    "name": "Jane Smith",
    "role": "user"
  }
]`}
                                                rows={8}
                                            />
                                            <div className="text-xs text-slate-500 mt-1">
                                                Provide JSON array of users with phone, name, and role fields
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Results */}
                    {results && (
                        <div className={`p-4 rounded-lg ${
                            results.error
                                ? 'bg-red-50 border border-red-200'
                                : 'bg-green-50 border border-green-200'
                        }`}>
                            <div className="font-medium mb-2 flex items-center gap-2">
                                {results.error ? (
                                    <>
                                        <span className="text-red-600">❌</span>
                                        <span className="text-red-800">Operation Failed</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-green-600">✅</span>
                                        <span className="text-green-800">Operation Successful</span>
                                    </>
                                )}
                            </div>
                            <div className="text-sm mb-2">
                                {results.message}
                            </div>
                            {results.data && (
                                <details className="mt-2">
                                    <summary className="cursor-pointer text-xs text-slate-600 hover:text-slate-800">
                                        Show Details
                                    </summary>
                                    <pre className="text-xs text-slate-700 mt-2 p-2 bg-white rounded border overflow-x-auto">
                                        {JSON.stringify(results.data, null, 2)}
                                    </pre>
                                </details>
                            )}
                            {results.details && results.error && (
                                <details className="mt-2">
                                    <summary className="cursor-pointer text-xs text-red-600 hover:text-red-800">
                                        Error Details
                                    </summary>
                                    <pre className="text-xs text-red-700 mt-2 p-2 bg-white rounded border overflow-x-auto">
                                        {JSON.stringify(results.details, null, 2)}
                                    </pre>
                                </details>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4 border-t">
                        <button
                            className={btnPrimary}
                            onClick={handleExecute}
                            disabled={processing || !currentOperation}
                        >
                            <Zap className="h-4 w-4" />
                            {processing ? "Processing..." : "Execute Operation"}
                        </button>
                        <button
                            className={btnGhost}
                            onClick={resetForm}
                            disabled={processing}
                        >
                            <RefreshCcw className="h-4 w-4" />
                            Reset Form
                        </button>
                        <button className={btnGhost} onClick={onClose}>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}


// ————————————————————————————————————————
// Create Session Form (keeping existing)
// ————————————————————————————————————————
function CreateSessionForm({ onCreated }) {
    const [name, setName] = useState("");
    const [userId, setUserId] = useState("");
    const [sessionModeId, setSessionModeId] = useState("");
    const [sessionModes, setSessionModes] = useState([]);
    const [saving, setSaving] = useState(false);
    const [loadingModes, setLoadingModes] = useState(false);

    useEffect(() => {
        const loadModes = async () => {
            setLoadingModes(true);
            try {
                const { data } = await axios.get("/api/whatsapp/session-modes");
                setSessionModes(data.data || []);
            } catch (e) {
                console.error("Failed to load session modes:", e);
            } finally {
                setLoadingModes(false);
            }
        };
        loadModes();
    }, []);

    const submit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        try {
            const payload = {
                name,
                user_id: userId || null,
                session_mode_id: sessionModeId || null
            };
            await axios.post("/api/whatsapp/session", payload);
            setName("");
            setUserId("");
            setSessionModeId("");
            onCreated?.();
        } catch (e) {
            console.error("Create session failed:", e);
            alert(e.response?.data?.error || "Create failed");
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="text-sm font-semibold">Buat Session WA</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                    <label className="block text-xs text-slate-500 mb-1">Nama Session*</label>
                    <input
                        className={input}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Misal: kasir-counter-1"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs text-slate-500 mb-1">User ID (opsional)</label>
                    <input
                        className={input}
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="UUID user (opsional)"
                    />
                </div>
                <div>
                    <label className="block text-xs text-slate-500 mb-1">Session Mode (opsional)</label>
                    <select
                        className={select}
                        value={sessionModeId}
                        onChange={(e) => setSessionModeId(e.target.value)}
                        disabled={loadingModes}
                    >
                        <option value="">Pilih mode...</option>
                        {sessionModes.map(mode => (
                            <option key={mode.id} value={mode.id}>{mode.name}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="flex gap-2">
                <button className={btnPrimary} disabled={saving}>
                    <Plus className="h-4 w-4"/> {saving ? "Membuat..." : "Buat"}
                </button>
                <button
                    className={btnGhost}
                    type="reset"
                    onClick={() => {setName("");setUserId("");setSessionModeId("");}}
                >
                    Reset
                </button>
            </div>
        </form>
    );
}

// ————————————————————————————————————————
// Edit Session Modal (keeping existing)
// ————————————————————————————————————————
function EditSessionModal({ open, onClose, session, onUpdated }) {
    const [name, setName] = useState("");
    const [sessionModeId, setSessionModeId] = useState("");
    const [sessionModes, setSessionModes] = useState([]);
    const [saving, setSaving] = useState(false);
    const [loadingModes, setLoadingModes] = useState(false);

    useEffect(() => {
        if (open && session) {
            setName(session.name || "");
            setSessionModeId(session.session_mode_id || "");
        }
    }, [open, session]);

    useEffect(() => {
        if (open) {
            const loadModes = async () => {
                setLoadingModes(true);
                try {
                    const { data } = await axios.get("/api/whatsapp/session-modes");
                    setSessionModes(data.data || []);
                } catch (e) {
                    console.error("Failed to load session modes:", e);
                } finally {
                    setLoadingModes(false);
                }
            };
            loadModes();
        }
    }, [open]);

    const handleSave = async () => {
        if (!name.trim() || !session) return;
        setSaving(true);
        try {
            await axios.put(`/api/whatsapp/session/${session.id}`, {
                name,
                session_mode_id: sessionModeId || null
            });
            onUpdated?.();
            onClose();
        } catch (e) {
            console.error("Update session failed:", e);
            alert(e.response?.data?.error || "Update failed");
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                    <div className="text-base font-semibold">Edit Session</div>
                    <button className={btnGhost} onClick={onClose}>Tutup</button>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Nama Session*</label>
                        <input
                            className={input}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nama session"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Session Mode</label>
                        <select
                            className={select}
                            value={sessionModeId}
                            onChange={(e) => setSessionModeId(e.target.value)}
                            disabled={loadingModes}
                        >
                            <option value="">Tanpa mode</option>
                            {sessionModes.map(mode => (
                                <option key={mode.id} value={mode.id}>{mode.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button className={btnPrimary} onClick={handleSave} disabled={saving}>
                            <Edit className="h-4 w-4"/> {saving ? "Menyimpan..." : "Simpan"}
                        </button>
                        <button className={btnGhost} onClick={onClose}>Batal</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ————————————————————————————————————————
// Session Detail Modal (keeping existing)
// ————————————————————————————————————————
function SessionDetailModal({ open, onClose, session }) {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || !session) return;
        const loadDetail = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get(`/api/whatsapp/session/${session.id}`);
                setDetail(data.data);
            } catch (e) {
                console.error("Load detail failed:", e);
            } finally {
                setLoading(false);
            }
        };
        loadDetail();
    }, [open, session]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl p-5 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <div className="text-lg font-semibold">Detail Session</div>
                    <button className={btnGhost} onClick={onClose}>Tutup</button>
                </div>

                {loading ? (
                    <div className="text-center py-8 text-slate-500">Memuat detail...</div>
                ) : detail ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs text-slate-500">Nama</div>
                                <div className="font-medium">{detail.name}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500">Status</div>
                                <Badge color={statusColor(detail.actual_status)}>
                                    {detail.actual_status}
                                </Badge>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500">WhatsApp Number</div>
                                <div>{detail.wa_number || "-"}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500">Device Name</div>
                                <div>{detail.device_name || "-"}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500">Session Mode</div>
                                <div>{detail.sessionMode?.name || "-"}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500">Groups Count</div>
                                <div>{detail.groups_count || 0}</div>
                            </div>
                        </div>

                        {detail.connected_at && (
                            <div>
                                <div className="text-xs text-slate-500">Connected At</div>
                                <div>{new Date(detail.connected_at).toLocaleString()}</div>
                            </div>
                        )}

                        {detail.meta && Object.keys(detail.meta).length > 0 && (
                            <div>
                                <div className="text-xs text-slate-500 mb-2">Metadata</div>
                                <pre className="text-xs bg-slate-50 p-3 rounded border overflow-x-auto">
                                    {JSON.stringify(detail.meta, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-500">Detail tidak tersedia</div>
                )}
            </div>
        </div>
    );
}

// ————————————————————————————————————————
// QR Modal (keeping existing)
// ————————————————————————————————————————
function QrModal({ open, onClose, fetchQr }) {
    const [dataUrl, setDataUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data } = await fetchQr();
                setDataUrl(data?.data?.qr || null);
            } catch (e) {
                console.error("QR fetch failed:", e);
                setError(e.response?.data?.error || "QR fetch failed");
            } finally {
                setLoading(false);
            }
        };

        load();
        timerRef.current = setInterval(load, 3000);
        return () => timerRef.current && clearInterval(timerRef.current);
    }, [open, fetchQr]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                    <div className="text-base font-semibold">Scan QR WhatsApp</div>
                    <button className={btnGhost} onClick={onClose}>Tutup</button>
                </div>
                <div className="border rounded-xl p-4 flex items-center justify-center min-h-[280px]">
                    {loading ? (
                        <div className="text-sm text-slate-500">Memuat QR…</div>
                    ) : error ? (
                        <div className="text-sm text-red-500 text-center">
                            <div>❌ {error}</div>
                            <div className="mt-2 text-xs">Pastikan session sedang starting</div>
                        </div>
                    ) : dataUrl ? (
                        <img src={dataUrl} alt="QR" className="w-64 h-64 object-contain"/>
                    ) : (
                        <div className="text-sm text-slate-500 text-center">
                            QR belum tersedia.<br/>
                            <span className="text-xs">Pastikan session sedang <b>starting</b>.</span>
                        </div>
                    )}
                </div>
                <div className="text-xs text-slate-500 mt-2">QR akan refresh otomatis setiap 3 detik.</div>
            </div>
        </div>
    );
}

// ————————————————————————————————————————
// Session Card (keeping existing)
// ————————————————————————————————————————
function SessionCard({ item, onChanged }) {
    const [busy, setBusy] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showDetail, setShowDetail] = useState(false);

    const color = statusColor(item.actual_status);

    const start = async () => {
        setBusy(true);
        try {
            await axios.post(`/api/whatsapp/session/${item.id}/start`);
            await onChanged?.();
        } catch (e) {
            console.error("Start failed:", e);
            alert(e.response?.data?.error || "Start failed");
        } finally {
            setBusy(false);
        }
    };

    const stop = async () => {
        if (!confirm("Hentikan session ini?")) return;
        setBusy(true);
        try {
            await axios.post(`/api/whatsapp/session/${item.id}/stop`);
            await onChanged?.();
        } catch (e) {
            console.error("Stop failed:", e);
            alert(e.response?.data?.error || "Stop failed");
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!confirm("Hapus session dan kredensialnya?")) return;
        setBusy(true);
        try {
            await axios.delete(`/api/whatsapp/session/${item.id}`);
            await onChanged?.();
        } catch (e) {
            console.error("Delete failed:", e);
            alert(e.response?.data?.error || "Delete failed");
        } finally {
            setBusy(false);
        }
    };

    const fetchQr = () => axios.get(`/api/whatsapp/session/${item.id}/qr`);

    const canStart = ["created", "disconnected", "stopped", "error"].includes(item.actual_status);
    const canStop = ["connected", "starting"].includes(item.actual_status);
    const canShowQr = ["starting"].includes(item.actual_status);

    return (
        <>
            <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <WaLogo className="h-10 w-10" />
                        <div>
                            <div className="font-semibold">{item.name}</div>
                            <div className="text-sm text-slate-500">
                                {item.wa_number ? `📱 ${item.wa_number}` : "Belum terkoneksi"}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge color={color}>{item.actual_status}</Badge>
                        {item.is_running && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
                    </div>
                </div>

                {item.device_name && (
                    <div className="text-sm text-slate-600">
                        🖥️ {item.device_name}
                    </div>
                )}

                {item.sessionMode && (
                    <div className="text-sm text-slate-600">
                        ⚙️ Mode: {item.sessionMode.name}
                    </div>
                )}

                <div className="text-xs text-slate-500">
                    Groups: {item.groups_count || 0} •
                    Created: {new Date(item.created_at).toLocaleDateString()}
                </div>

                <div className="flex flex-wrap gap-2">
                    {canStart && (
                        <button className={btnPrimary} onClick={start} disabled={busy}>
                            <Play className="h-4 w-4" /> Start
                        </button>
                    )}

                    {canStop && (
                        <button className={btnWarning} onClick={stop} disabled={busy}>
                            <Square className="h-4 w-4" /> Stop
                        </button>
                    )}

                    {canShowQr && (
                        <button className={btnGhost} onClick={() => setShowQr(true)} disabled={busy}>
                            <QrCode className="h-4 w-4" /> QR
                        </button>
                    )}

                    <button className={btnGhost} onClick={() => setShowDetail(true)}>
                        <Eye className="h-4 w-4" /> Detail
                    </button>

                    <button className={btnGhost} onClick={() => setShowEdit(true)}>
                        <Edit className="h-4 w-4" /> Edit
                    </button>

                    <button className={btnDanger} onClick={remove} disabled={busy}>
                        <Trash2 className="h-4 w-4" /> Delete
                    </button>
                </div>

                {busy && (
                    <div className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded border">
                        ⏳ Processing...
                    </div>
                )}
            </div>

            <QrModal
                open={showQr}
                onClose={() => setShowQr(false)}
                fetchQr={fetchQr}
            />

            <EditSessionModal
                open={showEdit}
                onClose={() => setShowEdit(false)}
                session={item}
                onUpdated={onChanged}
            />

            <SessionDetailModal
                open={showDetail}
                onClose={() => setShowDetail(false)}
                session={item}
            />
        </>
    );
}

// ————————————————————————————————————————
// Main Component
// ————————————————————————————————————————
export default function Sessions() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal states
    const [showGroups, setShowGroups] = useState(false);
    const [showMessaging, setShowMessaging] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [showBulkOps, setShowBulkOps] = useState(false);

    // Tambahkan state untuk progress categories
    const [progressCategories, setProgressCategories] = useState([]);

    const [showGroupModeModal, setShowGroupModeModal] = useState(false);
    const [showDetailModeModal, setShowDetailModeModal] = useState(false);


    const load = async () => {
        try {
            const { data } = await axios.get("/api/whatsapp/sessions");
            setSessions(data.data || []);
        } catch (e) {
            console.error("Load sessions failed:", e);
            setSessions([]);
        } finally {
            setLoading(false);
        }
    };

    const refresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    useEffect(() => {
        load();
    }, []);

    const stats = useMemo(() => {
        const connected = sessions.filter(s => s.actual_status === "connected").length;
        const starting = sessions.filter(s => s.actual_status === "starting").length;
        const running = sessions.filter(s => s.is_running).length;
        return { total: sessions.length, connected, starting, running };
    }, [sessions]);

    // Load progress categories
    useEffect(() => {
        const loadProgressCategories = async () => {
            try {
                const { data } = await axios.get("/api/progress/categories");
                setProgressCategories(data?.data || []);
            } catch (error) {
                console.error("Failed to load progress categories:", error);
            }
        };
        loadProgressCategories();
    }, []);


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <WaLogo className="h-8 w-8" />
                        WhatsApp Sessions
                    </h1>
                    <p className="text-slate-600 mt-1">
                        Kelola koneksi WhatsApp dan operasi messaging
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className={btnGhost} onClick={() => setShowAnalytics(true)}>
                        <BarChart3 className="h-4 w-4" /> Analytics
                    </button>
                    <button className={btnGhost} onClick={() => setShowMessaging(true)}>
                        <MessageSquare className="h-4 w-4" /> Send Message
                    </button>
                    <button className={btnGhost} onClick={() => setShowGroups(true)}>
                        <Users className="h-4 w-4" /> Groups
                    </button>
                    <button className={btnGhost} onClick={() => setShowBulkOps(true)}>
                        <Zap className="h-4 w-4" /> Bulk Ops
                    </button>
                    <button className={btnGhost} onClick={() => setShowGroupModeModal(true)}>
                        <Settings className="h-4 w-4" /> Group Modes
                    </button>
                    <button className={btnGhost} onClick={() => setShowDetailModeModal(true)}>
                        <FileText className="h-4 w-4" /> Detail Modes
                    </button>
                    <button
                        className={btnGhost}
                        onClick={refresh}
                        disabled={refreshing}
                    >
                        <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border border-slate-200 rounded-xl p-4">
                    <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
                    <div className="text-sm text-slate-500">Total Sessions</div>
                </div>
                <div className="border border-green-200 rounded-xl p-4 bg-green-50">
                    <div className="text-2xl font-bold text-green-800">{stats.connected}</div>
                    <div className="text-sm text-green-600">Connected</div>
                </div>
                <div className="border border-amber-200 rounded-xl p-4 bg-amber-50">
                    <div className="text-2xl font-bold text-amber-800">{stats.starting}</div>
                    <div className="text-sm text-amber-600">Starting</div>
                </div>
                <div className="border border-sky-200 rounded-xl p-4 bg-sky-50">
                    <div className="text-2xl font-bold text-sky-800">{stats.running}</div>
                    <div className="text-sm text-sky-600">Running</div>
                </div>
            </div>

            {/* Create Form */}
            <CreateSessionForm onCreated={refresh} />

            {/* Sessions List */}
            {loading ? (
                <div className="text-center py-12 text-slate-500">
                    <div className="animate-spin w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                    Memuat sessions...
                </div>
            ) : sessions.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                    <WaLogo className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <div className="text-lg font-medium">Belum ada session</div>
                    <div className="text-sm">Buat session WhatsApp pertama Anda</div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {sessions.map((item) => (
                        <SessionCard
                            key={item.id}
                            item={item}
                            onChanged={refresh}
                        />
                    ))}
                </div>
            )}

            {/* Modals */}
            <GroupsModal open={showGroups} onClose={() => setShowGroups(false)} />
            <MessagingModal open={showMessaging} onClose={() => setShowMessaging(false)} />
            <AnalyticsModal open={showAnalytics} onClose={() => setShowAnalytics(false)} />
            <BulkOperationsModal open={showBulkOps} onClose={() => setShowBulkOps(false)} />
            <GroupModeModal
                open={showGroupModeModal}
                onClose={() => setShowGroupModeModal(false)}
            />
            <DetailModeModal
                open={showDetailModeModal}
                onClose={() => setShowDetailModeModal(false)}
            />
        </div>
    );
}