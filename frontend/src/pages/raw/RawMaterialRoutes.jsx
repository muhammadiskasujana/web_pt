import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import CategoryList from "./CategoryList";
import ItemList from "./ItemList";
import StockList from "./StockList";
import MoveList from "./MoveList";
import MoveCreate from "./MoveCreate";

function Tabs() {
    const loc = useLocation();
    const tab = (path) =>
        loc.pathname === path || loc.pathname.startsWith(path + "/");
    const base = "/raw-materials";
    const cls = (active) =>
        `px-3 py-2 rounded-lg border text-sm ${
            active
                ? "bg-sky-50 text-sky-700 border-sky-200"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
        }`;
    return (
        <div className="flex items-center gap-2 mb-4">
            <Link to={`${base}/categories`} className={cls(tab(`${base}/categories`))}>
                Kategori
            </Link>
            <Link to={`${base}/items`} className={cls(tab(`${base}/items`))}>
                Item
            </Link>
            <Link to={`${base}/stock`} className={cls(tab(`${base}/stock`))}>
                Stok Cabang
            </Link>
            <Link to={`${base}/moves`} className={cls(tab(`${base}/moves`))}>
                Pergerakan
            </Link>
            <Link to={`${base}/moves/new`} className={cls(tab(`${base}/moves/new`))}>
                Input Pergerakan
            </Link>
        </div>
    );
}

export default function RawMaterialRoutes() {
    return (
        <>
            <Tabs />
            <Routes>
                <Route index element={<Navigate to="categories" replace />} />
                <Route path="categories" element={<CategoryList />} />
                <Route path="items" element={<ItemList />} />
                <Route path="stock" element={<StockList />} />
                <Route path="moves" element={<MoveList />} />
                <Route path="moves/new" element={<MoveCreate />} />
                <Route path="*" element={<Navigate to="categories" replace />} />
            </Routes>
        </>
    );
}
