// ──────────────────────────────────────────────────────────────────────────────
// File: src/pages/produk/ProductCreate.jsx
// ──────────────────────────────────────────────────────────────────────────────
import { useNavigate } from "react-router-dom";
import ProductForm from "./ProductForm";
import { HeaderBack } from "./_ui";

export default function ProductCreate() {
    const nav = useNavigate();
    return (
        <div className="space-y-4">
            <HeaderBack title="Tambah Produk" onBack={() => nav(-1)} />
            <ProductForm mode="create" onSuccess={() => nav("/products")} />
        </div>
    );
}