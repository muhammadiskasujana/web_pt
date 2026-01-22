// ──────────────────────────────────────────────────────────────────────────────
// Entry router for Produk group (mount at "/products/*")
// ──────────────────────────────────────────────────────────────────────────────
import { Routes, Route, NavLink } from "react-router-dom";
import { Receipt } from "lucide-react";
import ProductList from "./ProductList";
import ProductCreate from "./ProductCreate";
import ProductEdit from "./ProductEdit";
import ProductDetail from "./ProductDetail";
import ProductSpecialPrices from "./ProductSpecialPrices";
import CategoriesHub from "./categories/CategoriesHub";


const Tab = ({ to, end, children }) => (
    <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
            `px-3 py-2 rounded-lg border ${isActive ? "border-sky-600 text-sky-700" : "border-slate-900/15 text-slate-700 hover:bg-slate-50"}`
        }
    >
        {children}
    </NavLink>
);


export default function ProdukRoutes() {
    return (
        <div className="min-h-screen bg-white text-slate-900">
            <header className="sticky top-0 z-10 bg-white border-b border-slate-900/10">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center">
                        <Receipt className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black">PRODUK</h1>
                        <p className="text-xs text-slate-700/70">Kelola produk, harga khusus, gambar, dan kategori</p>
                    </div>
                    <nav className="ml-auto flex items-center gap-1 text-sm">
                        <Tab to="" end>Daftar</Tab>
                        <Tab to="new">Tambah</Tab>
                        <Tab to="categories">Kategori</Tab>
                    </nav>
                </div>
            </header>


            <main className="max-w-6xl mx-auto px-4 py-6">
                <Routes>
                    <Route index element={<ProductList />} />
                    <Route path="new" element={<ProductCreate />} />
                    <Route path=":id" element={<ProductDetail />} />
                    <Route path=":id/edit" element={<ProductEdit />} />
                    <Route path=":id/special-prices" element={<ProductSpecialPrices />} />
                    <Route path="categories/*" element={<CategoriesHub />} />
                </Routes>
            </main>
        </div>
    );
}