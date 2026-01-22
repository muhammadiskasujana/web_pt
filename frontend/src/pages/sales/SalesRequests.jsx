import { useEffect, useState } from "react";
import axios from "../../config/axios";
import { btnGhost, btnPrimary, inputBase, Th } from "../produk/_ui";
import { Check, XCircle, ChevronLeft, ChevronRight } from "lucide-react";

export default function SalesRequests() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
    const [status, setStatus] = useState("pending");

    const load = async (page = 1) => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/sales/revision-requests", { params: { status, page, limit: meta.limit } });
            const list = data?.requests ?? [];
            const p = data?.pagination ?? {};
            setRows(Array.isArray(list) ? list : []);
            setMeta({
                page: Number(p.page) || page,
                limit: Number(p.limit) || 10,
                total: Number(p.total) || list.length,
                pages: Number(p.pages) || 1,
            });
        } finally { setLoading(false); }
    };

    useEffect(() => { load(1); /* eslint-disable-next-line */ }, [status]);

    const approve = async (id) => {
        await axios.post(`/api/sales/revision-requests/${id}/approve`);
        await load(meta.page);
    };
    const reject = async (id) => {
        await axios.post(`/api/sales/revision-requests/${id}/reject`);
        await load(meta.page);
    };

    const totalPages = meta.pages || Math.max(1, Math.ceil((meta.total || 0) / (meta.limit || 10)));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Approval Requests</h2>
                <div className="flex gap-2">
                    <select className={inputBase} value={status} onChange={(e)=>setStatus(e.target.value)}>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto border border-slate-900/15 rounded-xl">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-slate-50">
                        <Th>Type</Th>
                        <Th>Resi</Th>
                        <Th>Customer</Th>
                        <Th>Reason</Th>
                        <Th>Dibuat</Th>
                        <Th className="text-right pr-4">Aksi</Th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr><td colSpan={6} className="p-6 text-center">Memuat...</td></tr>
                    ) : rows.length === 0 ? (
                        <tr><td colSpan={6} className="p-6 text-center">Tidak ada data</td></tr>
                    ) : rows.map((r)=>(
                        <tr key={r.id} className="border-t border-slate-900/10">
                            <td className="p-3 capitalize">{r.type}</td>
                            <td className="p-3">{r.sales_order?.resi_no || r.sales_order_id}</td>
                            <td className="p-3">{r.sales_order?.customer_name || "-"}</td>
                            <td className="p-3">{r.reason || (r.type==='revise' ? JSON.stringify(r.payload_diff) : "-")}</td>
                            <td className="p-3">{new Date(r.created_at).toLocaleString("id-ID")}</td>
                            <td className="p-3 text-right pr-4">
                                {status === "pending" ? (
                                    <div className="flex justify-end gap-2">
                                        <button className={btnPrimary} onClick={()=>approve(r.id)}><Check className="h-4 w-4" /> Approve</button>
                                        <button className={btnGhost} onClick={()=>reject(r.id)}><XCircle className="h-4 w-4" /> Reject</button>
                                    </div>
                                ) : <span className="text-slate-600 capitalize">{status}</span>}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between mt-3">
                <div className="text-sm text-slate-700/70">Halaman {meta.page} dari {totalPages} • Total {meta.total}</div>
                <div className="flex items-center gap-2">
                    <button className={btnGhost} onClick={()=> load(Math.max(1, meta.page-1))}><ChevronLeft className="h-4 w-4" /></button>
                    <button className={btnGhost} onClick={()=> load(Math.min(totalPages, meta.page+1))}><ChevronRight className="h-4 w-4" /></button>
                </div>
            </div>
        </div>
    );
}
