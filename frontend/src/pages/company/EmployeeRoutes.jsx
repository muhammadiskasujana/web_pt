import { Routes, Route, Navigate } from "react-router-dom";
import EmployeeList from "./EmployeeList";
import EmployeeForm from "./EmployeeForm";
import EmployeeDetail from "./EmployeeDetail";

export default function EmployeeRoutes() {
    return (
        <Routes>
            <Route index element={<EmployeeList />} />
            <Route path="new" element={<EmployeeForm mode="create" />} />
            <Route path=":id" element={<EmployeeDetail />} />
            <Route path=":id/edit" element={<EmployeeForm mode="edit" />} />
            <Route path="*" element={<Navigate to="/employees" replace />} />
        </Routes>
    );
}
