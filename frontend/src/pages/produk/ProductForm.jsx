import { useEffect, useState } from "react";
import axios from "../../config/axios";
import { Tag, Ruler, Layers, Image as ImageIcon, X, Save } from "lucide-react";
import { btnPrimary, inputBase } from "./_ui";

export default function ProductForm({ initial, mode, productId, onSuccess }) {
    const isCreate = mode === "create";

    const [productCat, setProductCat] = useState([]);
    const [sizeCat, setSizeCat] = useState([]);
    const [unitCat, setUnitCat] = useState([]);

    // 🔹 pisah: foto utama (single) vs galeri (multiple)
    const [mainPhoto, setMainPhoto] = useState(null);
    const [gallery, setGallery] = useState([]);

    const [form, setForm] = useState(
        initial || {
            name: "",
            sku: "",
            product_category_id: "",
            size_category_id: "",
            unit_category_id: "",
            price_normal: "",
            stock: "0",
            is_area: false,
            is_stock: true,
        }
    );

    useEffect(() => {
        (async () => {
            try {
                // pakai endpoint kategori kamu sendiri (ubah kalau perlu)
                const [p, s, u] = await Promise.all([
                    axios.get("/api/catalog/product", { params: { page: 1, limit: 500 } }),
                    axios.get("/api/catalog/size", { params: { page: 1, limit: 500 } }),
                    axios.get("/api/catalog/unit", { params: { page: 1, limit: 500 } }),
                ]);
                setProductCat(p.data.data || p.data.items || p.data || []);
                setSizeCat(s.data.data || s.data.items || s.data || []);
                setUnitCat(u.data.data || u.data.items || u.data || []);
            } catch {
                // noop
            }
        })();
    }, []);

    useEffect(() => {
        if (initial) setForm(initial);
    }, [initial]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
    };

    const submit = async (e) => {
        e.preventDefault();

        try {
            if (isCreate) {
                // CREATE: kirim multipart dengan field 'photo' (OPTIONAL)
                const fd = new FormData();
                Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ""));
                if (mainPhoto) fd.append("photo", mainPhoto); // ✅ sesuai backend

                await axios.post("/api/products", fd, {
                    headers: { "Content-Type": "multipart/form-data" },
                });

                // catatan: galeri butuh productId, jadi tambahkan di halaman edit setelah produk dibuat.
            } else {
                // EDIT:
                if (mainPhoto) {
                    // Jika ganti foto utama: kirim multipart (photo + fields)
                    const fd = new FormData();
                    Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ""));
                    fd.append("photo", mainPhoto); // ✅ sesuai backend
                    await axios.put(`/api/products/${productId}`, fd, {
                        headers: { "Content-Type": "multipart/form-data" },
                    });
                } else {
                    // Tidak ganti foto utama: cukup JSON
                    await axios.put(`/api/products/${productId}`, form);
                }

                // Tambah galeri bila ada
                if (gallery.length) {
                    const fd2 = new FormData();
                    // ✅ sesuai backend: array field name = 'images'
                    gallery.forEach((file) => fd2.append("images", file));
                    await axios.post(`/api/products/${productId}/images`, fd2, {
                        headers: { "Content-Type": "multipart/form-data" },
                    });
                }
            }

            onSuccess?.();
        } finally {
            // noop
        }
    };

    return (
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
                <label className="block">
                    <span className="mb-2 block text-sm font-medium">Nama Produk</span>
                    <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        className={inputBase}
                        placeholder="Contoh: Kaos Polos"
                    />
                </label>

                <label className="block">
                    <span className="mb-2 block text-sm font-medium">SKU (opsional)</span>
                    <input
                        name="sku"
                        value={form.sku}
                        onChange={handleChange}
                        className={inputBase}
                        placeholder="SKU-001"
                    />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="block">
            <span className="mb-2 block text-sm font-medium flex items-center gap-1">
              <Tag className="h-4 w-4" />
              Kategori Produk
            </span>
                        <select
                            name="product_category_id"
                            value={form.product_category_id}
                            onChange={handleChange}
                            className={inputBase}
                        >
                            <option value="">Pilih...</option>
                            {productCat.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
            <span className="mb-2 block text-sm font-medium flex items-center gap-1">
              <Ruler className="h-4 w-4" />
              Kategori Ukuran
            </span>
                        <select
                            name="size_category_id"
                            value={form.size_category_id}
                            onChange={handleChange}
                            className={inputBase}
                        >
                            <option value="">Pilih...</option>
                            {sizeCat.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
            <span className="mb-2 block text-sm font-medium flex items-center gap-1">
              <Layers className="h-4 w-4" />
              Kategori Satuan
            </span>
                        <select
                            name="unit_category_id"
                            value={form.unit_category_id}
                            onChange={handleChange}
                            className={inputBase}
                        >
                            <option value="">Pilih...</option>
                            {unitCat.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="block">
                        <span className="mb-2 block text-sm font-medium">Harga Normal</span>
                        <input
                            name="price_normal"
                            type="number"
                            min="0"
                            value={form.price_normal}
                            onChange={handleChange}
                            className={inputBase}
                            placeholder="0"
                        />
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-sm font-medium">Stok</span>
                        <input
                            name="stock"
                            type="number"
                            min="0"
                            value={form.stock}
                            onChange={handleChange}
                            className={inputBase}
                            placeholder="0"
                        />
                    </label>

                    <div className="grid grid-cols-2 gap-3 items-end">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                name="is_area"
                                checked={form.is_area}
                                onChange={handleChange}
                                className="h-4 w-4"
                            />
                            Area
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                name="is_stock"
                                checked={form.is_stock}
                                onChange={handleChange}
                                className="h-4 w-4"
                            />
                            Stok
                        </label>
                    </div>
                </div>

                <div>
                    <button type="submit" className={btnPrimary}>
                        <Save className="h-4 w-4" /> {isCreate ? "Simpan & Tambah" : "Simpan Perubahan"}
                    </button>
                </div>
            </div>

            {/* Panel Upload */}
            <div className="space-y-3">
                {/* Foto utama (single) -> field 'photo' */}
                <label className="block">
          <span className="mb-2 block text-sm font-medium flex items-center gap-1">
            <ImageIcon className="h-4 w-4" />
            Foto Utama (jpg/png) — single
          </span>
                    <div className="border border-slate-900/20 rounded-xl p-4">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setMainPhoto(e.target.files?.[0] || null)}
                        />
                        {mainPhoto && (
                            <div className="mt-3 grid grid-cols-3 gap-2">
                                <Thumb file={mainPhoto} onRemove={() => setMainPhoto(null)} />
                            </div>
                        )}
                    </div>
                </label>

                {/* Galeri (multiple) -> field 'images' */}
                {!isCreate && (
                    <label className="block">
            <span className="mb-2 block text-sm font-medium flex items-center gap-1">
              <ImageIcon className="h-4 w-4" />
              Galeri (max 10) — multiple
            </span>
                        <div className="border border-slate-900/20 rounded-xl p-4">
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={(e) => setGallery(Array.from(e.target.files || []))}
                            />
                            {gallery.length > 0 && (
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                    {gallery.map((f, i) => (
                                        <Thumb
                                            key={i}
                                            file={f}
                                            onRemove={() =>
                                                setGallery((arr) => arr.filter((_, idx) => idx !== i))
                                            }
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </label>
                )}
            </div>
        </form>
    );
}

function Thumb({ file, onRemove }) {
    const [src, setSrc] = useState("");
    useEffect(() => {
        const reader = new FileReader();
        reader.onload = () => setSrc(reader.result);
        reader.readAsDataURL(file);
    }, [file]);
    return (
        <div className="relative">
            <img
                src={src}
                alt={file.name}
                className="h-24 w-full object-cover rounded-lg border border-slate-900/10"
            />
            <button
                type="button"
                onClick={onRemove}
                className="absolute -top-2 -right-2 bg-white border border-slate-900/20 rounded-full p-1"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
