// Import ikon yang dipakai (hemat bundle). Tambah sesuai kebutuhan.
import {
    LayoutDashboard, CableCar, ChartBarStacked, Package, Boxes, User, FileText,
    Wallet, BarChart3, Building2, GitBranch
} from "lucide-react";

const map = {
    LayoutDashboard, CableCar, ChartBarStacked, Package, Boxes, User, FileText,
    Wallet, BarChart3, Building2, GitBranch
};

export function getIconByName(name){
    return map[name] || null;
}
