import { useEffect, useState } from "react";
import axios from "../../config/axios";
import { HeaderBack, inputBase, btnGhost, Th } from "../produk/_ui";
import { Search } from "lucide-react";

export default function StockList() {
    const [rows, setRows] = useState([]);
    const [branch, setBranch] = useState("");
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/raw-materials/stock", {
                params: { branch_id: branch || undefined },
            });
            setRows(data?.stock ?? []);
        } finally { setLoading(false); }
    };
    useEffect(()=>{ load(); }, []);
    const onSubmit = async (e)=>{ e.preventDefault(); await load(); };

    return (
        <div className="space-y-4">
            <HeaderBack title="Stok Bahan Baku per Cabang" />
            <form onSubmit={onSubmit} className="flex gap-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"/>
                    <input className={`${inputBase} pl-9`} placeholder="Filter Branch ID (opsional)"
                           value={branch} onChange={(e)=>setBranch(e.target.value)} />
                </div>
                <button className={btnGhost} type="submit">Terapkan</button>
            </form>

            <div className="overflow-x-auto border border-slate-900/15 rounded-xl">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-slate-50">
                        <Th>Cabang</Th><Th>Kode</Th><Th>Nama</Th><Th>Satuan</Th><Th className="text-right pr-4">Qty</Th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr><td colSpan={5} className="p-6 text-center">Memuat...</td></tr>
                    ) : rows.length===0 ? (
                        <tr><td colSpan={5} className="p-6 text-center">Tidak ada data</td></tr>
                    ) : rows.map((r)=>(
                        <tr key={`${r.branch_id}-${r.rm_id}`} className="border-t border-slate-900/10">
                            <td className="p-3">{r.branch_id || "-"}</td>
                            <td className="p-3">{r.item?.code || "-"}</td>
                            <td className="p-3">{r.item?.name || "-"}</td>
                            <td className="p-3">{r.item?.unit || "-"}</td>
                            <td className="p-3 text-right pr-4">{Number(r.qty ?? 0)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
