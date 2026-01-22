//
// import { useState, useEffect } from "react";
// import { Link, useNavigate, useLocation } from "react-router-dom";
// import Cookies from "js-cookie";
// import axios from "../config/axios";
// import {
//     LayoutDashboard,
//     LogOut,
//     Menu,
//     X,
//     User,
//     Package,
//     FileText,
//     Wallet,
//     Boxes,
//     Building2,
//     GitBranch,
//     Users,
//     BarChart3,
//     CableCar,
//     ChartBarStacked
// } from "lucide-react";
//
// import { getIconByName } from "./icons/lucideMap";
//
// export default function Layout({ user, onLogout, children }) {
//     const [sidebarOpen, setSidebarOpen] = useState(false);
//     const [userRole, setUserRole] = useState("user");
//     const [company, setCompany] = useState(null);
//     const [menuTree, setMenuTree] = useState([]);
//     const navigate = useNavigate();
//     const location = useLocation();
//
//     // Load user role
//     useEffect(() => {
//         let mounted = true;
//         (async () => {
//             try {
//                 const { data } = await axios.get("/api/auth/me");
//                 const role = data?.user?.userRole || "user"; // admin/owner/manager/user
//                 if (mounted) setUserRole(role);
//             } catch (e) {
//                 if (mounted) setUserRole("user");
//                 onLogout();
//                 navigate("/login");
//             }
//         })();
//         return () => {
//             mounted = false;
//         };
//     }, [user]);
//
//     // Load company profile for logo & (optional) theme
//     useEffect(() => {
//         let mounted = true;
//         (async () => {
//             try {
//                 // Coba /api/company; jika berbeda bentuk respons, tetap di-handle
//                 const { data } = await axios.get("/api/company");
//                 const c =
//                     data?.company ||
//                     data?.data?.company ||
//                     (data?.id && data) ||
//                     null;
//                 if (mounted) setCompany(c);
//             } catch (e) {
//                 // fallback (abaikan error; kita pakai placeholder)
//             } finally {
//                 document.title = "POS APPS";
//             }
//         })();
//         return () => {
//             mounted = false;
//         };
//     }, []);
//
//     useEffect(()=>{
//         let mounted = true;
//         (async ()=>{
//             try{
//                 const { data } = await axios.get('/api/select/menus/tree', { params:{ key:'main' }});
//                 if(mounted) setMenuTree(data?.items || []);
//             }catch(e){ /* ignore */ }
//         })();
//         return ()=>{ mounted=false; };
//     }, [userRole]); // role berubah → refetch
//
//     const grouped = menuTree.reduce((acc, item)=>{
//         const g = item.group_label || '';
//         (acc[g] ||= []).push(item);
//         return acc;
//     }, {});
//
//     // renderer 1 level (kalau butuh nested, kamu bisa rekursif)
//     function MenuGroup({ title, items }){
//         return (
//             <div className="pt-2">
//                 {title && (
//                     <div className="px-2 pb-1 text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
//                         {title}
//                     </div>
//                 )}
//                 {items.map(it=>{
//                     const Icon = getIconByName(it.icon || '');
//                     const active = location.pathname === it.path || location.pathname.startsWith((it.path||'')+'/');
//                     return (
//                         <Link
//                             key={it.id}
//                             to={it.path || '#'}
//                             onClick={()=> setSidebarOpen(false)}
//                             className={linkCls(active)}
//                         >
//                             {Icon ? <Icon className="h-5 w-5" /> : <span className="h-5 w-5" />}
//                             <span className="font-medium">{it.label}</span>
//                         </Link>
//                     );
//                 })}
//             </div>
//         );
//     }
//
//     const handleLogout = async () => {
//         try {
//             await axios.post("/api/auth/logout");
//         } catch {
//             // noop
//         } finally {
//             localStorage.removeItem("user");
//             localStorage.removeItem("token");
//             Cookies.remove("tenant_access_token");
//             Cookies.remove("tenant_refresh_token");
//             onLogout();
//             navigate("/login");
//         }
//     };
//
//     const hasManagementAccess = ["admin", "owner", "manager"].includes(userRole);
//
//     const basicMenuItems = [
//         { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
//     ];
//
//     // UI helpers
//     const linkCls = (active) =>
//         `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors border ${
//             active
//                 ? "bg-sky-50 text-sky-700 border-sky-200"
//                 : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-transparent"
//         }`;
//
//     const BrandLogo = ({ className = "" }) => {
//         const src = company?.logo_url;
//         if (src) {
//             return (
//                 <img
//                     src={src}
//                     alt={company?.name || "Company Logo"}
//                     className={`rounded-xl object-cover border border-slate-200 ${className}`}
//                 />
//             );
//         }
//         // Fallback kotak hitam berisi "POS"
//         return (
//             <div
//                 className={`rounded-xl bg-slate-900 text-white flex items-center justify-center border border-slate-200 ${className}`}
//             >
//                 <span className="text-[10px] font-bold tracking-widest">POS</span>
//             </div>
//         );
//     };
//
//     return (
//         <div className="min-h-screen bg-white text-slate-900">
//             {/* Sidebar (desktop + mobile drawer) */}
//             <aside
//                 className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
//                     sidebarOpen ? "translate-x-0" : "-translate-x-full"
//                 }`}
//                 aria-label="Sidebar"
//             >
//                 {/* Sidebar Header */}
//                 <div className="h-16 px-4 border-b border-slate-200 flex items-center justify-between">
//                     <div className="flex items-center gap-3">
//                         <BrandLogo className="h-10 w-10" />
//                         <div className="hidden sm:block">
//                             <h2 className="text-base font-extrabold">POS APPS</h2>
//                             <p className="text-[11px] text-slate-500">{company?.name || "GIVE BETTER"}</p>
//                         </div>
//                     </div>
//                     <button
//                         onClick={() => setSidebarOpen(false)}
//                         className="lg:hidden text-slate-600 hover:text-slate-900"
//                         aria-label="Close sidebar"
//                     >
//                         <X className="h-6 w-6" />
//                     </button>
//                 </div>
//
//                 {/* User info */}
//                 <div className="px-4 py-4 border-b border-slate-200">
//                     <div className="flex items-center gap-3">
//                         <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center">
//                             <User className="h-5 w-5 text-white" />
//                         </div>
//                         <div className="min-w-0">
//                             <p className="text-sm font-semibold truncate">
//                                 {user?.name || user?.email || "User"}
//                             </p>
//                             <div className="flex items-center gap-2">
//                                 <p className="text-xs text-slate-500 truncate max-w-[10rem]">
//                                     {user?.email}
//                                 </p>
//                                 <span
//                                     className={`px-2 py-0.5 text-xs rounded-full border whitespace-nowrap ${
//                                         userRole === "admin"
//                                             ? "bg-red-50 text-red-700 border-red-200"
//                                             : userRole === "owner"
//                                                 ? "bg-amber-50 text-amber-700 border-amber-200"
//                                                 : userRole === "manager"
//                                                     ? "bg-sky-50 text-sky-700 border-sky-200"
//                                                     : "bg-slate-50 text-slate-600 border-slate-200"
//                                     }`}
//                                 >
//                   {userRole}
//                 </span>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//
//                 {/* Navigation */}
//                 <nav className="px-3 py-4 space-y-2 overflow-y-auto h-[calc(100vh-8rem)]">
//                     {/*/!* Basic *!/*/}
//                     {/*<div className="space-y-1">*/}
//                     {/*    {basicMenuItems.map((item) => {*/}
//                     {/*        const Icon = item.icon;*/}
//                     {/*        const active = location.pathname === item.path;*/}
//                     {/*        return (*/}
//                     {/*            <Link*/}
//                     {/*                key={item.path}*/}
//                     {/*                to={item.path}*/}
//                     {/*                onClick={() => setSidebarOpen(false)}*/}
//                     {/*                className={linkCls(active)}*/}
//                     {/*            >*/}
//                     {/*                <Icon className="h-5 w-5" />*/}
//                     {/*                <span className="font-medium">{item.label}</span>*/}
//                     {/*            </Link>*/}
//                     {/*        );*/}
//                     {/*    })}*/}
//                     {/*</div>*/}
//
//                     {/*{hasManagementAccess && (*/}
//                     {/*    <div className="pt-2">*/}
//                     {/*        <div className="px-2 pb-1 text-[11px] font-semibold tracking-widest text-slate-500 uppercase">*/}
//                     {/*            Aktivitas*/}
//                     {/*        </div>*/}
//
//                     {/*        /!* Produk *!/*/}
//                     {/*        <Link*/}
//                     {/*            to="/progress/instances"*/}
//                     {/*            onClick={() => setSidebarOpen(false)}*/}
//                     {/*            className={linkCls(location.pathname.startsWith("/progress/instances"))}*/}
//                     {/*        >*/}
//                     {/*            <CableCar className="h-5 w-5" />*/}
//                     {/*            <span className="font-medium">Progres</span>*/}
//                     {/*        </Link>*/}
//                     {/*        <Link*/}
//                     {/*            to="/progress/categories"*/}
//                     {/*            onClick={() => setSidebarOpen(false)}*/}
//                     {/*            className={linkCls(location.pathname.startsWith("/progress/categories"))}*/}
//                     {/*        >*/}
//                     {/*            <ChartBarStacked className="h-5 w-5" />*/}
//                     {/*            <span className="font-medium">Progres Kategori</span>*/}
//                     {/*        </Link>*/}
//
//                     {/*        <Link*/}
//                     {/*            to="/progress/assign"*/}
//                     {/*            onClick={() => setSidebarOpen(false)}*/}
//                     {/*            className={linkCls(location.pathname.startsWith("/progress/assign"))}*/}
//                     {/*        >*/}
//                     {/*            <Package className="h-5 w-5" />*/}
//                     {/*            <span className="font-medium">Set Progres Produk</span>*/}
//                     {/*        </Link>*/}
//
//                     {/*    </div>*/}
//                     {/*)}*/}
//
//                     {/*{hasManagementAccess && (*/}
//                     {/*    <div className="pt-2">*/}
//                     {/*        <div className="px-2 pb-1 text-[11px] font-semibold tracking-widest text-slate-500 uppercase">*/}
//                     {/*            Operasional*/}
//                     {/*        </div>*/}
//
//                     {/*        /!* Produk *!/*/}
//                     {/*        <Link*/}
//                     {/*            to="/products"*/}
//                     {/*            onClick={() => setSidebarOpen(false)}*/}
//                     {/*            className={linkCls(location.pathname.startsWith("/products"))}*/}
//                     {/*        >*/}
//                     {/*            <Package className="h-5 w-5" />*/}
//                     {/*            <span className="font-medium">Produk</span>*/}
//                     {/*        </Link>*/}
//
//                     {/*        /!* Bahan Baku *!/*/}
//                     {/*        <Link*/}
//                     {/*            to="/raw-materials"*/}
//                     {/*            onClick={() => setSidebarOpen(false)}*/}
//                     {/*            className={linkCls(location.pathname.startsWith("/raw-materials"))}*/}
//                     {/*        >*/}
//                     {/*            <Boxes className="h-5 w-5" />*/}
//                     {/*            <span className="font-medium">Bahan Baku</span>*/}
//                     {/*        </Link>*/}
//
//                     {/*        /!* Pelanggan *!/*/}
//                     {/*        <Link*/}
//                     {/*            to="/customers"*/}
//                     {/*            onClick={() => setSidebarOpen(false)}*/}
//                     {/*            className={linkCls(location.pathname.startsWith("/customers"))}*/}
//                     {/*        >*/}
//                     {/*            <User className="h-5 w-5" />*/}
//                     {/*            <span className="font-medium">Pelanggan</span>*/}
//                     {/*        </Link>*/}
//                     {/*    </div>*/}
//                     {/*)}*/}
//
//                     {/*{hasManagementAccess && (*/}
//                     {/*    <div className="mt-2">*/}
//                     {/*        <div className="px-2 pb-1 text-[11px] font-semibold tracking-widest text-slate-500 uppercase">*/}
//                     {/*            Penjualan*/}
//                     {/*        </div>*/}
//                     {/*        {(() => {*/}
//                     {/*            const isSales =*/}
//                     {/*                location.pathname === "/sales" ||*/}
//                     {/*                (location.pathname.startsWith("/sales/") &&*/}
//                     {/*                    !location.pathname.startsWith("/sales/requests"));*/}
//                     {/*            return (*/}
//                     {/*                <Link*/}
//                     {/*                    to="/sales"*/}
//                     {/*                    onClick={() => setSidebarOpen(false)}*/}
//                     {/*                    className={linkCls(isSales)}*/}
//                     {/*                    aria-current={isSales ? "page" : undefined}*/}
//                     {/*                >*/}
//                     {/*                    <FileText className="h-5 w-5" />*/}
//                     {/*                    <span className="font-medium">Penjualan</span>*/}
//                     {/*                </Link>*/}
//                     {/*            );*/}
//                     {/*        })()}*/}
//                     {/*        <Link*/}
//                     {/*            to="/expenses"*/}
//                     {/*            onClick={() => setSidebarOpen(false)}*/}
//                     {/*            className={linkCls(location.pathname.startsWith("/expenses"))}*/}
//                     {/*        >*/}
//                     {/*            <Wallet className="h-5 w-5" />*/}
//                     {/*            <span className="font-medium">Pengeluaran</span>*/}
//                     {/*        </Link>*/}
//                     {/*    </div>*/}
//                     {/*)}*/}
//
//                     {/*{hasManagementAccess && (*/}
//                     {/*    <div className="mt-2">*/}
//                     {/*        <div className="px-2 pb-1 text-[11px] font-semibold tracking-widest text-slate-500 uppercase">*/}
//                     {/*            Approval*/}
//                     {/*        </div>*/}
//                     {/*        {(() => {*/}
//                     {/*            const isApprovals = location.pathname.startsWith("/sales/requests");*/}
//                     {/*            return (*/}
//                     {/*                <Link*/}
//                     {/*                    to="/sales/requests"*/}
//                     {/*                    onClick={() => setSidebarOpen(false)}*/}
//                     {/*                    className={linkCls(isApprovals)}*/}
//                     {/*                    aria-current={isApprovals ? "page" : undefined}*/}
//                     {/*                >*/}
//                     {/*                    <FileText className="h-5 w-5" />*/}
//                     {/*                    <span className="font-medium">Sales Approvals</span>*/}
//                     {/*                </Link>*/}
//                     {/*            );*/}
//                     {/*        })()}*/}
//                     {/*    </div>*/}
//                     {/*)}*/}
//
//                     {/*/!* Keuangan *!/*/}
//                     {/*{hasManagementAccess && (*/}
//                     {/*    <div className="mt-2">*/}
//                     {/*        <div className="px-2 pb-1 text-[11px] font-semibold tracking-widest text-slate-500 uppercase">*/}
//                     {/*            Keuangan*/}
//                     {/*        </div>*/}
//
//                     {/*        /!* Receivables *!/*/}
//                     {/*        {(() => {*/}
//                     {/*            const isRecv =*/}
//                     {/*                location.pathname === "/receivables" ||*/}
//                     {/*                location.pathname.startsWith("/receivables/");*/}
//                     {/*            return (*/}
//                     {/*                <Link*/}
//                     {/*                    to="/receivables"*/}
//                     {/*                    onClick={() => setSidebarOpen(false)}*/}
//                     {/*                    className={linkCls(isRecv)}*/}
//                     {/*                    aria-current={isRecv ? "page" : undefined}*/}
//                     {/*                >*/}
//                     {/*                    <FileText className="h-5 w-5" />*/}
//                     {/*                    <span className="font-medium">Piutang</span>*/}
//                     {/*                </Link>*/}
//                     {/*            );*/}
//                     {/*        })()}*/}
//
//                     {/*        <Link*/}
//                     {/*            to="/payables"*/}
//                     {/*            onClick={() => setSidebarOpen(false)}*/}
//                     {/*            className={linkCls(location.pathname.startsWith("/payables"))}*/}
//                     {/*        >*/}
//                     {/*            <FileText className="h-5 w-5" />*/}
//                     {/*            <span className="font-medium">Hutang</span>*/}
//                     {/*        </Link>*/}
//
//                     {/*        {(() => {*/}
//                     {/*            const isReports = location.pathname.startsWith("/reports");*/}
//                     {/*            return (*/}
//                     {/*                <Link*/}
//                     {/*                    to="/reports"*/}
//                     {/*                    onClick={() => setSidebarOpen(false)}*/}
//                     {/*                    className={linkCls(isReports)}*/}
//                     {/*                    aria-current={isReports ? "page" : undefined}*/}
//                     {/*                >*/}
//                     {/*                    <BarChart3 className="h-5 w-5" />*/}
//                     {/*                    <span className="font-medium">Laporan</span>*/}
//                     {/*                </Link>*/}
//                     {/*            );*/}
//                     {/*        })()}*/}
//                     {/*    </div>*/}
//                     {/*)}*/}
//
//                     {/*/!* Data Perusahaan *!/*/}
//                     {/*<div className="pt-2">*/}
//                     {/*    <div className="px-2 pb-1 text-[11px] font-semibold tracking-widest text-slate-500 uppercase">*/}
//                     {/*        Data Perusahaan*/}
//                     {/*    </div>*/}
//
//                     {/*    <Link*/}
//                     {/*        to="/company"*/}
//                     {/*        onClick={() => setSidebarOpen(false)}*/}
//                     {/*        className={linkCls(*/}
//                     {/*            location.pathname === "/company" ||*/}
//                     {/*            location.pathname.startsWith("/company")*/}
//                     {/*        )}*/}
//                     {/*    >*/}
//                     {/*        <Building2 className="h-5 w-5" />*/}
//                     {/*        <span className="font-medium">Profil</span>*/}
//                     {/*    </Link>*/}
//
//                     {/*    <Link*/}
//                     {/*        to="/branches"*/}
//                     {/*        onClick={() => setSidebarOpen(false)}*/}
//                     {/*        className={linkCls(*/}
//                     {/*            location.pathname.startsWith("/branches") &&*/}
//                     {/*            !location.pathname.includes("/transfers")*/}
//                     {/*        )}*/}
//                     {/*    >*/}
//                     {/*        <GitBranch className="h-5 w-5" />*/}
//                     {/*        <span className="font-medium">Cabang</span>*/}
//                     {/*    </Link>*/}
//
//                     {/*    <Link*/}
//                     {/*        to="/branches/transfers"*/}
//                     {/*        onClick={() => setSidebarOpen(false)}*/}
//                     {/*        className={linkCls(location.pathname.startsWith("/branches/transfers"))}*/}
//                     {/*    >*/}
//                     {/*        <Wallet className="h-5 w-5" />*/}
//                     {/*        <span className="font-medium">Transfer Modal</span>*/}
//                     {/*    </Link>*/}
//
//                     {/*    <Link*/}
//                     {/*        to="/employees"*/}
//                     {/*        onClick={() => setSidebarOpen(false)}*/}
//                     {/*        className={linkCls(location.pathname.startsWith("/employees"))}*/}
//                     {/*    >*/}
//                     {/*        <Users className="h-5 w-5" />*/}
//                     {/*        <span className="font-medium">Karyawan</span>*/}
//                     {/*    </Link>*/}
//
//                     {/*    <Link*/}
//                     {/*        to="/assets"*/}
//                     {/*        onClick={() => setSidebarOpen(false)}*/}
//                     {/*        className={linkCls(location.pathname.startsWith("/assets"))}*/}
//                     {/*    >*/}
//                     {/*        <Boxes className="h-5 w-5" />*/}
//                     {/*        <span className="font-medium">Aset</span>*/}
//                     {/*    </Link>*/}
//                     {/*</div>*/}
//
//                     {/*/!* Logout *!/*/}
//                     {/*<div className="pt-2">*/}
//                     {/*    <button*/}
//                     {/*        onClick={handleLogout}*/}
//                     {/*        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"*/}
//                     {/*    >*/}
//                     {/*        <LogOut className="h-5 w-5" />*/}
//                     {/*        <span className="font-medium">Logout</span>*/}
//                     {/*    </button>*/}
//                     {/*</div>*/}
//                     {Object.entries(grouped).sort((a,b)=> (a[0]||'').localeCompare(b[0]||'')).map(([g, items])=> (
//                         <MenuGroup key={g||'__root'} title={g} items={items} />
//                     ))}
//                 </nav>
//             </aside>
//
//             {/* Mobile overlay */}
//             {sidebarOpen && (
//                 <div
//                     className="fixed inset-0 bg-black/40 z-40 lg:hidden"
//                     onClick={() => setSidebarOpen(false)}
//                 />
//             )}
//
//             {/* Main */}
//             <div className="lg:pl-64 min-h-screen flex flex-col">
//                 {/* Mobile topbar */}
//                 <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between p-4 bg-white border-b border-slate-200">
//                     <button
//                         onClick={() => setSidebarOpen(true)}
//                         className="text-slate-700 hover:text-slate-900"
//                         aria-label="Open sidebar"
//                     >
//                         <Menu className="h-6 w-6" />
//                     </button>
//                     <div className="flex items-center gap-3">
//                         <BrandLogo className="h-8 w-8" />
//                         <h1 className="text-base font-extrabold">POS APPS</h1>
//                     </div>
//                 </div>
//
//                 {/* Page content wrapper */}
//                 <main className="flex-1 p-4 sm:p-6">
//                     <div className="max-w-7xl mx-auto">{children}</div>
//                 </main>
//             </div>
//         </div>
//     );
// }
//

// src/layout/Layout.jsx
import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Cookies from "js-cookie";
import axios from "../config/axios";

// Icons
import {
    Menu,
    X,
    LogOut,
    LayoutDashboard,
    CableCar,
    ChartBarStacked,
    Package,
    Boxes,
    User,
    Users,
    FileText,
    Wallet,
    BarChart3,
    Building2,
    GitBranch,
} from "lucide-react";

/**
 * Small icon map so the server can send icon names (string) and we can render them.
 * Add more icons here as needed and use the same key (string) on the DB.
 */
const ICON_MAP = {
    LayoutDashboard,
    CableCar,
    ChartBarStacked,
    Package,
    Boxes,
    User,
    Users,
    FileText,
    Wallet,
    BarChart3,
    Building2,
    GitBranch,
};

function getIconByName(name) {
    return ICON_MAP[name] || null;
}

export default function Layout({ user, onLogout, children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userRole, setUserRole] = useState("user");
    const [company, setCompany] = useState(null);
    const [menuTree, setMenuTree] = useState([]); // ← dynamic menu items from API
    const navigate = useNavigate();
    const location = useLocation();

    // Load user role (and keep auth valid)
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const { data } = await axios.get("/api/auth/me");
                const role = data?.user?.userRole || "user";
                if (mounted) setUserRole(role);
            } catch (e) {
                if (mounted) setUserRole("user");
                onLogout?.();
                navigate("/login");
            }
        })();
        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Load company profile (logo/name)
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const { data } = await axios.get("/api/company");
                const c =
                    data?.company ||
                    data?.data?.company ||
                    (data?.id && data) ||
                    null;
                if (mounted) setCompany(c);
            } catch {
                // ignore
            } finally {
                document.title = "POS APPS";
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    // Load dynamic menu (filtered by role/features on server)
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const { data } = await axios.get("/api/select/menus/tree", { params: { key: "main" } });
                if (mounted) setMenuTree(Array.isArray(data?.items) ? data.items : []);
            } catch {
                if (mounted) setMenuTree([]);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [userRole]);

    const handleLogout = async () => {
        try {
            await axios.post("/api/auth/logout");
        } catch {
            // noop
        } finally {
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            Cookies.remove("tenant_access_token");
            Cookies.remove("tenant_refresh_token");
            onLogout?.();
            navigate("/login");
        }
    };

    // ===== UI helpers
    const linkCls = (active) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors border ${
            active
                ? "bg-sky-50 text-sky-700 border-sky-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-transparent"
        }`;

    const BrandLogo = ({ className = "" }) => {
        const src = company?.logo_url;
        if (src) {
            return (
                <img
                    src={src}
                    alt={company?.name || "Company Logo"}
                    className={`rounded-xl object-cover border border-slate-200 ${className}`}
                />
            );
        }
        return (
            <div
                className={`rounded-xl bg-slate-900 text-white flex items-center justify-center border border-slate-200 ${className}`}
            >
                <span className="text-[10px] font-bold tracking-widest">POS</span>
            </div>
        );
    };

    /**
     * Group items by `group_label`, preserving original order.
     * Server already ensures order by `order_index`.
     * This layout renders only first-level items. If you plan to support nested children,
     * you can extend the renderer using item.children.
     */
    const groupedMenus = useMemo(() => {
        const groups = {};
        const groupOrder = [];
        for (const it of menuTree) {
            const g = it.group_label || "";
            if (!groups[g]) {
                groups[g] = [];
                groupOrder.push(g);
            }
            groups[g].push(it);
        }
        return { groups, groupOrder };
    }, [menuTree]);

    function MenuGroup({ title, items }) {
        return (
            <div className="pt-2">
                {title && (
                    <div className="px-2 pb-1 text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
                        {title}
                    </div>
                )}
                {items.map((it) => {
                    const Icon = getIconByName(it.icon || "");
                    const isActive =
                        (it.path && location.pathname === it.path) ||
                        (it.path && location.pathname.startsWith(`${it.path}/`));
                    const content = (
                        <div className={linkCls(isActive)}>
                            {Icon ? <Icon className="h-5 w-5" /> : <span className="h-5 w-5" />}
                            <span className="font-medium">{it.label}</span>
                        </div>
                    );

                    // If no path provided, render as inert block (could be a non-clickable heading)
                    if (!it.path) {
                        return (
                            <div key={it.id} className="px-3">
                                {content}
                            </div>
                        );
                    }
                    return (
                        <Link
                            key={it.id}
                            to={it.path}
                            onClick={() => setSidebarOpen(false)}
                            className="block"
                        >
                            {content}
                        </Link>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-slate-900">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`}
                aria-label="Sidebar"
            >
                {/* Sidebar Header */}
                <div className="h-16 px-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <BrandLogo className="h-10 w-10" />
                        <div className="hidden sm:block">
                            <h2 className="text-base font-extrabold">POS APPS</h2>
                            <p className="text-[11px] text-slate-500">
                                {company?.name || "GIVE BETTER"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden text-slate-600 hover:text-slate-900"
                        aria-label="Close sidebar"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* User info */}
                <div className="px-4 py-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center">
                            <User className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">
                                {user?.name || user?.email || "User"}
                            </p>
                            <div className="flex items-center gap-2">
                                <p className="text-xs text-slate-500 truncate max-w-[10rem]">
                                    {user?.email}
                                </p>
                                <span
                                    className={`px-2 py-0.5 text-xs rounded-full border whitespace-nowrap ${
                                        userRole === "admin"
                                            ? "bg-red-50 text-red-700 border-red-200"
                                            : userRole === "owner"
                                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                                : userRole === "manager"
                                                    ? "bg-sky-50 text-sky-700 border-sky-200"
                                                    : "bg-slate-50 text-slate-600 border-slate-200"
                                    }`}
                                >
                  {userRole}
                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation — dynamic from DB */}
                <nav className="px-3 py-4 space-y-2 overflow-y-auto h-[calc(100vh-8rem)]">
                    {/* Render groups in appearance order */}
                    {groupedMenus.groupOrder.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500">
                            Menu belum dikonfigurasi.
                        </div>
                    ) : (
                        groupedMenus.groupOrder.map((gKey) => (
                            <MenuGroup
                                key={gKey || "__root"}
                                title={gKey || null}
                                items={groupedMenus.groups[gKey]}
                            />
                        ))
                    )}

                    {/* Logout */}
                    <div className="pt-2">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                        >
                            <LogOut className="h-5 w-5" />
                            <span className="font-medium">Logout</span>
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main */}
            <div className="lg:pl-64 min-h-screen flex flex-col">
                {/* Mobile topbar */}
                <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between p-4 bg-white border-b border-slate-200">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="text-slate-700 hover:text-slate-900"
                        aria-label="Open sidebar"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <div className="flex items-center gap-3">
                        <BrandLogo className="h-8 w-8" />
                        <h1 className="text-base font-extrabold">POS APPS</h1>
                    </div>
                </div>

                {/* Page content */}
                <main className="flex-1 p-4 sm:p-6">
                    <div className="max-w-7xl mx-auto">{children}</div>
                </main>
            </div>
        </div>
    );
}

