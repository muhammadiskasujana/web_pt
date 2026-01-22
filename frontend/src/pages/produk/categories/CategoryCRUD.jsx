// ──────────────────────────────────────────────────────────────────────────────
// File: src/pages/produk/categories/CategoryCRUD.jsx
// ──────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import axios from "../../../config/axios";
import { btnPrimary, btnGhost, Th, HeaderBack, inputBase } from "../_ui";
import { Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CategoryCRUD({ title, icon, endpoint, fields }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState(Object.fromEntries(fields.map(f=>[f.key, ""])));
    const nav = useNavigate();

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(endpoint, { params: { page:1, limit:500 } });
            setItems(data.data || data.items || []);
        } finally { setLoading(false); }
    };

    useEffect(()=>{ load(); }, [endpoint]);

    const submit = async (e) => {
        e.preventDefault();
        await axios.post(endpoint, form);
        setForm(Object.fromEntries(fields.map(f=>[f.key, ""])));
        await load();
    };

    const remove = async (id) => {
        if (!window.confirm("Hapus item ini?")) return;
        await axios.delete(`${endpoint}/${id}`);
        await load();
    };

    return (
        <div className="space-y-4">
            <HeaderBack title={title} onBack={() => nav(-1)} />

            <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {fields.map((f)=> (
                    <label className="block" key={f.key}>
                        <span className="mb-2 block text-sm font-medium">{f.label}</span>
                        <input className={inputBase} value={form[f.key]} onChange={(e)=>setForm((s)=>({...s,[f.key]:e.target.value}))} />
                    </label>
                ))}
                <div className="flex items-end">
                    <button className={btnPrimary}><Plus className="h-4 w-4"/> Tambah</button>
                </div>
            </form>

            <div className="overflow-x-auto border border-slate-900/15 rounded-xl">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-slate-50">
                        {fields.map((f)=> <Th key={f.key}>{f.label}</Th>)}
                        <Th className="text-right pr-4">Aksi</Th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr><td colSpan={fields.length+1} className="p-6 text-center">Memuat...</td></tr>
                    ) : items.length === 0 ? (
                        <tr><td colSpan={fields.length+1} className="p-6 text-center">Tidak ada data</td></tr>
                    ) : (
                        items.map((it)=> (
                            <tr key={it.id} className="border-t border-slate-900/10">
                                {fields.map((f)=> <td className="p-3" key={f.key}>{it[f.key]}</td>)}
                                <td className="p-3 text-right pr-4">
                                    <button className={btnGhost} onClick={()=>remove(it.id)}><Trash2 className="h-4 w-4"/> Hapus</button>
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}