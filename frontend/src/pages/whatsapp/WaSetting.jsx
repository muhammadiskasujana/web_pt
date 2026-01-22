import { useEffect, useState, useRef } from "react";
import axios from "../../config/axios";
import {
    Plus, Edit, Trash2, Eye, Settings, Users, Shield,
    ToggleLeft, ToggleRight, RefreshCcw, Search, Filter,
    Check, X, AlertCircle, Info
} from "lucide-react";

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
// Style constants & helpers
// ————————————————————————————————————————
const Badge = ({ color = "slate", children, className = "" }) => (
    <span className={`px-2 py-0.5 text-xs rounded-full border bg-${color}-50 text-${color}-700 border-${color}-200 ${className}`}>
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

// ————————————————————————————————————————
// Session Modes Component
// ————————————————————————————————————————
function SessionModes() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [formData, setFormData] = useState({ name: "", description: "", config: {}, is_active: true });
    const [saving, setSaving] = useState(false);

    const loadItems = async () => {
        try {
            const { data } = await axios.get("/api/whatsapp/session-modes");
            setItems(data.data || []);
        } catch (e) {
            console.error("Load session modes failed:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadItems();
    }, []);

    const resetForm = () => {
        setFormData({ name: "", description: "", config: {}, is_active: true });
        setEditItem(null);
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setSaving(true);
        try {
            if (editItem) {
                await axios.put(`/api/whatsapp/session-modes/${editItem.id}`, formData);
            } else {
                await axios.post("/api/whatsapp/session-modes", formData);
            }
            resetForm();
            loadItems();
        } catch (e) {
            console.error("Save failed:", e);
            alert(e.response?.data?.error || "Save failed");
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (item) => {
        setEditItem(item);
        setFormData({
            name: item.name || "",
            description: item.description || "",
            config: item.config || {},
            is_active: item.is_active
        });
        setShowForm(true);
    };

    const handleDelete = async (item) => {
        if (!confirm(`Delete session mode "${item.name}"?`)) return;
        try {
            await axios.delete(`/api/whatsapp/session-modes/${item.id}`);
            loadItems();
        } catch (e) {
            console.error("Delete failed:", e);
            alert(e.response?.data?.error || "Delete failed");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Session Modes
                    </h3>
                    <p className="text-sm text-slate-600">Configure different modes for WhatsApp sessions</p>
                </div>
                <button className={btnPrimary} onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4" /> Add Mode
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold">
                                {editItem ? "Edit" : "Add"} Session Mode
                            </h4>
                            <button className={btnGhost} onClick={resetForm}>Close</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Name*</label>
                                <input
                                    className={input}
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Mode name"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    className={textarea}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Mode description"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Configuration (JSON)</label>
                                <textarea
                                    className={textarea}
                                    value={JSON.stringify(formData.config, null, 2)}
                                    onChange={(e) => {
                                        try {
                                            const config = JSON.parse(e.target.value);
                                            setFormData({ ...formData, config });
                                        } catch (err) {
                                            // Keep the text as is if invalid JSON
                                        }
                                    }}
                                    placeholder='{"key": "value"}'
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                />
                                <label htmlFor="is_active" className="text-sm">Active</label>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button className={btnPrimary} disabled={saving}>
                                    {saving ? "Saving..." : "Save"}
                                </button>
                                <button type="button" className={btnGhost} onClick={resetForm}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Items List */}
            {loading ? (
                <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : (
                <div className="grid gap-4">
                    {items.map((item) => (
                        <div key={item.id} className="border border-slate-200 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold">{item.name}</h4>
                                    <Badge color={item.is_active ? "green" : "slate"}>
                                        {item.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                                <div className="flex gap-2">
                                    <button className={btnGhost} onClick={() => handleEdit(item)}>
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button className={btnDanger} onClick={() => handleDelete(item)}>
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            {item.description && (
                                <p className="text-sm text-slate-600 mb-2">{item.description}</p>
                            )}
                            <div className="text-xs text-slate-500">
                                Sessions: {item.sessions_count || 0} •
                                Created: {new Date(item.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ————————————————————————————————————————
// Group Modes Component
// ————————————————————————————————————————
function GroupModes() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [formData, setFormData] = useState({ name: "", description: "", config: {}, is_active: true });
    const [saving, setSaving] = useState(false);

    const loadItems = async () => {
        try {
            const { data } = await axios.get("/api/whatsapp/group-modes");
            setItems(data.data || []);
        } catch (e) {
            console.error("Load group modes failed:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadItems();
    }, []);

    const resetForm = () => {
        setFormData({ name: "", description: "", config: {}, is_active: true });
        setEditItem(null);
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setSaving(true);
        try {
            if (editItem) {
                await axios.put(`/api/whatsapp/group-modes/${editItem.id}`, formData);
            } else {
                await axios.post("/api/whatsapp/group-modes", formData);
            }
            resetForm();
            loadItems();
        } catch (e) {
            console.error("Save failed:", e);
            alert(e.response?.data?.error || "Save failed");
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (item) => {
        setEditItem(item);
        setFormData({
            name: item.name || "",
            description: item.description || "",
            config: item.config || {},
            is_active: item.is_active
        });
        setShowForm(true);
    };

    const handleDelete = async (item) => {
        if (!confirm(`Delete group mode "${item.name}"?`)) return;
        try {
            await axios.delete(`/api/whatsapp/group-modes/${item.id}`);
            loadItems();
        } catch (e) {
            console.error("Delete failed:", e);
            alert(e.response?.data?.error || "Delete failed");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Group Modes
                    </h3>
                    <p className="text-sm text-slate-600">Configure different modes for WhatsApp groups</p>
                </div>
                <button className={btnPrimary} onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4" /> Add Mode
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold">
                                {editItem ? "Edit" : "Add"} Group Mode
                            </h4>
                            <button className={btnGhost} onClick={resetForm}>Close</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Name*</label>
                                <input
                                    className={input}
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Mode name"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    className={textarea}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Mode description"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Configuration (JSON)</label>
                                <textarea
                                    className={textarea}
                                    value={JSON.stringify(formData.config, null, 2)}
                                    onChange={(e) => {
                                        try {
                                            const config = JSON.parse(e.target.value);
                                            setFormData({ ...formData, config });
                                        } catch (err) {
                                            // Keep the text as is if invalid JSON
                                        }
                                    }}
                                    placeholder='{"key": "value"}'
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active_group"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                />
                                <label htmlFor="is_active_group" className="text-sm">Active</label>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button className={btnPrimary} disabled={saving}>
                                    {saving ? "Saving..." : "Save"}
                                </button>
                                <button type="button" className={btnGhost} onClick={resetForm}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Items List */}
            {loading ? (
                <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : (
                <div className="grid gap-4">
                    {items.map((item) => (
                        <div key={item.id} className="border border-slate-200 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold">{item.name}</h4>
                                    <Badge color={item.is_active ? "green" : "slate"}>
                                        {item.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                                <div className="flex gap-2">
                                    <button className={btnGhost} onClick={() => handleEdit(item)}>
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button className={btnDanger} onClick={() => handleDelete(item)}>
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            {item.description && (
                                <p className="text-sm text-slate-600 mb-2">{item.description}</p>
                            )}
                            <div className="text-xs text-slate-500">
                                Groups: {item.groups_count || 0} •
                                Created: {new Date(item.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ————————————————————————————————————————
// Detail Modes Component
// ————————————————————————————————————————
function DetailModes() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [formData, setFormData] = useState({ name: "", description: "", config: {}, is_active: true });
    const [saving, setSaving] = useState(false);

    const loadItems = async () => {
        try {
            const { data } = await axios.get("/api/whatsapp/detail-modes");
            setItems(data.data || []);
        } catch (e) {
            console.error("Load detail modes failed:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadItems();
    }, []);

    const resetForm = () => {
        setFormData({ name: "", description: "", config: {}, is_active: true });
        setEditItem(null);
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setSaving(true);
        try {
            if (editItem) {
                await axios.put(`/api/whatsapp/detail-modes/${editItem.id}`, formData);
            } else {
                await axios.post("/api/whatsapp/detail-modes", formData);
            }
            resetForm();
            loadItems();
        } catch (e) {
            console.error("Save failed:", e);
            alert(e.response?.data?.error || "Save failed");
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (item) => {
        setEditItem(item);
        setFormData({
            name: item.name || "",
            description: item.description || "",
            config: item.config || {},
            is_active: item.is_active
        });
        setShowForm(true);
    };

    const handleDelete = async (item) => {
        if (!confirm(`Delete detail mode "${item.name}"?`)) return;
        try {
            await axios.delete(`/api/whatsapp/detail-modes/${item.id}`);
            loadItems();
        } catch (e) {
            console.error("Delete failed:", e);
            alert(e.response?.data?.error || "Delete failed");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        Detail Modes
                    </h3>
                    <p className="text-sm text-slate-600">Configure detail processing modes</p>
                </div>
                <button className={btnPrimary} onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4" /> Add Mode
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold">
                                {editItem ? "Edit" : "Add"} Detail Mode
                            </h4>
                            <button className={btnGhost} onClick={resetForm}>Close</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Name*</label>
                                <input
                                    className={input}
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Mode name"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    className={textarea}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Mode description"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Configuration (JSON)</label>
                                <textarea
                                    className={textarea}
                                    value={JSON.stringify(formData.config, null, 2)}
                                    onChange={(e) => {
                                        try {
                                            const config = JSON.parse(e.target.value);
                                            setFormData({ ...formData, config });
                                        } catch (err) {
                                            // Keep the text as is if invalid JSON
                                        }
                                    }}
                                    placeholder='{"key": "value"}'
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active_detail"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                />
                                <label htmlFor="is_active_detail" className="text-sm">Active</label>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button className={btnPrimary} disabled={saving}>
                                    {saving ? "Saving..." : "Save"}
                                </button>
                                <button type="button" className={btnGhost} onClick={resetForm}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Items List */}
            {loading ? (
                <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : (
                <div className="grid gap-4">
                    {items.map((item) => (
                        <div key={item.id} className="border border-slate-200 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold">{item.name}</h4>
                                    <Badge color={item.is_active ? "green" : "slate"}>
                                        {item.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                                <div className="flex gap-2">
                                    <button className={btnGhost} onClick={() => handleEdit(item)}>
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button className={btnDanger} onClick={() => handleDelete(item)}>
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            {item.description && (
                                <p className="text-sm text-slate-600 mb-2">{item.description}</p>
                            )}
                            <div className="text-xs text-slate-500">
                                Created: {new Date(item.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ————————————————————————————————————————
// Authorized Users Component
// ————————————————————————————————————————
function AuthorizedUsers() {
    const [items, setItems] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [formData, setFormData] = useState({
        session_id: "",
        phone_number: "",
        name: "",
        role: "user",
        is_active: true
    });
    const [saving, setSaving] = useState(false);

    const loadItems = async () => {
        try {
            const [usersRes, sessionsRes] = await Promise.all([
                axios.get("/api/whatsapp/authorized-users"),
                axios.get("/api/whatsapp/sessions")
            ]);
            setItems(usersRes.data.data || []);
            setSessions(sessionsRes.data.data || []);
        } catch (e) {
            console.error("Load authorized users failed:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadItems();
    }, []);

    const resetForm = () => {
        setFormData({
            session_id: "",
            phone_number: "",
            name: "",
            role: "user",
            is_active: true
        });
        setEditItem(null);
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.phone_number.trim() || !formData.session_id) return;

        setSaving(true);
        try {
            if (editItem) {
                await axios.put(`/api/whatsapp/authorized-users/${editItem.id}`, formData);
            } else {
                await axios.post("/api/whatsapp/authorized-users", formData);
            }
            resetForm();
            loadItems();
        } catch (e) {
            console.error("Save failed:", e);
            alert(e.response?.data?.error || "Save failed");
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (item) => {
        setEditItem(item);
        setFormData({
            session_id: item.session_id || "",
            phone_number: item.phone_number || "",
            name: item.name || "",
            role: item.role || "user",
            is_active: item.is_active
        });
        setShowForm(true);
    };

    const handleDelete = async (item) => {
        if (!confirm(`Remove authorized user "${item.name || item.phone_number}"?`)) return;
        try {
            await axios.delete(`/api/whatsapp/authorized-users/${item.id}`);
            loadItems();
        } catch (e) {
            console.error("Delete failed:", e);
            alert(e.response?.data?.error || "Delete failed");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Authorized Users
                    </h3>
                    <p className="text-sm text-slate-600">Manage users authorized to use WhatsApp sessions</p>
                </div>
                <button className={btnPrimary} onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4" /> Add User
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold">
                                {editItem ? "Edit" : "Add"} Authorized User
                            </h4>
                            <button className={btnGhost} onClick={resetForm}>Close</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Session*</label>
                                <select
                                    className={select}
                                    value={formData.session_id}
                                    onChange={(e) => setFormData({ ...formData, session_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select session...</option>
                                    {sessions.map(session => (
                                        <option key={session.id} value={session.id}>
                                            {session.name} ({session.wa_number || "Not connected"})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Phone Number*</label>
                                <input
                                    className={input}
                                    value={formData.phone_number}
                                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                    placeholder="628123456789"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Name</label>
                                <input
                                    className={input}
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="User name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Role</label>
                                <select
                                    className={select}
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                    <option value="moderator">Moderator</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active_user"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                />
                                <label htmlFor="is_active_user" className="text-sm">Active</label>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button className={btnPrimary} disabled={saving}>
                                    {saving ? "Saving..." : "Save"}
                                </button>
                                <button type="button" className={btnGhost} onClick={resetForm}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Items List */}
            {loading ? (
                <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : (
                <div className="grid gap-4">
                    {items.map((item) => (
                        <div key={item.id} className="border border-slate-200 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div>
                                        <h4 className="font-semibold">{item.name || item.phone_number}</h4>
                                        <p className="text-sm text-slate-600">📱 {item.phone_number}</p>
                                    </div>
                                    <Badge color={item.is_active ? "green" : "slate"}>
                                        {item.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                    <Badge color="blue">
                                        {item.role}
                                    </Badge>
                                </div>
                                <div className="flex gap-2">
                                    <button className={btnGhost} onClick={() => handleEdit(item)}>
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button className={btnDanger} onClick={() => handleDelete(item)}>
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="text-xs text-slate-500">
                                Session: {item.session?.name || "Unknown"} •
                                Created: {new Date(item.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ————————————————————————————————————————
// Main WaSetting Component
// ————————————————————————————————————————
export default function WaSetting() {
    const [activeTab, setActiveTab] = useState("session-modes");
    const [refreshing, setRefreshing] = useState(false);

    const tabs = [
        { id: "session-modes", label: "Session Modes", icon: Settings, component: SessionModes },
        { id: "group-modes", label: "Group Modes", icon: Users, component: GroupModes },
        { id: "detail-modes", label: "Detail Modes", icon: Info, component: DetailModes },
        { id: "authorized-users", label: "Authorized Users", icon: Shield, component: AuthorizedUsers },
    ];

    const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || SessionModes;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <WaLogo className="h-8 w-8" />
                        WhatsApp Settings
                    </h1>
                    <p className="text-slate-600 mt-1">
                        Configure modes and permissions for WhatsApp management
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <div className="flex space-x-8 overflow-x-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? "border-sky-500 text-sky-600"
                                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <ActiveComponent />
            </div>
        </div>
    );
}