import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../../config/axios";
import ExpenseForm from "./ExpenseForm";
import { HeaderBack } from "../produk/_ui";

export default function ExpenseEdit() {
    const { id } = useParams();
    const nav = useNavigate();
    const [initial, setInitial] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const { data } = await axios.get(`/api/expenses/${id}`);
                const e = data?.expense ?? data?.data ?? data ?? {};
                const payload = {
                    expense_type: e.expense_type || "operational",
                    branch_id: e.branch_id || "",
                    employee_id: e.employee_id || "",
                    supplier_name: e.supplier_name || "",
                    product_id: e.product_id || "",
                    rm_id: e.rm_id || "",
                    qty: e.qty != null ? String(e.qty) : "",
                    unit_cost: e.unit_cost != null ? String(e.unit_cost) : "",
                    total: e.total != null ? String(e.total) : "",
                    payment_status: e.payment_status || "lunas",
                    transaction_type: e.transaction_type || "tunai",
                    paid_amount: e.paid_amount != null ? String(e.paid_amount) : "",
                    spent_at: e.spent_at ? new Date(e.spent_at).toISOString().slice(0,10) : new Date().toISOString().slice(0,10),
                    description: e.description || "",
                };
                if (mounted) setInitial(payload);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [id]);

    return (
        <div className="space-y-4">
            <HeaderBack title="Edit Biaya" onBack={() => nav("/expenses")} />
            {loading ? (
                <div>Memuat...</div>
            ) : initial ? (
                <ExpenseForm
                    mode="edit"
                    expenseId={id}
                    initial={initial}
                    onSuccess={() => nav(`/expenses/${id}`)}
                    onCancel={() => nav(`/expenses/${id}`)}
                />
            ) : (
                <div>Data tidak ditemukan</div>
            )}
        </div>
    );
}
