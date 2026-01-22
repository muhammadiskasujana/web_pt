import { useEffect, useState } from "react";
import axios from "../../config/axios";
import { HeaderBack, btnPrimary, btnGhost, inputBase, Th } from "../produk/_ui";
import { Plus, Save, Trash2, Edit } from "lucide-react";

export default function CategoryList() {
    const [items, setItems] = useState([]);
    const [form, setForm] = useState({ name: "" });
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/raw-materials/categories");
            setItems(data?.categories ?? []);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);

    const submit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        if (editing) {
            await axios.put(`/api/raw-materials/categories/${editing}`, form);
        } else {
            await axios.post("/api/raw-materials/categories", form);
        }
        setForm({ name: "" });
        setEditing(null);
        await load();
    };

    const edit = (it) => { setForm({ name: it.name || "" }); setEditing(it.id); };
    const del = async (id) => {
        if (!confirm("Hapus kategori ini?")) return;
        await axios.delete(`/api/raw-materials/categories/${id}`);
        await load();
    };

    return (
        <div className="space-y-4">
            <HeaderBack title="Kategori Bahan Baku" />
            <form onSubmit={submit} className="flex gap-2 items-end">
                <label className="flex-1">
                    <span className="block text-sm font-medium mb-1">Nama</span>
                    <input
                        className={inputBase}
                        value={form.name}
                        onChange={(e)=>setForm({name:e.target.value})}
                        placeholder="Contoh: Kain, Tinta, Benang..."
                    />
                </label>
                <button className={btnPrimary}><Save className="h-4 w-4"/> {editing ? "Update" : "Tambah"}</button>
                {editing && (
                    <button type="button" className={btnGhost} onClick={()=>{setEditing(null); setForm({name:""});}}>
                        Batal
                    </button>
                )}
            </form>

            <div className="overflow-x-auto border border-slate-900/15 rounded-xl">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-slate-50">
                        <Th>Nama</Th>
                        <Th className="text-right pr-4">Aksi</Th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr><td colSpan={2} className="p-6 text-center">Memuat...</td></tr>
                    ) : items.length === 0 ? (
                        <tr><td colSpan={2} className="p-6 text-center">Belum ada data</td></tr>
                    ) : items.map((it)=>(
                        <tr key={it.id} className="border-t border-slate-900/10">
                            <td className="p-3">{it.name}</td>
                            <td className="p-3 text-right pr-4 flex justify-end gap-2">
                                <button className={btnGhost} onClick={()=>edit(it)}><Edit className="h-4 w-4"/> Edit</button>
                                <button className={btnGhost} onClick={()=>del(it.id)}><Trash2 className="h-4 w-4"/> Hapus</button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
