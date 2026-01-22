import { useEffect, useState } from "react";
import axios from "../../config/axios";
import { HeaderBack, inputBase, btnPrimary, btnGhost, Th } from "../produk/_ui";
import { Save } from "lucide-react";

export default function Transfers() {
    const [branches, setBranches] = useState([]);
    const [rows, setRows] = useState([]);
    const [form, setForm] = useState({ from_branch_id:"", to_branch_id:"", amount:"", note:"", ref_no:"", txn_at: new Date().toISOString().slice(0,16) });
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [b, t] = await Promise.all([
                axios.get("/api/branches"),
                axios.get("/api/branches/capital/transfers")
            ]);
            setBranches(b.data?.branches ?? []);
            setRows(t.data?.transfers ?? []);
        } finally { setLoading(false); }
    };
    useEffect(()=>{ load(); }, []);

    const submit = async (e) => {
        e.preventDefault();
        const payload = { ...form, amount: Number(form.amount||0), txn_at: new Date(form.txn_at) };
        await axios.post("/api/branches/capital/transfer", payload);
        setForm({ from_branch_id:"", to_branch_id:"", amount:"", note:"", ref_no:"", txn_at: new Date().toISOString().slice(0,16) });
        await load();
    };

    return (
        <div className="space-y-4">
            <HeaderBack title="Transfer Modal Antar Cabang" />

            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <select className={inputBase} value={form.from_branch_id} onChange={(e)=>setForm(f=>({...f,from_branch_id:e.target.value}))}>
                    <option value="">Dari Cabang</option>
                    {branches.map((b)=>(<option key={b.id} value={b.id}>{b.code ? `${b.code} — `:""}{b.name}</option>))}
                </select>
                <select className={inputBase} value={form.to_branch_id} onChange={(e)=>setForm(f=>({...f,to_branch_id:e.target.value}))}>
                    <option value="">Ke Cabang</option>
                    {branches.map((b)=>(<option key={b.id} value={b.id}>{b.code ? `${b.code} — `:""}{b.name}</option>))}
                </select>
                <input className={inputBase} type="number" min="0" placeholder="Nominal" value={form.amount} onChange={(e)=>setForm(f=>({...f,amount:e.target.value}))}/>
                <input className={inputBase} placeholder="No. Referensi" value={form.ref_no} onChange={(e)=>setForm(f=>({...f,ref_no:e.target.value}))}/>
                <input className={inputBase} type="datetime-local" value={form.txn_at} onChange={(e)=>setForm(f=>({...f,txn_at:e.target.value}))}/>
                <div className="flex items-end gap-2">
                    <button className={btnPrimary}><Save className="h-4 w-4"/> Simpan</button>
                    <button type="button" className={btnGhost} onClick={()=>setForm({ from_branch_id:"", to_branch_id:"", amount:"", note:"", ref_no:"", txn_at: new Date().toISOString().slice(0,16) })}>Reset</button>
                </div>
            </form>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-slate-50">
                        <Th>Tanggal</Th><Th>Ref</Th><Th>Dari</Th><Th>Ke</Th><Th className="text-right pr-4">Nominal</Th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr><td colSpan={5} className="p-6 text-center">Memuat...</td></tr>
                    ) : rows.length===0 ? (
                        <tr><td colSpan={5} className="p-6 text-center">Belum ada data</td></tr>
                    ) : rows.map((r)=>(
                        <tr key={r.id} className="border-t border-slate-200">
                            <td className="p-3">{r.txn_at ? new Date(r.txn_at).toLocaleString("id-ID") : "-"}</td>
                            <td className="p-3">{r.ref_no || "-"}</td>
                            <td className="p-3">{r.fromBranch ? (r.fromBranch.code ? `${r.fromBranch.code} — `:"") + r.fromBranch.name : r.from_branch_id}</td>
                            <td className="p-3">{r.toBranch ? (r.toBranch.code ? `${r.toBranch.code} — `:"") + r.toBranch.name : r.to_branch_id}</td>
                            <td className="p-3 text-right pr-4">{Number(r.amount||0).toLocaleString("id-ID")}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
