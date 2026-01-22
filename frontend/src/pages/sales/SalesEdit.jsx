import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../../config/axios";
import { HeaderBack } from "../produk/_ui";
import SalesForm from "./SalesForm";

export default function SalesEdit() {
    const { id } = useParams();
    const nav = useNavigate();
    const [initial, setInitial] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const { data } = await axios.get(`/api/sales/${id}`);
                const so = data?.sales_order ?? data?.data ?? data;
                if (mounted) setInitial({
                    customer_name: so.customer_name,
                    payment_status: so.payment_status,
                    transaction_type: so.transaction_type,
                    discount: so.discount ?? 0,
                    notes: so.notes || "",
                    progress_status: so.progress_status,
                });
            } finally { if (mounted) setLoading(false); }
        })();
        return () => { mounted = false; };
    }, [id]);

    return (
        <div className="space-y-4">
            <HeaderBack title="Edit Sales" onBack={() => nav(`/sales/${id}`)} />
            {loading ? <div>Memuat...</div> : initial ? (
                <SalesForm mode="edit" salesId={id} initial={initial} onSuccess={() => nav(`/sales/${id}`)} />
            ) : <div>Data tidak ditemukan</div>}
        </div>
    );
}
