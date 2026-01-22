import { Routes, Route, Navigate } from "react-router-dom";
import ExpenseList from "./ExpenseList";
import ExpenseCreate from "./ExpenseCreate";
import ExpenseDetail from "./ExpenseDetail";
import ExpenseEdit from "./ExpenseEdit";

export default function ExpenseRoutes() {
    return (
        <Routes>
            <Route index element={<ExpenseList />} />
            <Route path="new" element={<ExpenseCreate />} />
            <Route path=":id" element={<ExpenseDetail />} />
            <Route path=":id/edit" element={<ExpenseEdit />} />
            <Route path="*" element={<Navigate to="/expenses" replace />} />
        </Routes>
    );
}
