// src/pages/finance/PayableRoutes.jsx
import { Routes, Route } from "react-router-dom";
import PayablesList from "./payables/PayablesList";
import PayableDetail from "./payables/PayableDetail";

export default function PayableRoutes() {
    return (
        <Routes>
            <Route index element={<PayablesList />} />
            <Route path=":id" element={<PayableDetail />} />
        </Routes>
    );
}
