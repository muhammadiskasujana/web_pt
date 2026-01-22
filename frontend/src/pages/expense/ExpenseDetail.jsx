import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "../../config/axios";
import { btnGhost, HeaderBack, formatCurrency } from "../produk/_ui";
import { Edit, Trash2 } from "lucide-react";

export default function ExpenseDetail() {
    const { id } = useParams();
    const nav = useNavigate();
    const [exp, setExp] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const { data } = await axios.get(`/api/expenses/${id}`);
                const e = data?.expense ?? data?.data ?? data ?? null;
                if (mounted) setExp(e);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [id]);

    const del = async () => {
        if (!window.confirm("Hapus biaya ini?")) return;
        await axios.delete(`/api/expenses/${id}`);
        nav("/expenses");
    };

    if (loading) return <div>Memuat...</div>;
    if (!exp) return <div>Tidak ditemukan</div>;

    return (
        <div className="space-y-4">
            <HeaderBack
                title="Detail Biaya"
                onBack={() => nav("/expenses")}
                extra={
                    <div className="flex gap-2">
                        <Link className={btnGhost} to={`/expenses/${id}/edit`}><Edit className="h-4 w-4" /> Edit</Link>
                        <button className={btnGhost} onClick={del}><Trash2 className="h-4 w-4" /> Hapus</button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Info label="Tanggal" value={exp.spent_at ? new Date(exp.spent_at).toLocaleString("id-ID") : "-"} />
                <Info label="Tipe" value={exp.expense_type || "-"} />
                <Info label="Supplier" value={exp.supplier_name || "-"} />
                <Info label="Total" value={formatCurrency(exp.total)} />
                <Info label="Status Bayar" value={exp.payment_status || "-"} />
                <Info label="Jenis Transaksi" value={exp.transaction_type || "-"} />
                <Info label="Dibayar" value={formatCurrency(exp.paid_amount || 0)} />
                <Info label="Sisa" value={formatCurrency(exp.balance || 0)} />
                <div className="md:col-span-2">
                    <div className="border border-slate-900/10 rounded-xl px-4 py-3">
                        <div className="text-sm text-slate-600 mb-1">Keterangan</div>
                        <div className="font-medium whitespace-pre-wrap">{exp.description || "-"}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Info({ label, value }) {
    return (
        <div className="border border-slate-900/10 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-slate-600">{label}</div>
            <div className="font-medium">{value}</div>
        </div>
    );
}
