import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import CompanyProfile from "./CompanyProfile";
import BranchList from "./BranchList";
import AssetList from "./AssetList";
import AssetDetail from "./AssetDetail";
import AssetForm from "./AssetForm";
import Transfers from "./Transfers";

function Tabs() {
    const loc = useLocation();
    const base = "/company";
    const is = (p) => loc.pathname === p || loc.pathname.startsWith(p + "/");
    const cls = (active) =>
        `px-3 py-2 rounded-lg border text-sm ${
            active
                ? "bg-sky-50 text-sky-700 border-sky-200"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
        }`;
    return (
        <div className="flex items-center gap-2 mb-4">
            <Link to={`${base}`} className={cls(is(`${base}`))}>Profil</Link>
            <Link to={`/branches`} className={cls(is(`/branches`))}>Cabang</Link>
            <Link to={`/assets`} className={cls(is(`/assets`))}>Aset</Link>
            <Link to={`/branches/transfers`} className={cls(is(`/branches/transfers`))}>Transfer Modal</Link>
        </div>
    );
}

export default function CompanyRoutes() {
    return (
        <>
            <Tabs />
            <Routes>
                <Route index element={<CompanyProfile />} />
                <Route path="*" element={<Navigate to="/company" replace />} />
            </Routes>
        </>
    );
}
