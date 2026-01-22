import { useEffect, useState } from "react";
import axios from "../../config/axios";
import { HeaderBack, btnPrimary, btnGhost, inputBase, Th } from "../produk/_ui";
import { Plus, Save, Edit, Trash2, Search } from "lucide-react";

export default function ItemList() {
    const [items, setItems] = useState([]);
    const [cats, setCats] = useState([]);
    const [q, setQ] = useState("");
    const [form, setForm] = useState({ code:"", name:"", unit:"", category_id:"" });
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [{data:c}, {data:i}] = await Promise.all([
                axios.get("/api/raw-materials/categories"),
                axios.get("/api/raw-materials/items", { params: { q } })
            ]);
            setCats(c?.categories ?? []);
            setItems(i?.items ?? []);
        } finally {
            setLoading(false);
        }
    };
    useEffect(()=>{ load(); }, []);
    const search = async (e)=>{ e?.preventDefault(); await load(); };

    const submit = async (e) => {
        e.preventDefault();
        const payload = { ...form };
        if (editing) {
            await axios.put(`/api/raw-materials/items/${editing}`, payload);
        } else {
            await axios.post("/api/raw-materials/items", payload);
        }
        setForm({ code:"", name:"", unit:"", category_id:"" });
        setEditing(null);
        await load();
    };

    const edit = (it) => {
        setForm({
            code: it.code || "",
            name: it.name || "",
            unit: it.unit || "",
            category_id: it.category_id || "",
        });
        setEditing(it.id);
    };

    const del = async (id) => {
        if (!confirm("Hapus item ini?")) return;
        await axios.delete(`/api/raw-materials/items/${id}`);
        await load();
    };

    return (
        <div className="space-y-4">
            <HeaderBack title="Item Bahan Baku" />
            {/* Search */}
            <form onSubmit={search} className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"/>
                    <input className={`${inputBase} pl-9`} placeholder="Cari nama/kode" value={q} onChange={(e)=>setQ(e.target.value)} />
                </div>
                <button className={btnGhost} type="submit">Cari</button>
            </form>

            {/* Form */}
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <input className={inputBase} placeholder="Kode" value={form.code} onChange={(e)=>setForm(f=>({...f,code:e.target.value}))}/>
                <input className={inputBase} placeholder="Nama" value={form.name} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))}/>
                <input className={inputBase} placeholder="Satuan (mis. m, kg, roll)" value={form.unit} onChange={(e)=>setForm(f=>({...f,unit:e.target.value}))}/>
                <select className={inputBase} value={form.category_id} onChange={(e)=>setForm(f=>({...f,category_id:e.target.value}))}>
                    <option value="">Pilih Kategori</option>
                    {cats.map((c)=>(<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
                <div className="flex items-end gap-2">
                    <button className={btnPrimary}><Save className="h-4 w-4"/> {editing ? "Update" : "Tambah"}</button>
                    {editing && <button type="button" className={btnGhost} onClick={()=>{setEditing(null); setForm({code:"",name:"",unit:"",category_id:""});}}>Batal</button>}
                </div>
            </form>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-900/15 rounded-xl">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-slate-50">
                        <Th>Kode</Th><Th>Nama</Th><Th>Satuan</Th><Th>Kategori</Th>
                        <Th className="text-right pr-4">Aksi</Th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr><td colSpan={5} className="p-6 text-center">Memuat...</td></tr>
                    ) : items.length===0 ? (
                        <tr><td colSpan={5} className="p-6 text-center">Tidak ada data</td></tr>
                    ) : items.map((it)=>(
                        <tr key={it.id} className="border-t border-slate-900/10">
                            <td className="p-3">{it.code || "-"}</td>
                            <td className="p-3">{it.name}</td>
                            <td className="p-3">{it.unit || "-"}</td>
                            <td className="p-3">{it.category_name || it.category?.name || "-"}</td>
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
