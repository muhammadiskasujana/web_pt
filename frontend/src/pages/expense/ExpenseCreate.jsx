import { useNavigate } from "react-router-dom";
import ExpenseForm from "./ExpenseForm";
import { HeaderBack } from "../produk/_ui";

export default function ExpenseCreate() {
    const nav = useNavigate();
    return (
        <div className="space-y-4">
            <HeaderBack title="Tambah Biaya" onBack={() => nav("/expenses")} />
            <ExpenseForm mode="create" onSuccess={() => nav("/expenses")} onCancel={() => nav("/expenses")} />
        </div>
    );
}
