// import { useEffect, useState } from "react";
// import axios from "../../config/axios";
// import { HeaderBack, inputBase, btnPrimary, btnGhost } from "../produk/_ui";
// import { Save } from "lucide-react";
// import { useNavigate, useParams } from "react-router-dom";
//
// export default function AssetForm({ mode="create" }) {
//     const nav = useNavigate();
//     const { id } = useParams();
//     const isCreate = mode === "create";
//     const [initial, setInitial] = useState({
//         name:"", branch_id:"", method:"straight_line",
//         acquisition_cost:"", salvage_value:"0", useful_life_months:"12",
//         acquisition_date: new Date().toISOString().slice(0,10)
//     });
//     const [loading, setLoading] = useState(!isCreate);
//
//     useEffect(()=> {
//         (async ()=>{
//             if (!isCreate) {
//                 try {
//                     const { data } = await axios.get(`/api/assets/${id}`);
//                     const a = data?.asset ?? {};
//                     setInitial({
//                         name: a.name||"",
//                         branch_id: a.branch_id||"",
//                         method: a.method||"straight_line",
//                         acquisition_cost: String(a.acquisition_cost ?? ""),
//                         salvage_value: String(a.salvage_value ?? "0"),
//                         useful_life_months: String(a.useful_life_months ?? "12"),
//                         acquisition_date: (a.acquisition_date || "").slice(0,10) || new Date().toISOString().slice(0,10),
//                     });
//                 } finally { setLoading(false); }
//             }
//         })();
//     }, [id, isCreate]);
//
//     const [form, setForm] = useState(initial);
//     useEffect(()=>{ setForm(initial); }, [initial]);
//
//     // const submit = async (e)=>{
//     //     e.preventDefault();
//     //     const payload = {
//     //         ...form,
//     //         acquisition_cost: Number(form.acquisition_cost||0),
//     //         salvage_value: Number(form.salvage_value||0),
//     //         useful_life_months: Number(form.useful_life_months||0),
//     //     };
//     //     if (isCreate) await axios.post("/api/assets", payload);
//     //     else await axios.put(`/api/assets/${id}`, payload);
//     //     nav("/assets");
//     // };
//     const submit = async (e)=>{
//         e.preventDefault();
//         const payload = {
//             ...form,
//             branch_id: form.branch_id?.trim() ? form.branch_id.trim() : null, // <-- penting
//             acquisition_cost: Number(form.acquisition_cost||0),
//             salvage_value: Number(form.salvage_value||0),
//             useful_life_months: Number(form.useful_life_months||0),
//         };
//         if (isCreate) await axios.post("/api/assets", payload);
//         else await axios.put(`/api/assets/${id}`, payload);
//         nav("/assets");
//     };
//
//     if (loading) return <div>Memuat...</div>;
//
//     return (
//         <div className="space-y-4">
//             <HeaderBack title={isCreate ? "Tambah Aset" : "Edit Aset"} onBack={()=>nav("/assets")} />
//             <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div className="space-y-4">
//                     <label className="block">
//                         <span className="block text-sm font-medium mb-1">Nama Aset</span>
//                         <input className={inputBase} value={form.name} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))}/>
//                     </label>
//                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//                         <label className="block">
//                             <span className="block text-sm font-medium mb-1">Cabang (ID)</span>
//                             <input className={inputBase} value={form.branch_id} onChange={(e)=>setForm(f=>({...f,branch_id:e.target.value}))}/>
//                         </label>
//                         <label className="block">
//                             <span className="block text-sm font-medium mb-1">Metode</span>
//                             <select className={inputBase} value={form.method} onChange={(e)=>setForm(f=>({...f,method:e.target.value}))}>
//                                 <option value="straight_line">Straight Line</option>
//                                 <option value="declining_balance">Declining Balance</option>
//                             </select>
//                         </label>
//                     </div>
//
//                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
//                         <label className="block">
//                             <span className="block text-sm font-medium mb-1">Biaya Perolehan</span>
//                             <input type="number" min="0" className={inputBase} value={form.acquisition_cost} onChange={(e)=>setForm(f=>({...f,acquisition_cost:e.target.value}))}/>
//                         </label>
//                         <label className="block">
//                             <span className="block text-sm font-medium mb-1">Nilai Sisa</span>
//                             <input type="number" min="0" className={inputBase} value={form.salvage_value} onChange={(e)=>setForm(f=>({...f,salvage_value:e.target.value}))}/>
//                         </label>
//                         <label className="block">
//                             <span className="block text-sm font-medium mb-1">Umur (bulan)</span>
//                             <input type="number" min="1" className={inputBase} value={form.useful_life_months} onChange={(e)=>setForm(f=>({...f,useful_life_months:e.target.value}))}/>
//                         </label>
//                     </div>
//
//                     <label className="block">
//                         <span className="block text-sm font-medium mb-1">Tanggal Perolehan</span>
//                         <input type="date" className={inputBase} value={form.acquisition_date} onChange={(e)=>setForm(f=>({...f,acquisition_date:e.target.value}))}/>
//                     </label>
//
//                     <div className="flex gap-2">
//                         <button className={btnPrimary}><Save className="h-4 w-4"/> Simpan</button>
//                         <button type="button" className={btnGhost} onClick={()=>nav("/assets")}>Batal</button>
//                     </div>
//                 </div>
//             </form>
//         </div>
//     );
// }

import { useEffect, useState } from "react";
import axios from "../../config/axios";
import { HeaderBack, inputBase, btnPrimary, btnGhost } from "../produk/_ui";
import { Save } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

export default function AssetForm({ mode="create" }) {
    const nav = useNavigate();
    const { id } = useParams();
    const isCreate = mode === "create";

    // --- state cabang
    const [branches, setBranches] = useState([]);
    const [loadingBranches, setLoadingBranches] = useState(true);

    // --- initial form
    const [initial, setInitial] = useState({
        name:"", branch_id:null, method:"straight_line",
        acquisition_cost:"", salvage_value:"0", useful_life_months:"12",
        acquisition_date: new Date().toISOString().slice(0,10)
    });
    const [loading, setLoading] = useState(!isCreate);

    // fetch branches sekali di mount
    useEffect(()=> {
        (async ()=>{
            try {
                const { data } = await axios.get("/api/branches");
                const rows = Array.isArray(data?.branches) ? data.branches : [];
                setBranches(rows);
            } finally {
                setLoadingBranches(false);
            }
        })();
    }, []);

    // fetch asset saat edit
    useEffect(()=> {
        (async ()=>{
            if (!isCreate) {
                try {
                    const { data } = await axios.get(`/api/assets/${id}`);
                    const a = data?.asset ?? {};
                    setInitial({
                        name: a.name || "",
                        branch_id: a.branch_id || null, // penting: null, bukan ""
                        method: a.method || "straight_line",
                        acquisition_cost: String(a.acquisition_cost ?? ""),
                        salvage_value: String(a.salvage_value ?? "0"),
                        useful_life_months: String(a.useful_life_months ?? "12"),
                        acquisition_date: (a.acquisition_date || "").slice(0,10) || new Date().toISOString().slice(0,10),
                    });
                } finally { setLoading(false); }
            } else {
                setLoading(false);
            }
        })();
    }, [id, isCreate]);

    const [form, setForm] = useState(initial);
    useEffect(()=>{ setForm(initial); }, [initial]);

    const submit = async (e)=>{
        e.preventDefault();
        const payload = {
            ...form,
            // pastikan uuid valid atau null, jangan ""
            branch_id: form.branch_id ? String(form.branch_id).trim() : null,
            acquisition_cost: Number(form.acquisition_cost||0),
            salvage_value: Number(form.salvage_value||0),
            useful_life_months: Number(form.useful_life_months||0),
        };
        if (isCreate) await axios.post("/api/assets", payload);
        else await axios.put(`/api/assets/${id}`, payload);
        nav("/assets");
    };

    if (loading) return <div>Memuat...</div>;

    return (
        <div className="space-y-4">
            <HeaderBack title={isCreate ? "Tambah Aset" : "Edit Aset"} onBack={()=>nav("/assets")} />
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                    <label className="block">
                        <span className="block text-sm font-medium mb-1">Nama Aset</span>
                        <input className={inputBase} value={form.name}
                               onChange={(e)=>setForm(f=>({...f,name:e.target.value}))}/>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Ganti input teks → select cabang */}
                        <label className="block">
                            <span className="block text-sm font-medium mb-1">Cabang</span>
                            <select
                                className={inputBase}
                                value={form.branch_id || ""} // "" agar placeholder muncul, tapi saat submit dikonversi ke null
                                onChange={(e)=>{
                                    const val = e.target.value.trim();
                                    setForm(f => ({ ...f, branch_id: val ? val : null }));
                                }}
                                disabled={loadingBranches}
                            >
                                <option value="">— Pilih Cabang —</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>
                                        {b.name} ({b.code})
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="block">
                            <span className="block text-sm font-medium mb-1">Metode</span>
                            <select className={inputBase} value={form.method}
                                    onChange={(e)=>setForm(f=>({...f,method:e.target.value}))}>
                                <option value="straight_line">Straight Line</option>
                                <option value="declining_balance">Declining Balance</option>
                            </select>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className="block">
                            <span className="block text-sm font-medium mb-1">Biaya Perolehan</span>
                            <input type="number" min="0" className={inputBase}
                                   value={form.acquisition_cost}
                                   onChange={(e)=>setForm(f=>({...f,acquisition_cost:e.target.value}))}/>
                        </label>
                        <label className="block">
                            <span className="block text-sm font-medium mb-1">Nilai Sisa</span>
                            <input type="number" min="0" className={inputBase}
                                   value={form.salvage_value}
                                   onChange={(e)=>setForm(f=>({...f,salvage_value:e.target.value}))}/>
                        </label>
                        <label className="block">
                            <span className="block text-sm font-medium mb-1">Umur (bulan)</span>
                            <input type="number" min="1" className={inputBase}
                                   value={form.useful_life_months}
                                   onChange={(e)=>setForm(f=>({...f,useful_life_months:e.target.value}))}/>
                        </label>
                    </div>

                    <label className="block">
                        <span className="block text-sm font-medium mb-1">Tanggal Perolehan</span>
                        <input type="date" className={inputBase}
                               value={form.acquisition_date}
                               onChange={(e)=>setForm(f=>({...f,acquisition_date:e.target.value}))}/>
                    </label>

                    <div className="flex gap-2">
                        <button className={btnPrimary}><Save className="h-4 w-4"/> Simpan</button>
                        <button type="button" className={btnGhost} onClick={()=>nav("/assets")}>Batal</button>
                    </div>
                </div>
            </form>
        </div>
    );
}
