import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../../config/axios";
import { ChevronLeft, RefreshCcw, Play, CheckCircle2, X, RotateCcw, UserRound } from "lucide-react";
import { btnGhost, inputBase, Th } from "../produk/_ui";

export default function ProgressInstanceDetail() {
    const { id } = useParams();
    const nav = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pic, setPic] = useState("");

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/progress/instances/${id}`);
            setData(data?.data || null);
            setPic(data?.data?.pic_user_id || "");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        load();
        // eslint-disable-next-line
    }, [id]);

    const act = async (stage_id, action) => {
        setSaving(true);
        try {
            await axios.post(`/api/progress/instances/${id}/stages/${stage_id}`, { action });
            await load();
        } finally {
            setSaving(false);
        }
    };

    const reassign = async () => {
        if (!pic) return;
        setSaving(true);
        try {
            await axios.post(`/api/progress/instances/${id}/reassign`, { pic_user_id: pic });
            await load();
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Memuat...</div>;
    if (!data) return <div>Data tidak ditemukan</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Instance Progres</h2>
                <div className="flex gap-2">
                    <button className={btnGhost} onClick={() => nav(-1)}>
                        <ChevronLeft className="h-4 w-4" /> Kembali
                    </button>
                    <button className={btnGhost} onClick={load}>
                        <RefreshCcw className="h-4 w-4" /> Muat Ulang
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="border border-slate-900/15 rounded-xl p-3">
                    <div className="text-xs text-slate-500">Produk</div>
                    <div className="font-semibold">{data.product_name}</div>
                    <div className="text-xs text-slate-600 mt-1">
                        Kategori: {data.ProgressCategory?.name || "-"}
                    </div>
                </div>
                <div className="border border-slate-900/15 rounded-xl p-3">
                    <div className="text-xs text-slate-500">Progress</div>
                    <div className="flex items-center gap-3">
                        <div className="w-40 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-sky-500 h-2" style={{ width: `${data.percent || 0}%` }} />
                        </div>
                        <div className="text-sm font-medium">{data.percent || 0}%</div>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">Status: {data.status}</div>
                </div>
                <div className="border border-slate-900/15 rounded-xl p-3">
                    <div className="text-xs text-slate-500">PIC</div>
                    <div className="flex items-center gap-2">
                        <input
                            className={inputBase}
                            placeholder="User ID"
                            value={pic}
                            onChange={(e) => setPic(e.target.value)}
                        />
                        <button className={btnGhost} disabled={saving || !pic} onClick={reassign}>
                            <UserRound className="h-4 w-4" /> Tetapkan
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto border border-slate-900/15 rounded-xl">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-slate-50">
                        <Th>#</Th>
                        <Th>Nama</Th>
                        <Th>Status</Th>
                        <Th>Mulai</Th>
                        <Th>Selesai</Th>
                        <Th className="text-right pr-4">Aksi</Th>
                    </tr>
                    </thead>
                    <tbody>
                    {(data.stages || [])
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((s, i) => (
                            <tr key={s.id} className="border-t border-slate-900/10">
                                <td className="p-3 text-slate-500">{String(i + 1).padStart(2, "0")}</td>
                                <td className="p-3 font-medium">{s.name}</td>
                                <td className="p-3">{s.status}</td>
                                <td className="p-3 text-xs">
                                    {s.started_at ? new Date(s.started_at).toLocaleString("id-ID") : "-"}
                                </td>
                                <td className="p-3 text-xs">
                                    {s.finished_at ? new Date(s.finished_at).toLocaleString("id-ID") : "-"}
                                </td>
                                <td className="p-3 text-right pr-4">
                                    <div className="flex gap-2 justify-end">
                                        <button className={btnGhost} disabled={saving} onClick={() => act(s.stage_id || s.id, "start")}>
                                            <Play className="h-4 w-4" /> Mulai
                                        </button>
                                        <button className={btnGhost} disabled={saving} onClick={() => act(s.stage_id || s.id, "done")}>
                                            <CheckCircle2 className="h-4 w-4" /> Selesai
                                        </button>
                                        <button className={btnGhost} disabled={saving} onClick={() => act(s.stage_id || s.id, "cancel")}>
                                            <X className="h-4 w-4" /> Batal
                                        </button>
                                        <button className={btnGhost} disabled={saving} onClick={() => act(s.stage_id || s.id, "reset")}>
                                            <RotateCcw className="h-4 w-4" /> Reset
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
