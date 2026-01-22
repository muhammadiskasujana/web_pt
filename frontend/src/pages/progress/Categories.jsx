import { useEffect, useState } from "react";
import axios from "../../config/axios";
import { Plus, Save, Edit3, Trash2, X } from "lucide-react";
import { btnPrimary, btnGhost, inputBase, Th } from "../produk/_ui";
import { Section } from "./ProgressRoutes.jsx";

export default function ProgressCategoriesPage() {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/progress/categories");
            setList(data?.data || []);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        load();
    }, []);

    const startNew = () =>
        setEditing({
            id: null,
            name: "",
            description: "",
            stages: [
                { name: "Draft", order_index: 0 },
                { name: "Process", order_index: 1 },
                { name: "Finish", order_index: 2 },
            ],
        });
    const startEdit = (c) =>
        setEditing({
            id: c.id,
            name: c.name,
            description: c.description || "",
            stages: (c.stages || []).map((s) => ({
                id: s.id,
                name: s.name,
                order_index: s.order_index,
                sla_hours: s.sla_hours || "",
                color: s.color || "",
            })),
        });
    const cancelEdit = () => setEditing(null);

    const addStage = () =>
        setEditing((e) => ({
            ...e,
            stages: [...(e.stages || []), { name: "", order_index: e.stages?.length || 0 }],
        }));
    const removeStage = (idx) =>
        setEditing((e) => ({
            ...e,
            stages: e.stages
                .filter((_, i) => i !== idx)
                .map((s, i) => ({ ...s, order_index: i })),
        }));
    const setStage = (idx, patch) =>
        setEditing((e) => ({
            ...e,
            stages: e.stages.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
        }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        const payload = {
            name: editing.name,
            description: editing.description || null,
            stages: (editing.stages || []).map((s, i) => ({
                name: s.name,
                order_index: i,
                sla_hours: s.sla_hours ? Number(s.sla_hours) : null,
                color: s.color || null,
            })),
        };
        try {
            if (editing.id) {
                await axios.put(`/api/progress/categories/${editing.id}`, payload);
            } else {
                await axios.post("/api/progress/categories", payload);
            }
            await load();
            setEditing(null);
        } finally {
            setSaving(false);
        }
    };

    const onDelete = async (id) => {
        if (!window.confirm("Hapus kategori ini beserta semua stages?")) return;
        await axios.delete(`/api/progress/categories/${id}`);
        await load();
    };

    return (
        <div className="space-y-6">
            <Section
                title="Kategori Progres"
                actions={
                    <button onClick={startNew} className={btnPrimary}>
                        <Plus className="h-4 w-4" /> Baru
                    </button>
                }
            >
                <div className="overflow-x-auto border border-slate-900/15 rounded-xl">
                    <table className="w-full text-sm">
                        <thead>
                        <tr className="bg-slate-50">
                            <Th>Nama</Th>
                            <Th>Deskripsi</Th>
                            <Th>Stages</Th>
                            <Th className="text-right pr-4">Aksi</Th>
                        </tr>
                        </thead>
                        <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="p-6 text-center">
                                    Memuat...
                                </td>
                            </tr>
                        ) : list.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-6 text-center">
                                    Belum ada kategori
                                </td>
                            </tr>
                        ) : (
                            list.map((c) => (
                                <tr key={c.id} className="border-t border-slate-900/10">
                                    <td className="p-3 font-medium">{c.name}</td>
                                    <td className="p-3">{c.description || "-"}</td>
                                    <td className="p-3">
                                        {(c.stages || []).map((s) => s.name).join(" → ") || "-"}
                                    </td>
                                    <td className="p-3 text-right pr-4">
                                        <div className="flex gap-2 justify-end">
                                            <button className={btnGhost} onClick={() => startEdit(c)}>
                                                <Edit3 className="h-4 w-4" /> Edit
                                            </button>
                                            <button className={btnGhost} onClick={() => onDelete(c.id)}>
                                                <Trash2 className="h-4 w-4" /> Hapus
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </Section>

            {editing && (
                <div className="border border-slate-900/15 rounded-2xl p-4 space-y-4">
                    <div className="text-base font-semibold">
                        {editing.id ? "Edit Kategori" : "Kategori Baru"}
                    </div>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label className="block">
                                <span className="text-xs text-slate-500">Nama*</span>
                                <input
                                    className={inputBase}
                                    required
                                    value={editing.name}
                                    onChange={(e) =>
                                        setEditing((prev) => ({ ...prev, name: e.target.value }))
                                    }
                                />
                            </label>
                            <label className="block">
                                <span className="text-xs text-slate-500">Deskripsi</span>
                                <input
                                    className={inputBase}
                                    value={editing.description}
                                    onChange={(e) =>
                                        setEditing((prev) => ({ ...prev, description: e.target.value }))
                                    }
                                />
                            </label>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="font-medium">Tahapan</div>
                                <button type="button" onClick={addStage} className={btnGhost}>
                                    <Plus className="h-4 w-4" /> Tambah Tahap
                                </button>
                            </div>

                            {(editing.stages || []).length === 0 ? (
                                <div className="text-sm text-slate-600 border border-slate-900/15 rounded-xl p-3 text-center">
                                    Belum ada tahap
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {editing.stages.map((s, idx) => (
                                        <div
                                            key={idx}
                                            className="grid grid-cols-1 md:grid-cols-6 gap-3 border border-slate-900/10 rounded-xl p-3"
                                        >
                                            <input
                                                className="md:col-span-2"
                                                value={s.name}
                                                onChange={(e) => setStage(idx, { name: e.target.value })}
                                                placeholder={`Nama tahap #${idx + 1}`}
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                className={inputBase}
                                                value={s.sla_hours || ""}
                                                onChange={(e) => setStage(idx, { sla_hours: e.target.value })}
                                                placeholder="SLA (jam)"
                                            />
                                            <input
                                                className={inputBase}
                                                value={s.color || ""}
                                                onChange={(e) => setStage(idx, { color: e.target.value })}
                                                placeholder="Warna (opsional)"
                                            />
                                            <div className="md:col-span-2 flex justify-end">
                                                <button
                                                    type="button"
                                                    className={btnGhost}
                                                    onClick={() => removeStage(idx)}
                                                >
                                                    <X className="h-4 w-4" /> Hapus
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <button className={btnPrimary} disabled={saving}>
                                <Save className="h-4 w-4" /> Simpan
                            </button>
                            <button type="button" onClick={cancelEdit} className={btnGhost}>
                                Batal
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
