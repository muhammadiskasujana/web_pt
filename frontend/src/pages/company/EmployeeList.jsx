import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "../../config/axios";
import { HeaderBack, Th, btnPrimary, btnGhost, inputBase } from "../produk/_ui";
import { Plus, Edit, Trash2, Image as ImgIcon } from "lucide-react";

export default function EmployeeList() {
    const nav = useNavigate();
    const [rows, setRows] = useState([]);
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/employees");
            const list = data?.employees ?? [];
            setRows(
                q
                    ? list.filter((e) =>
                        [e.full_name, e.email, e.phone, e.position]
                            .filter(Boolean)
                            .some((t) => String(t).toLowerCase().includes(q.toLowerCase()))
                    )
                    : list
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
    const onSearch = (e) => { e.preventDefault(); load(); };

    const del = async (id) => {
        if (!confirm("Hapus karyawan ini?")) return;
        await axios.delete(`/api/employees/${id}`);
        await load();
    };

    return (
        <div className="space-y-4">
            <HeaderBack title="Karyawan" />
            <form onSubmit={onSearch} className="flex gap-2">
                <input className={inputBase} placeholder="Cari nama/email/telepon/posisi" value={q} onChange={(e)=>setQ(e.target.value)} />
                <button className={btnGhost}>Terapkan</button>
                <button type="button" className={btnPrimary} onClick={()=>nav("/employees/new")}><Plus className="h-4 w-4" /> Karyawan Baru</button>
            </form>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-slate-50">
                        <Th>Foto</Th><Th>Kode</Th><Th>Nama</Th><Th>Email</Th><Th>Telepon</Th><Th>Posisi</Th><Th>Cabang</Th>
                        <Th className="text-right pr-4">Aksi</Th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr><td colSpan={7} className="p-6 text-center">Memuat...</td></tr>
                    ) : rows.length === 0 ? (
                        <tr><td colSpan={7} className="p-6 text-center">Belum ada data</td></tr>
                    ) : rows.map((e)=>(
                        <tr key={e.id} className="border-t border-slate-200">
                            <td className="p-3">
                                {e.photo_url ? (
                                    <img src={e.photo_url} className="h-10 w-10 rounded-lg object-cover border border-slate-200" />
                                ) : (
                                    <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                                        <ImgIcon className="h-5 w-5" />
                                    </div>
                                )}
                            </td>
                            <td className="p-3">{e.code || "-"}</td>
                            <td className="p-3">
                                <Link to={`/employees/${e.id}`} className="font-medium hover:underline">{e.full_name || e.name || "-"}</Link>
                            </td>
                            <td className="p-3">{e.email || "-"}</td>
                            <td className="p-3">{e.phone || "-"}</td>
                            <td className="p-3">{e.position || "-"}</td>
                            <td className="p-3">{e.branch ? (e.branch.code ? `${e.branch.code} — `:"") + e.branch.name : "-"}</td>
                            <td className="p-3 text-right pr-4 flex justify-end gap-2">
                                <Link className={btnGhost} to={`/employees/${e.id}/edit`}><Edit className="h-4 w-4" /> Edit</Link>
                                <button className={btnGhost} onClick={()=>del(e.id)}><Trash2 className="h-4 w-4" /> Hapus</button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
