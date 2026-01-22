import { useNavigate } from "react-router-dom";
import { HeaderBack } from "../produk/_ui";
import SalesForm from "./SalesForm";

export default function SalesCreate() {
    const nav = useNavigate();
    return (
        <div className="space-y-4">
            <HeaderBack title="Sales Baru" onBack={() => nav("/sales")} />
            <SalesForm mode="create" onSuccess={() => nav("/sales")} />
        </div>
    );
}
