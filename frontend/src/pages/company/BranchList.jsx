import { useEffect, useState } from "react";
import axios from "../../config/axios";
import { HeaderBack, inputBase, btnPrimary, btnGhost, Th } from "../produk/_ui";
import { Save, Edit, Trash2, Plus } from "lucide-react";

export default function BranchList() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ code:"", name:"", address:"", phone:"" });
    const [editing, setEditing] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/branches");
            setRows(data?.branches ?? []);
        } finally { setLoading(false); }
    };
    useEffect(()=>{ load(); }, []);

    const submit = async (e) => {
        e.preventDefault();
        if (editing) await axios.put(`/api/branches/${editing}`, form);
        else await axios.post("/api/branches", form);
        setForm({ code:"", name:"", address:"", phone:"" });
        setEditing(null);
        await load();
    };

    const edit = (b) => {
        setEditing(b.id);
        setForm({ code:b.code||"", name:b.name||"", address:b.address||"", phone:b.phone||"" });
    };
    const del = async (id) => {
        if(!confirm("Hapus cabang ini?")) return;
        await axios.delete(`/api/branches/${id}`);
        await load();
    };

    return (
        <div className="space-y-4">
            <HeaderBack title="Cabang" />

            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <input className={inputBase} placeholder="Kode" value={form.code} onChange={(e)=>setForm(f=>({...f,code:e.target.value}))}/>
                <input className={inputBase} placeholder="Nama" value={form.name} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))}/>
                <input className={inputBase} placeholder="Alamat" value={form.address} onChange={(e)=>setForm(f=>({...f,address:e.target.value}))}/>
                <input className={inputBase} placeholder="Telepon" value={form.phone} onChange={(e)=>setForm(f=>({...f,phone:e.target.value}))}/>
                <div className="flex items-end gap-2">
                    <button className={btnPrimary}><Save className="h-4 w-4"/> {editing ? "Update" : "Tambah"}</button>
                    {editing && <button type="button" className={btnGhost} onClick={()=>{setEditing(null); setForm({code:"",name:"",address:"",phone:""});}}>Batal</button>}
                </div>
            </form>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-slate-50">
                        <Th>Kode</Th><Th>Nama</Th><Th>Alamat</Th><Th>Telepon</Th>
                        <Th className="text-right pr-4">Aksi</Th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr><td colSpan={5} className="p-6 text-center">Memuat...</td></tr>
                    ) : rows.length===0 ? (
                        <tr><td colSpan={5} className="p-6 text-center">Belum ada data</td></tr>
                    ) : rows.map((b)=>(
                        <tr key={b.id} className="border-t border-slate-200">
                            <td className="p-3">{b.code || "-"}</td>
                            <td className="p-3">{b.name}</td>
                            <td className="p-3">{b.address || "-"}</td>
                            <td className="p-3">{b.phone || "-"}</td>
                            <td className="p-3 text-right pr-4 flex justify-end gap-2">
                                <button className={btnGhost} onClick={()=>edit(b)}><Edit className="h-4 w-4"/> Edit</button>
                                <button className={btnGhost} onClick={()=>del(b.id)}><Trash2 className="h-4 w-4"/> Hapus</button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-2">
                <Plus className="h-3 w-3"/> Gunakan menu “Transfer Modal” untuk catat perpindahan dana antar cabang.
            </div>
        </div>
    );
}
