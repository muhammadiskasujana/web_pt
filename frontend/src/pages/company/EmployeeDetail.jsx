// import { useEffect, useState } from "react";
// import { Link, useNavigate, useParams } from "react-router-dom";
// import axios from "../../config/axios";
// import { HeaderBack, btnGhost, Th, inputBase } from "../produk/_ui";
// import { Edit, Trash2, UserPlus, ImageOff } from "lucide-react";
//
// export default function EmployeeDetail() {
//     const { id } = useParams();
//     const nav = useNavigate();
//     const [e, setE] = useState(null);
//     const [loading, setLoading] = useState(true);
//
//     const [showUserForm, setShowUserForm] = useState(false);
//     const [userForm, setUserForm] = useState({ email:"", password:"", role:"user", name:"" });
//
//     const load = async ()=>{
//         setLoading(true);
//         try {
//             const { data } = await axios.get(`/api/employees/${id}`);
//             const emp = data?.employee ?? null;
//             setE(emp);
//             setUserForm((f)=>({ ...f, name: emp?.full_name || "" }));
//         } finally { setLoading(false); }
//     };
//
//     useEffect(()=>{ load(); }, [id]);
//
//     const del = async ()=>{
//         if(!confirm("Hapus karyawan ini?")) return;
//         await axios.delete(`/api/employees/${id}`);
//         nav("/employees");
//     };
//
//     const removePhoto = async ()=>{
//         if(!confirm("Hapus foto karyawan?")) return;
//         await axios.delete(`/api/employees/${id}/photo`);
//         await load();
//     };
//
//     const createUser = async (e2)=>{
//         e2.preventDefault();
//         await axios.post(`/api/employees/${id}/create-user`, userForm);
//         setShowUserForm(false);
//         await load();
//     };
//
//     if (loading) return <div>Memuat...</div>;
//     if (!e) return <div>Tidak ditemukan</div>;
//
//     return (
//         <div className="space-y-4">
//             <HeaderBack
//                 title="Detail Karyawan"
//                 onBack={()=>nav("/employees")}
//                 extra={
//                     <div className="flex gap-2">
//                         <Link className={btnGhost} to={`/employees/${id}/edit`}><Edit className="h-4 w-4" /> Edit</Link>
//                         <button className={btnGhost} onClick={del}><Trash2 className="h-4 w-4" /> Hapus</button>
//                     </div>
//                 }
//             />
//
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                 <div className="md:col-span-2 space-y-3">
//                     <Info label="Nama" value={e.full_name || "-"} />
//                     <Info label="Kode" value={e.code || "-"} />
//                     <Info label="Email" value={e.email || "-"} />
//                     <Info label="Telepon" value={e.phone || "-"} />
//                     <Info label="Posisi" value={e.position || "-"} />
//                     <Info label="Cabang" value={e.branch ? (e.branch.code ? `${e.branch.code} — `:"") + e.branch.name : "-"} />
//                     <Info label="Alamat" value={e.address || "-"} />
//                     <Info label="User Terhubung" value={e.user_id ? `Ya (${e.email})` : "Belum"} />
//                     {!e.user_id && (
//                         <div className="border border-slate-200 rounded-xl p-3">
//                             {showUserForm ? (
//                                 <form onSubmit={createUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//                                     <input className={inputBase} placeholder="Nama" value={userForm.name} onChange={(ev)=>setUserForm(f=>({...f, name: ev.target.value}))}/>
//                                     <input className={inputBase} placeholder="Email" value={userForm.email} onChange={(ev)=>setUserForm(f=>({...f, email: ev.target.value}))}/>
//                                     <input className={inputBase} placeholder="Password" type="password" value={userForm.password} onChange={(ev)=>setUserForm(f=>({...f, password: ev.target.value}))}/>
//                                     <select className={inputBase} value={userForm.role} onChange={(ev)=>setUserForm(f=>({...f, role: ev.target.value}))}>
//                                         <option value="user">User</option>
//                                         <option value="manager">Manager</option>
//                                         <option value="admin">Admin</option>
//                                         <option value="owner">Owner</option>
//                                     </select>
//                                     <div className="flex gap-2">
//                                         <button className={btnGhost}><UserPlus className="h-4 w-4" /> Buat Akun</button>
//                                         <button type="button" className={btnGhost} onClick={()=>setShowUserForm(false)}>Batal</button>
//                                     </div>
//                                 </form>
//                             ) : (
//                                 <button className={btnGhost} onClick={()=>setShowUserForm(true)}><UserPlus className="h-4 w-4" /> Buat Akun User</button>
//                             )}
//                         </div>
//                     )}
//                 </div>
//
//                 <div className="space-y-3">
//                     <div className="border border-slate-200 rounded-xl p-4">
//                         {e.photo_url ? (
//                             <div className="space-y-2">
//                                 <img src={e.photo_url} className="w-full max-h-64 object-cover rounded-lg border border-slate-200" />
//                                 <button className={btnGhost} onClick={removePhoto}><ImageOff className="h-4 w-4" /> Hapus Foto</button>
//                             </div>
//                         ) : (
//                             <div className="text-sm text-slate-500">Belum ada foto.</div>
//                         )}
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// }
//
// function Info({ label, value }) {
//     return (
//         <div className="border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
//             <div className="text-sm text-slate-600">{label}</div>
//             <div className="font-medium max-w-[60%] text-right truncate" title={String(value)}>{String(value)}</div>
//         </div>
//     );
// }

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "../../config/axios";
import { HeaderBack, btnGhost, Th, inputBase } from "../produk/_ui";
import { Edit, Trash2, UserPlus, ImageOff, RefreshCw } from "lucide-react";

export default function EmployeeDetail() {
    const { id } = useParams();
    const nav = useNavigate();
    const [e, setE] = useState(null);
    const [loading, setLoading] = useState(true);

    const [showUserForm, setShowUserForm] = useState(false);
    const [userForm, setUserForm] = useState({ email:"", password:"", role:"user", name:"" });

    const [resetLoading, setResetLoading] = useState(false);
    const [activeLoading, setActiveLoading] = useState(false); // NEW

    const load = async ()=>{
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/employees/${id}`);
            const emp = data?.employee ?? null;
            setE(emp);
            setUserForm((f)=>({ ...f, name: emp?.full_name || "" }));
        } finally { setLoading(false); }
    };

    useEffect(()=>{ load(); }, [id]);

    const del = async ()=>{
        if(!confirm("Hapus karyawan ini?")) return;
        await axios.delete(`/api/employees/${id}`);
        nav("/employees");
    };

    const removePhoto = async ()=>{
        if(!confirm("Hapus foto karyawan?")) return;
        await axios.delete(`/api/employees/${id}/photo`);
        await load();
    };

    const createUser = async (e2)=>{
        e2.preventDefault();
        await axios.post(`/api/employees/${id}/create-user`, userForm);
        setShowUserForm(false);
        await load();
    };

    const resetDevice = async () => {
        if (!e?.user_id) return;
        const confirmMsg = `Reset device ID untuk user ${e.email || '(tanpa email)'}?\nPengguna perlu login ulang di perangkat berikutnya.`;
        if (!confirm(confirmMsg)) return;

        setResetLoading(true);
        try {
            await axios.put(`/api/users/${e.user_id}/reset-device`);
            alert("Device ID berhasil direset.");
            await load();
        } catch (err) {
            const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Gagal reset device";
            alert(msg);
        } finally {
            setResetLoading(false);
        }
    };


    if (loading) return <div>Memuat...</div>;
    if (!e) return <div>Tidak ditemukan</div>;

    // Helpers format
    const fmtIDR = (v) => (v == null || v === "") ? "-" : `Rp ${Number(v).toLocaleString("id-ID")}`;
    const payCycleText = (pc) => pc === "monthly" ? "Bulanan" : pc === "weekly" ? "Mingguan" : pc === "daily" ? "Harian" : (pc || "-");
    const n = (x) => Number(x ?? 0);
    const takeHome = n(e.base_salary) + n(e.allowance) - n(e.deduction);

    // NEW: toggle aktif/nonaktif
    const toggleActive = async () => {
        if (!e) return;
        const target = !e.is_active;
        const ok = confirm(`${target ? 'Aktifkan' : 'Nonaktifkan'} karyawan ini?`);
        if (!ok) return;

        setActiveLoading(true);
        try {
            // Kamu bisa pakai salah satu:
            // 1) endpoint umum dgn body:
            await axios.put(`/api/employees/${e.id}/active`, { is_active: target });
            // 2) atau endpoint spesifik tanpa body:
            // await axios.put(`/api/employees/${e.id}/${target ? 'activate' : 'deactivate'}`);
            await load();
        } catch (err) {
            const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Gagal mengubah status";
            alert(msg);
        } finally {
            setActiveLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <HeaderBack
                title="Detail Karyawan"
                onBack={()=>nav("/employees")}
                extra={
                    <div className="flex gap-2">
                        <Link className={btnGhost} to={`/employees/${id}/edit`}><Edit className="h-4 w-4" /> Edit</Link>
                        <button className={btnGhost} onClick={del}><Trash2 className="h-4 w-4" /> Hapus</button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-3">
                    <Info label="Nama" value={e.full_name || "-"} />
                    <Info label="Kode" value={e.code || "-"} />
                    <Info label="Email" value={e.email || "-"} />
                    <Info label="Telepon" value={e.phone || "-"} />
                    <Info label="Posisi" value={e.position || "-"} />
                    <Info label="Cabang" value={e.branch ? (e.branch.code ? `${e.branch.code} — `:"") + e.branch.name : "-"} />
                    <Info label="Alamat" value={e.address || "-"} />

                    {/* === Kompensasi === */}
                    <div className="border border-slate-200 rounded-xl px-4 py-3 space-y-3">
                        <div className="text-sm font-semibold text-slate-700">Kompensasi</div>
                        {/* === Status Aktif === */}
                        <div className="border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
                            <div>
                                <div className="text-sm text-slate-600">Status</div>
                                <div className="font-medium">{e.is_active ? 'Aktif' : 'Nonaktif'}</div>
                            </div>
                            <button
                                className={btnGhost}
                                onClick={toggleActive}
                                disabled={activeLoading}
                                title="Ubah status karyawan"
                            >
                                {activeLoading ? 'Menyimpan...' : (e.is_active ? 'Nonaktifkan' : 'Aktifkan')}
                            </button>
                        </div>
                        {/*<Info label="Status" value={e.is_active ? "Aktif" : "Nonaktif"} />*/}
                        <Info label="Siklus Gaji" value={payCycleText(e.pay_cycle)} />
                        <Info label="Gaji Pokok" value={fmtIDR(e.base_salary)} />
                        <Info label="Tunjangan" value={fmtIDR(e.allowance)} />
                        <Info label="Potongan" value={fmtIDR(e.deduction)} />
                        <Info label="Take Home Pay" value={fmtIDR(takeHome)} />
                    </div>

                    {/* User Terhubung + Reset Device */}
                    <div className="border border-slate-200 rounded-xl px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex-1">
                                <div className="text-sm text-slate-600">User Terhubung</div>
                                <div className="font-medium">
                                    {e.user_id ? `Ya (${e.email})` : "Belum"}
                                </div>
                            </div>

                            {e.user_id && (
                                <button
                                    className={btnGhost}
                                    onClick={resetDevice}
                                    disabled={resetLoading}
                                    title="Reset device id akun user (paksa logout perangkat)"
                                >
                                    <RefreshCw className={`h-4 w-4 ${resetLoading ? 'animate-spin' : ''}`} />
                                    <span className="ml-1">{resetLoading ? 'Mereset...' : 'Reset Device'}</span>
                                </button>
                            )}
                        </div>

                        {!e.user_id && (
                            <div className="mt-3 border-t border-slate-200 pt-3">
                                {showUserForm ? (
                                    <form onSubmit={createUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <input className={inputBase} placeholder="Nama" value={userForm.name} onChange={(ev)=>setUserForm(f=>({...f, name: ev.target.value}))}/>
                                        <input className={inputBase} placeholder="Email" value={userForm.email} onChange={(ev)=>setUserForm(f=>({...f, email: ev.target.value}))}/>
                                        <input className={inputBase} placeholder="Password" type="password" value={userForm.password} onChange={(ev)=>setUserForm(f=>({...f, password: ev.target.value}))}/>
                                        <select className={inputBase} value={userForm.role} onChange={(ev)=>setUserForm(f=>({...f, role: ev.target.value}))}>
                                            <option value="user">User</option>
                                            <option value="manager">Manager</option>
                                            <option value="admin">Admin</option>
                                            <option value="owner">Owner</option>
                                        </select>
                                        <div className="flex gap-2">
                                            <button className={btnGhost}><UserPlus className="h-4 w-4" /> Buat Akun</button>
                                            <button type="button" className={btnGhost} onClick={()=>setShowUserForm(false)}>Batal</button>
                                        </div>
                                    </form>
                                ) : (
                                    <button className={btnGhost} onClick={()=>setShowUserForm(true)}><UserPlus className="h-4 w-4" /> Buat Akun User</button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="border border-slate-200 rounded-xl p-4">
                        {e.photo_url ? (
                            <div className="space-y-2">
                                <img src={e.photo_url} className="w-full max-h-64 object-cover rounded-lg border border-slate-200" />
                                <button className={btnGhost} onClick={removePhoto}><ImageOff className="h-4 w-4" /> Hapus Foto</button>
                            </div>
                        ) : (
                            <div className="text-sm text-slate-500">Belum ada foto.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Info({ label, value }) {
    return (
        <div className="border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-slate-600">{label}</div>
            <div className="font-medium max-w-[60%] text-right truncate" title={String(value)}>{String(value)}</div>
        </div>
    );
}

