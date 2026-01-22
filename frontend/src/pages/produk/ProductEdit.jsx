// ──────────────────────────────────────────────────────────────────────────────
// File: src/pages/produk/ProductEdit.jsx
// ──────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../../config/axios";
import ProductForm from "./ProductForm";
import { HeaderBack } from "./_ui";

export default function ProductEdit() {
    const { id } = useParams();
    const nav = useNavigate();
    const [initial, setInitial] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const { data } = await axios.get(`/api/products/${id}`);

                // ✅ normalisasi sesuai respons kamu
                // { product: { ... } }
                const p =
                    data?.product ??
                    data?.data?.product ?? // fallback kalau backend pakai { data: { product } }
                    data?.data ?? // fallback lama
                    data ?? {};

                // Pastikan string untuk input number/text dan boolean untuk checkbox
                const payload = {
                    name: p.name || "",
                    sku: p.sku || "",
                    product_category_id: p.product_category_id || "",
                    size_category_id: p.size_category_id || "",
                    unit_category_id: p.unit_category_id || "",
                    price_normal: p.price_normal != null ? String(p.price_normal) : "",
                    stock: p.stock != null ? String(p.stock) : "0",
                    is_area: !!p.is_area,
                    is_stock: !!p.is_stock,
                };

                if (mounted) setInitial(payload);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [id]);

    return (
        <div className="space-y-4">
            <HeaderBack title="Edit Produk" onBack={() => nav("/products")} />
            {loading ? (
                <div>Memuat...</div>
            ) : initial ? (
                <ProductForm
                    mode="edit"
                    productId={id}
                    initial={initial}
                    onSuccess={() => nav(`/products/${id}`)}
                />
            ) : (
                <div>Produk tidak ditemukan</div>
            )}
        </div>
    );
}
