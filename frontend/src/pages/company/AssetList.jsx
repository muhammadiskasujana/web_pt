// import { useEffect, useState } from "react";
// import axios from "../../config/axios";
// import { HeaderBack, inputBase, btnPrimary, btnGhost, Th } from "../produk/_ui";
// import { Plus, Edit, Trash2 } from "lucide-react";
// import { Link, useNavigate } from "react-router-dom";
//
// export default function AssetList() {
//     const nav = useNavigate();
//     const [rows, setRows] = useState([]);
//     const [branch, setBranch] = useState("");
//     const [loading, setLoading] = useState(false);
//
//     const load = async ()=>{
//         setLoading(true);
//         try{
//             const { data } = await axios.get("/api/assets", { params:{ branch_id: branch || undefined } });
//             setRows(data?.assets ?? []);
//         } finally { setLoading(false); }
//     };
//     useEffect(()=>{ load(); }, []);
//     const search = async (e)=>{ e.preventDefault(); await load(); };
//
//     const del = async (id)=>{
//         if(!confirm("Hapus aset ini?")) return;
//         await axios.delete(`/api/assets/${id}`);
//         await load();
//     };
//
//     return (
//         <div className="space-y-4">
//             <HeaderBack title="Aset Inventaris" />
//             <form onSubmit={search} className="flex gap-2">
//                 <input className={inputBase} placeholder="Filter Branch ID (opsional)" value={branch} onChange={(e)=>setBranch(e.target.value)} />
//                 <button className={btnGhost}>Terapkan</button>
//                 <button type="button" className={btnPrimary} onClick={()=>nav("/assets/new")}><Plus className="h-4 w-4"/> Aset Baru</button>
//             </form>
//
//             <div className="overflow-x-auto border border-slate-200 rounded-xl">
//                 <table className="w-full text-sm">
//                     <thead>
//                     <tr className="bg-slate-50">
//                         <Th>Nama</Th><Th>Cabang</Th><Th>Metode</Th><Th>Biaya Perolehan</Th><Th>Nilai Sisa</Th><Th>Umur (bulan)</Th>
//                         <Th className="text-right pr-4">Aksi</Th>
//                     </tr>
//                     </thead>
//                     <tbody>
//                     {loading ? (
//                         <tr><td colSpan={7} className="p-6 text-center">Memuat...</td></tr>
//                     ) : rows.length===0 ? (
//                         <tr><td colSpan={7} className="p-6 text-center">Belum ada data</td></tr>
//                     ) : rows.map((a)=>(
//                         <tr key={a.id} className="border-t border-slate-200">
//                             <td className="p-3"><Link to={`/assets/${a.id}`} className="hover:underline">{a.name}</Link></td>
//                             <td className="p-3">{a.branch_id || "-"}</td>
//                             <td className="p-3">{a.method}</td>
//                             <td className="p-3">{Number(a.acquisition_cost||0).toLocaleString("id-ID")}</td>
//                             <td className="p-3">{Number(a.salvage_value||0).toLocaleString("id-ID")}</td>
//                             <td className="p-3">{a.useful_life_months}</td>
//                             <td className="p-3 text-right pr-4 flex justify-end gap-2">
//                                 <button className={btnGhost} onClick={()=>nav(`/assets/${a.id}/edit`)}><Edit className="h-4 w-4"/> Edit</button>
//                                 <button className={btnGhost} onClick={()=>del(a.id)}><Trash2 className="h-4 w-4"/> Hapus</button>
//                             </td>
//                         </tr>
//                     ))}
//                     </tbody>
//                 </table>
//             </div>
//         </div>
//     );
// }

import { useEffect, useMemo, useState } from "react";
import axios from "../../config/axios";
import { HeaderBack, inputBase, btnPrimary, btnGhost, Th } from "../produk/_ui";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function AssetList() {
    const nav = useNavigate();
    const [rows, setRows] = useState([]);
    const [branches, setBranches] = useState([]);
    const [branchId, setBranchId] = useState(""); // "" = semua cabang
    const [loading, setLoading] = useState(false);
    const [loadingBranches, setLoadingBranches] = useState(true);

    // Map id->branch object (untuk render nama cabang)
    const branchMap = useMemo(() => {
        const m = new Map();
        for (const b of branches) m.set(b.id, b);
        return m;
    }, [branches]);

    const loadBranches = async () => {
        setLoadingBranches(true);
        try {
            const { data } = await axios.get("/api/branches");
            setBranches(Array.isArray(data?.branches) ? data.branches : []);
        } finally {
            setLoadingBranches(false);
        }
    };

    const loadAssets = async () => {
        setLoading(true);
        try {
            const params = {};
            if (branchId && branchId.trim()) params.branch_id = branchId.trim(); // kirim hanya jika dipilih
            const { data } = await axios.get("/api/assets", { params });
            setRows(data?.assets ?? []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadBranches(); }, []);
    useEffect(() => { loadAssets(); }, []); // initial load

    const search = async (e) => {
        e.preventDefault();
        await loadAssets();
    };

    const clearFilter = async () => {
        setBranchId("");
        await loadAssets();
    };

    const del = async (id) => {
        if (!confirm("Hapus aset ini?")) return;
        await axios.delete(`/api/assets/${id}`);
        await loadAssets();
    };

    const renderBranch = (id) => {
        if (!id) return "-";
        const b = branchMap.get(id);
        return b ? `${b.name} (${b.code})` : id; // fallback UUID jika belum ke-load
    };

    return (
        <div className="space-y-4">
            <HeaderBack title="Aset Inventaris" />
            <form onSubmit={search} className="flex flex-wrap gap-2 items-center">
                {/* Dropdown cabang */}
                <select
                    className={inputBase}
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    disabled={loadingBranches}
                >
                    <option value="">— Semua Cabang —</option>
                    {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                </select>

                <button className={btnGhost} type="submit">Terapkan</button>
                <button className={btnGhost} type="button" onClick={clearFilter}>Reset</button>
                <button type="button" className={btnPrimary} onClick={() => nav("/assets/new")}>
                    <Plus className="h-4 w-4" /> Aset Baru
                </button>
            </form>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-slate-50">
                        <Th>Nama</Th>
                        <Th>Cabang</Th>
                        <Th>Metode</Th>
                        <Th>Biaya Perolehan</Th>
                        <Th>Nilai Sisa</Th>
                        <Th>Umur (bulan)</Th>
                        <Th className="text-right pr-4">Aksi</Th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr><td colSpan={7} className="p-6 text-center">Memuat...</td></tr>
                    ) : rows.length === 0 ? (
                        <tr><td colSpan={7} className="p-6 text-center">Belum ada data</td></tr>
                    ) : rows.map((a) => (
                        <tr key={a.id} className="border-t border-slate-200">
                            <td className="p-3">
                                <Link to={`/assets/${a.id}`} className="hover:underline">{a.name}</Link>
                            </td>
                            <td className="p-3">{renderBranch(a.branch_id)}</td>
                            <td className="p-3">{a.method}</td>
                            <td className="p-3">{Number(a.acquisition_cost || 0).toLocaleString("id-ID")}</td>
                            <td className="p-3">{Number(a.salvage_value || 0).toLocaleString("id-ID")}</td>
                            <td className="p-3">{a.useful_life_months}</td>
                            <td className="p-3 text-right pr-4 flex justify-end gap-2">
                                <button className={btnGhost} onClick={() => nav(`/assets/${a.id}/edit`)}>
                                    <Edit className="h-4 w-4" /> Edit
                                </button>
                                <button className={btnGhost} onClick={() => del(a.id)}>
                                    <Trash2 className="h-4 w-4" /> Hapus
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

