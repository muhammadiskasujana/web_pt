import { useEffect, useState } from "react";
import axios from "../../config/axios";
import { HeaderBack, Th } from "../produk/_ui";
import { useNavigate, useParams } from "react-router-dom";

export default function AssetDetail() {
    const nav = useNavigate();
    const { id } = useParams();
    const [asset, setAsset] = useState(null);
    const [sched, setSched] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(()=> {
        (async ()=>{
            try {
                const [{data:a},{data:s}] = await Promise.all([
                    axios.get(`/api/assets/${id}`),
                    axios.get(`/api/assets/${id}/depreciation/schedule`)
                ]);
                setAsset(a?.asset ?? null);
                setSched(s?.schedule ?? []);
            } finally { setLoading(false); }
        })();
    }, [id]);

    if (loading) return <div>Memuat...</div>;
    if (!asset) return <div>Tidak ditemukan</div>;

    return (
        <div className="space-y-4">
            <HeaderBack title={`Detail Aset: ${asset.name}`} onBack={()=>nav("/assets")} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Info label="Cabang" value={asset.branch_id || "-"} />
                <Info label="Metode" value={asset.method} />
                <Info label="Biaya Perolehan" value={Number(asset.acquisition_cost||0).toLocaleString("id-ID")} />
                <Info label="Nilai Sisa" value={Number(asset.salvage_value||0).toLocaleString("id-ID")} />
                <Info label="Umur (bulan)" value={asset.useful_life_months} />
                <Info label="Tanggal Perolehan" value={asset.acquisition_date ? new Date(asset.acquisition_date).toLocaleDateString("id-ID") : "-"} />
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-slate-50">
                        <Th>Periode</Th><Th>Tanggal</Th><Th className="text-right pr-4">Depresiasi</Th>
                    </tr>
                    </thead>
                    <tbody>
                    {sched.length===0 ? (
                        <tr><td colSpan={3} className="p-6 text-center">Tidak ada jadwal</td></tr>
                    ) : sched.map((r)=>(
                        <tr key={r.period} className="border-t border-slate-200">
                            <td className="p-3">{r.period}</td>
                            <td className="p-3">{new Date(r.period_date).toLocaleDateString("id-ID")}</td>
                            <td className="p-3 text-right pr-4">{Number(r.depreciation||0).toLocaleString("id-ID")}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Info({ label, value }) {
    return (
        <div className="border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-slate-600">{label}</div>
            <div className="font-medium">{String(value)}</div>
        </div>
    );
}
