import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../../config/axios";
import { HeaderBack, inputBase, btnPrimary, btnGhost } from "../produk/_ui";
import { Save, X } from "lucide-react";

export default function EmployeeForm({ mode="create" }) {
    const nav = useNavigate();
    const { id } = useParams();
    const isCreate = mode === "create";

    const [branches, setBranches] = useState([]);
    const [loadingBranches, setLoadingBranches] = useState(true);

    const [initial, setInitial] = useState({
        code:"", full_name:"", email:"", phone:"", position:"",
        branch_id:null, address:"",
        base_salary:"", allowance:"", deduction:"", pay_cycle:"monthly",
    });
    const [loading, setLoading] = useState(!isCreate);
    const [photo, setPhoto] = useState(null);

    // fetch branches sekali
    useEffect(()=>{
        (async ()=>{
            try {
                const { data } = await axios.get("/api/branches");
                setBranches(Array.isArray(data?.branches) ? data.branches : []);
            } finally { setLoadingBranches(false); }
        })();
    },[]);

    // fetch employee saat edit
    useEffect(()=>{
        (async ()=>{
            if (!isCreate) {
                try {
                    const { data } = await axios.get(`/api/employees/${id}`);
                    const e = data?.employee ?? {};
                    setInitial({
                        code: e.code || "",
                        full_name: e.full_name || "",
                        email: e.email || "",
                        phone: e.phone || "",
                        position: e.position || "",
                        branch_id: e.branch_id || null,
                        address: e.address || "",
                        base_salary: e.base_salary != null ? String(e.base_salary) : "",
                        allowance:   e.allowance   != null ? String(e.allowance)   : "",
                        deduction:   e.deduction   != null ? String(e.deduction)   : "",
                        pay_cycle:   e.pay_cycle   || "monthly",
                    });
                } finally { setLoading(false); }
            } else {
                setLoading(false);
            }
        })();
    }, [id, isCreate]);

    const [form, setForm] = useState(initial);
    useEffect(()=>{ setForm(initial); }, [initial]);

    const submit = async (e) => {
        e.preventDefault();
        if (isCreate) {
            const fd = new FormData();
            // kirim hanya field yang perlu, kosong → skip agar backend pakai default/auto-gen
            Object.entries(form).forEach(([k, v]) => {
                if (k === 'branch_id' && (!v || String(v).trim?.() === '')) return;
                if (k === 'code' && (!v || String(v).trim?.() === '')) return;
                fd.append(k, v ?? '');
            });
            if (photo) fd.append('photo', photo);
            await axios.post('/api/employees', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        } else {
            const payload = { ...form };
            if (!payload.branch_id || String(payload.branch_id).trim() === '') delete payload.branch_id;
            if (!payload.code || String(payload.code).trim() === '') delete payload.code;
            await axios.put(`/api/employees/${id}`, payload);

            if (photo) {
                const fd = new FormData();
                fd.append("photo", photo);
                await axios.put(`/api/employees/${id}`, fd, { headers: { "Content-Type":"multipart/form-data" } });
            }
        }
        nav("/employees");
    };

    if (loading) return <div>Memuat...</div>;

    return (
        <div className="space-y-4">
            <HeaderBack title={isCreate ? "Tambah Karyawan" : "Edit Karyawan"} onBack={()=>nav("/employees")} />
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                    <label className="block">
                        <span className="block text-sm font-medium mb-1">Kode (opsional)</span>
                        <input
                            className={inputBase}
                            placeholder="Auto jika kosong"
                            value={form.code}
                            onChange={(e)=>setForm(f=>({...f, code:e.target.value}))}
                        />
                    </label>

                    <label className="block">
                        <span className="block text-sm font-medium mb-1">Nama Lengkap</span>
                        <input className={inputBase} value={form.full_name} onChange={(e)=>setForm(f=>({...f,full_name:e.target.value}))} />
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                            <span className="block text-sm font-medium mb-1">Email</span>
                            <input className={inputBase} value={form.email} onChange={(e)=>setForm(f=>({...f,email:e.target.value}))} />
                        </label>
                        <label className="block">
                            <span className="block text-sm font-medium mb-1">Telepon</span>
                            <input className={inputBase} value={form.phone} onChange={(e)=>setForm(f=>({...f,phone:e.target.value}))} />
                        </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                            <span className="block text-sm font-medium mb-1">Posisi</span>
                            <input className={inputBase} value={form.position} onChange={(e)=>setForm(f=>({...f,position:e.target.value}))} />
                        </label>

                        {/* Dropdown Cabang */}
                        <label className="block">
                            <span className="block text-sm font-medium mb-1">Cabang</span>
                            <select
                                className={inputBase}
                                value={form.branch_id || ""}
                                onChange={(e)=>{
                                    const val = e.target.value.trim();
                                    setForm(f => ({ ...f, branch_id: val ? val : null }));
                                }}
                                disabled={loadingBranches}
                            >
                                <option value="">— Pilih Cabang —</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <label className="block">
                        <span className="block text-sm font-medium mb-1">Alamat</span>
                        <input className={inputBase} value={form.address} onChange={(e)=>setForm(f=>({...f,address:e.target.value}))} />
                    </label>

                    {/* ====== Gaji & Lain-lain ====== */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className="block">
                            <span className="block text-sm font-medium mb-1">Gaji Pokok</span>
                            <input type="number" min="0" className={inputBase}
                                   value={form.base_salary}
                                   onChange={(e)=>setForm(f=>({...f, base_salary:e.target.value}))} />
                        </label>
                        <label className="block">
                            <span className="block text-sm font-medium mb-1">Tunjangan</span>
                            <input type="number" min="0" className={inputBase}
                                   value={form.allowance}
                                   onChange={(e)=>setForm(f=>({...f, allowance:e.target.value}))} />
                        </label>
                        <label className="block">
                            <span className="block text-sm font-medium mb-1">Potongan</span>
                            <input type="number" min="0" className={inputBase}
                                   value={form.deduction}
                                   onChange={(e)=>setForm(f=>({...f, deduction:e.target.value}))} />
                        </label>
                    </div>

                    <label className="block">
                        <span className="block text-sm font-medium mb-1">Siklus Gaji</span>
                        <select
                            className={inputBase}
                            value={form.pay_cycle}
                            onChange={(e)=>setForm(f=>({...f, pay_cycle:e.target.value}))}
                        >
                            <option value="monthly">Bulanan</option>
                            <option value="weekly">Mingguan</option>
                            <option value="daily">Harian</option>
                        </select>
                    </label>

                    <div className="flex gap-2">
                        <button className={btnPrimary}><Save className="h-4 w-4" /> Simpan</button>
                        <button type="button" className={btnGhost} onClick={()=>nav("/employees")}>Batal</button>
                    </div>
                </div>

                <div className="space-y-3">
                    <span className="block text-sm font-medium mb-1">Foto</span>
                    <div className="border border-slate-200 rounded-xl p-4">
                        <input type="file" accept="image/*" onChange={(e)=>setPhoto(e.target.files?.[0]||null)} />
                        {photo && (
                            <div className="mt-3 relative inline-block">
                                <img src={URL.createObjectURL(photo)} className="h-28 w-28 object-cover rounded-lg border border-slate-200" />
                                <button type="button" className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-full p-1" onClick={()=>setPhoto(null)}>
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
}
