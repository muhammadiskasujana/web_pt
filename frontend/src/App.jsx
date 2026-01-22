import { useState, useEffect } from "react";
import {
    Routes,
    Route,
    Navigate,
    useNavigate,
    useLocation,
} from "react-router-dom";
import Cookies from "js-cookie";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Layout from "./pages/Layout";
import Dashboard from "./pages/Dashboard";
import axios from "./config/axios.js"


// ✅ Tambahan untuk PWA
import usePWAUpdate from "./userPWAUpdate";
import PWAUpdateToast from "./components/PWAUpdateToast";
import ProdukRoutes from "./pages/produk/ProdukRoutes..jsx";
import SalesList from "./pages/sales/SalesList.jsx";
import SalesCreate from "./pages/sales/SalesCreate.jsx";
import SalesDetail from "./pages/sales/SalesDetail.jsx";
import SalesEdit from "./pages/sales/SalesEdit.jsx";
import SalesRequests from "./pages/sales/SalesRequests.jsx";
import ReceivableList from "./pages/receivable/ReceivableList.jsx";
import ReceivableDetail from "./pages/receivable/ReceivableDetail.jsx";
import ExpenseRoutes from "./pages/expense/ExpenseRoutes.jsx";
import RawMaterialRoutes from "./pages/raw/RawMaterialRoutes.jsx";
import CompanyRoutes from "./pages/company/CompanyRoutes.jsx";
import BranchList from "./pages/company/BranchList.jsx";
import Transfers from "./pages/company/Transfers.jsx";
import AssetList from "./pages/company/AssetList.jsx";
import AssetForm from "./pages/company/AssetForm.jsx";
import AssetDetail from "./pages/company/AssetDetail.jsx";
import EmployeeRoutes from "./pages/company/EmployeeRoutes.jsx";
import PayableRoutes from "./pages/finance/PayableRoutes.jsx";
import ReportsRoutes from "./pages/reports/ReportsRoutes.jsx";
import CustomersRoutes from "./pages/customers/CustomersRoutes.jsx";
import ProgressHome from "./pages/progress/Index.jsx";
import ProgressCategoriesPage from "./pages/progress/Categories.jsx";
import ProgressAssignPage from "./pages/progress/Assign.jsx";
import ProgressInstancesList from "./pages/progress/InstancesList.jsx";
import ProgressInstanceDetail from "./pages/progress/InstanceDetail.jsx";
import WhatsappSessionsPage from "./pages/whatsapp/Sessions.jsx";
import WaSetting from "./pages/whatsapp/WaSetting.jsx";


export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const location = useLocation();
    const navigate = useNavigate();

    // ✅ Hook PWA
    const { needRefresh, doReload, close } = usePWAUpdate();
    // (opsional) kalau mau pakai offlineReady:
    // const { needRefresh, offlineReady, doReload, close } = usePWAUpdate();

    // Check authentication status from cookies only
    // useEffect(() => {
    //     const checkAuth = () => {
    //         const accessToken = Cookies.get("tenant_access_token");
    //         const deviceId = Cookies.get("device_id");
    //
    //         console.log(
    //             "Auth check - Access token:",
    //             !!accessToken,
    //             "Device ID:",
    //             !!deviceId
    //         );
    //
    //         if (accessToken && deviceId) {
    //             setUser({ authenticated: true });
    //         } else {
    //             console.log("No valid authentication found");
    //             setUser(null);
    //         }
    //
    //         setLoading(false);
    //     };
    //
    //     checkAuth();
    // }, []);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // Server akan baca cookie HttpOnly. FE tidak perlu tahu isinya.
                const { data } = await axios.get("/api/auth/me", { withCredentials: true });
                if (mounted) setUser(data?.user ? { authenticated: true, ...data.user } : null);
            } catch {
                if (mounted) setUser(null);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);


    // Navigate to dashboard after login
    useEffect(() => {
        if (user && location.pathname === "/login") {
            navigate("/dashboard", { replace: true });
        }
    }, [user, location.pathname, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    return (
        <>
            <Routes>
                <Route
                    path="/"
                    element={
                        user ? (
                            <Navigate to="/dashboard" replace />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />
                <Route path="/login" element={<Login onLogin={setUser} />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* Protected routes with layout */}
                <Route
                    path="/*"
                    element={
                        user ? (
                            <Layout user={user} onLogout={() => setUser(null)}>
                                <Routes>
                                    <Route path="/dashboard" element={<Dashboard />} />
                                    <Route path="/products/*" element={<ProdukRoutes />} />
                                    <Route path="/sales" element={<SalesList />} />
                                    <Route path="/sales/new" element={<SalesCreate />} />
                                    <Route path="/sales/:id" element={<SalesDetail />} />
                                    <Route path="/sales/:id/edit" element={<SalesEdit />} />
                                    <Route path="/sales/requests" element={<SalesRequests />} />
                                    <Route path="/receivables" element={<ReceivableList />} />
                                    <Route path="/receivables/:id" element={<ReceivableDetail />} />
                                    <Route path="/expenses/*" element={<ExpenseRoutes />} />
                                    <Route path="/raw-materials/*" element={<RawMaterialRoutes />} />
                                    <Route path="/company/*" element={<CompanyRoutes />} />
                                    <Route path="/branches" element={<BranchList />} />
                                    <Route path="/branches/transfers" element={<Transfers />} />
                                    <Route path="/assets" element={<AssetList />} />
                                    <Route path="/assets/new" element={<AssetForm mode="create" />} />
                                    <Route path="/assets/:id" element={<AssetDetail />} />
                                    <Route path="/assets/:id/edit" element={<AssetForm mode="edit" />} />
                                    <Route path="/employees/*" element={<EmployeeRoutes />} />
                                    <Route path="/payables/*" element={<PayableRoutes />} />
                                    <Route path="/reports/*" element={<ReportsRoutes />} />
                                    <Route path="/customers/*" element={<CustomersRoutes />} />
                                    <Route path="/progress" element={<ProgressHome />} />
                                    <Route path="/progress/categories" element={<ProgressCategoriesPage />} />
                                    <Route path="/progress/assign" element={<ProgressAssignPage />} />
                                    <Route path="/progress/instances" element={<ProgressInstancesList />} />
                                    <Route path="/progress/instances/:id" element={<ProgressInstanceDetail />} />
                                    <Route path="/whatsapp" element={<WhatsappSessionsPage/>} />
                                    <Route path="/whatsapp-setting" element={<WaSetting/>} />
                                </Routes>
                            </Layout>
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />
            </Routes>

            {/* ✅ Toast update PWA muncul global di semua halaman */}
            <PWAUpdateToast show={needRefresh} onReload={doReload} onClose={close} />

            {/* (opsional) jika ingin tampilkan "Siap offline" saat pertama kali install:
      <PWAUpdateToast
        show={offlineReady}
        title="Siap Offline"
        message="Aplikasi dapat digunakan tanpa koneksi."
        onReload={close}
        onClose={close}
      /> */}
        </>
    );
}
