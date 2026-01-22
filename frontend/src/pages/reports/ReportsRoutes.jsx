// ──────────────────────────────────────────────────────────────────────────────
// File: src/pages/reports/ReportsRoutes.jsx
// ──────────────────────────────────────────────────────────────────────────────
import { Routes, Route, Navigate } from "react-router-dom";
import Reports from "./Reports";

export default function ReportsRoutes() {
    return (
        <Routes>
            <Route index element={<Reports />} />
            {/* kalau nanti ada sub-page detail/print dsb */}
            <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
    );
}
