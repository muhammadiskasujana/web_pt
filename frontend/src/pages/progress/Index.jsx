import { Link } from "react-router-dom";

export default function ProgressHome() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                    to="/progress/categories"
                    className="border border-slate-900/15 rounded-2xl p-4 hover:bg-slate-50 transition"
                >
                    <div className="text-base font-semibold">Kategori & Stages</div>
                    <div className="text-sm text-slate-600">Kelola kategori progres & tahapannya.</div>
                </Link>
                <Link
                    to="/progress/assign"
                    className="border border-slate-900/15 rounded-2xl p-4 hover:bg-slate-50 transition"
                >
                    <div className="text-base font-semibold">Assign ke Produk</div>
                    <div className="text-sm text-slate-600">Hubungkan produk dengan kategori progres.</div>
                </Link>
                <Link
                    to="/progress/instances"
                    className="border border-slate-900/15 rounded-2xl p-4 hover:bg-slate-50 transition"
                >
                    <div className="text-base font-semibold">Daftar Pekerjaan</div>
                    <div className="text-sm text-slate-600">Pantau status pengerjaan per item.</div>
                </Link>
            </div>
        </div>
    );
}
