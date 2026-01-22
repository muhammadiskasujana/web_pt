import { Routes, Route } from "react-router-dom";
import CustomersList from "./CustomersList";
import CustomerForm from "./CustomerForm";
import CustomerDetail from "./CustomerDetail";

export default function CustomersRoutes() {
    return (
        <Routes>
            <Route index element={<CustomersList />} />
            <Route path="new" element={<CustomerForm />} />
            <Route path=":id" element={<CustomerDetail />} />
            <Route path=":id/edit" element={<CustomerForm />} />
        </Routes>
    );
}
