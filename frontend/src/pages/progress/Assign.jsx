import { useEffect, useState } from "react";
import axios from "../../config/axios";
import { inputBase, Th, btnGhost } from "../produk/_ui";
import { Section } from "./ProgressRoutes.jsx";

export default function ProgressAssignPage() {
    const [products, setProducts] = useState([]);
    const [cats, setCats] = useState([]);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        const [{ data: dp }, { data: dc }] = await Promise.all([
            axios.get("/api/products", { params: { page: 1, limit: 500 } }),
            axios.get("/api/progress/categories"),
        ]);
        const list = dp?.products ?? dp?.data ?? dp?.items ?? [];
        setProducts(Array.isArray(list) ? list : []);
        setCats(dc?.data || []);
    };
    useEffect(() => {
        load();
    }, []);

    const save = async (product_id, category_id) => {
        setSaving(true);
        try {
            await axios.post("/api/progress/assign", { product_id, category_id });
            await load();
        } finally {
            setSaving(false);
        }
    };

    return (
        <Section title="Assign Kategori → Produk">
            <div className="overflow-x-auto border border-slate-900/15 rounded-xl">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-slate-50">
                        <Th>Produk</Th>
                        <Th>Kategori Progres</Th>
                        <Th className="text-right pr-4">Aksi</Th>
                    </tr>
                    </thead>
                    <tbody>
                    {products.length === 0 ? (
                        <tr>
                            <td colSpan={3} className="p-6 text-center">
                                Memuat / tidak ada data
                            </td>
                        </tr>
                    ) : (
                        products.map((p) => {
                            const current =
                                p.progressCategory || p.progress_category || p.progress_category_id;
                            return (
                                <tr key={p.id} className="border-t border-slate-900/10">
                                    <td className="p-3 font-medium">{p.name}</td>
                                    <td className="p-3">
                                        {typeof current === "object"
                                            ? current?.name || "-"
                                            : cats.find((c) => c.id === current)?.name || "-"}
                                    </td>
                                    <td className="p-3 text-right pr-4">
                                        <select
                                            className={inputBase}
                                            defaultValue={p.progress_category_id || ""}
                                            onChange={(e) => save(p.id, e.target.value || null)}
                                            disabled={saving}
                                        >
                                            <option value="">(kosongkan)</option>
                                            {cats.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                    </tbody>
                </table>
            </div>
        </Section>
    );
}
