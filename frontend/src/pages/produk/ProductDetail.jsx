// ──────────────────────────────────────────────────────────────────────────────
// File: src/pages/produk/ProductDetail.jsx
// ──────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "../../config/axios";
import { btnGhost, HeaderBack, formatCurrency } from "./_ui";
import { Edit, DollarSign, Trash2 } from "lucide-react";

export default function ProductDetail() {
    const { id } = useParams();
    const nav = useNavigate();
    const [p, setP] = useState(null);
    const [gallery, setGallery] = useState([]); // <= galeri
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // detail produk
                const { data } = await axios.get(`/api/products/${id}`);
                const product =
                    data?.product ??
                    data?.data?.product ??
                    data?.data ??
                    data ?? null;

                // list gambar (opsional, kalau endpoint ada)
                let images = [];
                try {
                    const resImg = await axios.get(`/api/products/${id}/images`);
                    const imgsRaw =
                        resImg?.data?.images ??
                        resImg?.data?.data ??
                        resImg?.data?.items ??
                        [];
                    images = Array.isArray(imgsRaw) ? imgsRaw : [];
                } catch {
                    // kalau endpoint belum ada/ga dipakai, biarkan kosong
                }

                if (mounted) {
                    setP(product);
                    setGallery(images);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [id]);

    const del = async () => {
        if (!window.confirm("Hapus produk ini?")) return;
        await axios.delete(`/api/products/${id}`);
        nav("/products");
    };

    if (loading) return <div>Memuat...</div>;
    if (!p) return <div>Tidak ditemukan</div>;

    // Foto utama dari backend
    const mainPhoto = p.photo_url || null;

    // Normalisasi list gambar untuk render:
    // - pakai galeri jika ada
    // - jika tidak ada galeri, tapi ada photo_url utama, tampilkan satu kotak
    const imagesForRender =
        (Array.isArray(gallery) && gallery.length > 0
            ? gallery.map((g) => ({
                id: g.id || g.image_id || g._id || String(g.url || g.photo_url),
                url: g.url || g.photo_url || g.src,
            }))
            : []) || [];

    if (imagesForRender.length === 0 && mainPhoto) {
        imagesForRender.push({ id: "main", url: mainPhoto });
    }

    return (
        <div className="space-y-4">
            <HeaderBack
                title="Detail Produk"
                onBack={() => nav("/products")}
                extra={
                    <div className="flex gap-2">
                        <Link className={btnGhost} to={`/products/${id}/edit`}>
                            <Edit className="h-4 w-4" /> Edit
                        </Link>
                        <Link className={btnGhost} to={`/products/${id}/special-prices`}>
                            <DollarSign className="h-4 w-4" /> Harga Khusus
                        </Link>
                        <button className={btnGhost} onClick={del}>
                            <Trash2 className="h-4 w-4" /> Hapus
                        </button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Info kiri */}
                <div className="md:col-span-2 space-y-3">
                    <InfoRow label="Nama" value={p.name} />
                    <InfoRow label="SKU" value={p.sku || "-"} />
                    <InfoRow label="Kategori" value={p.category?.name || "-"} />
                    <InfoRow
                        label="Kategori Ukuran"
                        value={
                            p.sizeCategory
                                ? `${p.sizeCategory.name}${
                                    p.sizeCategory.unit ? ` (${p.sizeCategory.unit})` : ""
                                }`
                                : "-"
                        }
                    />
                    <InfoRow
                        label="Kategori Satuan"
                        value={
                            p.unitCategory
                                ? `${p.unitCategory.name}${
                                    p.unitCategory.abbreviation
                                        ? ` (${p.unitCategory.abbreviation})`
                                        : ""
                                }`
                                : "-"
                        }
                    />
                    <InfoRow label="Harga Normal" value={formatCurrency(p.price_normal)} />
                    <InfoRow label="Stok" value={String(p.stock ?? 0)} />
                    <InfoRow label="Tipe" value={p.is_area ? "Area" : p.is_stock ? "Stok" : "—"} />
                    <InfoRow
                        label="Harga Khusus"
                        value={
                            Array.isArray(p.specialPrices) && p.specialPrices.length > 0
                                ? `${p.specialPrices.length} kategori`
                                : "—"
                        }
                    />
                </div>

                {/* Galeri kanan */}
                <div>
                    <div className="grid grid-cols-3 gap-2">
                        {imagesForRender.length > 0 ? (
                            imagesForRender.map((img) => (
                                <div key={img.id} className="relative group">
                                    <img
                                        src={img.url}
                                        alt="foto-produk"
                                        className="h-24 w-full object-cover rounded-lg border border-slate-900/10"
                                    />
                                </div>
                            ))
                        ) : (
                            <div className="col-span-3 text-sm text-slate-600 border border-slate-900/15 rounded-xl p-3 text-center">
                                Belum ada gambar
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="flex items-center justify-between border border-slate-900/10 rounded-xl px-4 py-3">
            <div className="text-sm text-slate-600">{label}</div>
            <div className="font-medium max-w-[60%] text-right truncate" title={String(value)}>
                {value}
            </div>
        </div>
    );
}
