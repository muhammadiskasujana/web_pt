import { useEffect, useState } from "react";
import axios from "../../config/axios";
import { HeaderBack, Th } from "../produk/_ui";

export default function MoveList() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const load = async ()=> {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/raw-materials/moves");
            setRows(data?.moves ?? []);
        } finally { setLoading(false); }
    };

    useEffect(()=>{ load(); }, []);

    return (
        <div className="space-y-4">
            <HeaderBack title="Pergerakan Bahan Baku" />
            <div className="overflow-x-auto border border-slate-900/15 rounded-xl">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-slate-50">
                        <Th>Tanggal</Th><Th>RM</Th><Th>Reason</Th><Th>From</Th><Th>To</Th><Th className="text-right pr-4">Qty</Th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr><td colSpan={6} className="p-6 text-center">Memuat...</td></tr>
                    ) : rows.length===0 ? (
                        <tr><td colSpan={6} className="p-6 text-center">Tidak ada data</td></tr>
                    ) : rows.map((m)=>(
                        <tr key={m.id} className="border-t border-slate-900/10">
                            <td className="p-3">{m.moved_at ? new Date(m.moved_at).toLocaleString("id-ID") : "-"}</td>
                            <td className="p-3">{m.rm_id}</td>
                            <td className="p-3">{m.reason}</td>
                            <td className="p-3">{m.from_branch_id || "-"}</td>
                            <td className="p-3">{m.to_branch_id || "-"}</td>
                            <td className="p-3 text-right pr-4">{Number(m.qty ?? 0)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
