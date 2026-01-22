// ──────────────────────────────────────────────────────────────────────────────
// File: src/pages/produk/categories/CategoriesHub.jsx
// ──────────────────────────────────────────────────────────────────────────────
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import CategoryCRUD from "./CategoryCRUD.jsx";
import { Tag, Ruler, Layers, Users } from "lucide-react";
import { HeaderBack } from "../_ui";

export default function CategoriesHub() {
    return (
        <Routes>
            <Route index element={<CategoriesIndex />} />
            <Route path="product" element={<CategoryCRUD title="Kategori Produk" icon={<Tag className='h-4 w-4'/>} endpoint="/api/catalog/product" fields={[{key:'name', label:'Nama'}]} />} />
            <Route path="size" element={<CategoryCRUD title="Kategori Ukuran" icon={<Ruler className='h-4 w-4'/>} endpoint="/api/catalog/size" fields={[{key:'name', label:'Nama'},{key:'unit', label:'Unit'}]} />} />
            <Route path="unit" element={<CategoryCRUD title="Kategori Satuan" icon={<Layers className='h-4 w-4'/>} endpoint="/api/catalog/unit" fields={[{key:'name', label:'Nama'},{key:'abbreviation', label:'Singkatan'}]} />} />
            <Route path="customer" element={<CategoryCRUD title="Kategori Pelanggan" icon={<Users className='h-4 w-4'/>} endpoint="/api/catalog/customer" fields={[{key:'name', label:'Nama'}]} />} />
        </Routes>
    );
}

function CategoriesIndex() {
    const nav = useNavigate();
    return (
        <div className="space-y-4">
            <HeaderBack title="Kategori" onBack={() => nav(-1)} />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <CategoryCard to="product" title="Kategori Produk" icon={<Tag className="h-6 w-6"/>} />
                <CategoryCard to="size" title="Kategori Ukuran" icon={<Ruler className="h-6 w-6"/>} />
                <CategoryCard to="unit" title="Kategori Satuan" icon={<Layers className="h-6 w-6"/>} />
                <CategoryCard to="customer" title="Kategori Pelanggan" icon={<Users className="h-6 w-6"/>} />
            </div>
        </div>
    );
}

function CategoryCard({ to, title, icon }) {
    return (
        <Link to={to} className="border border-slate-900/15 rounded-2xl p-4 hover:bg-slate-50 transition flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">{icon}</div>
            <div className="font-semibold">{title}</div>
        </Link>
    );
}