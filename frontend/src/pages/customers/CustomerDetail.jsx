import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "../../config/axios";
import { HeaderBack, btnGhost, btnPrimary, formatCurrency, inputBase } from "../produk/_ui";
import { Plus, Download } from "lucide-react";

export default function CustomerDetail(){
    const { id } = useParams();
    const nav = useNavigate();
    const [c, setC] = useState(null);
    const [tab, setTab] = useState("deposit"); // deposit | portfolio | complaints
    const [loading, setLoading] = useState(true);

    const fetchDetail = async ()=>{
        const { data } = await axios.get(`/api/customers/${id}`);
        setC(data?.customer ?? null);
    };

    useEffect(()=>{ (async()=>{ try{ await fetchDetail(); } finally{ setLoading(false); } })(); }, [id]);

    if(loading) return <div>Memuat...</div>;
    if(!c) return <div>Tidak ditemukan</div>;

    return (
        <div className="space-y-4">
            <HeaderBack
                title={`Pelanggan: ${c.name}`}
                onBack={()=>nav("/customers")}
                extra={
                    <div className="flex gap-2">
                        <Link className={btnGhost} to={`/customers/${id}/edit`}>Edit</Link>
                    </div>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                    <InfoRow label="Kode" value={c.code || "-"} />
                    <InfoRow label="Kategori" value={c.category?.name || "-"} />
                    <InfoRow label="Kontak" value={[c.phone, c.email].filter(Boolean).join(" • ") || "-"} />
                    <InfoRow label="Alamat" value={c.address || "-"} />
                    <InfoRow label="Status" value={c.is_active?"Aktif":"Non-aktif"} />
                    <InfoRow label="Catatan" value={c.note || "-"} />
                </div>
                <div className="space-y-3">
                    <DepositBalance customerId={id} />
                </div>
            </div>

            <div className="border-b border-slate-200 mt-4">
                <nav className="flex gap-3">
                    {["deposit","portfolio","complaints"].map(t=>(
                        <button key={t}
                                className={`px-3 py-2 -mb-px border-b-2 ${tab===t ? "border-sky-600 text-sky-700":"border-transparent text-slate-600"}`}
                                onClick={()=>setTab(t)}
                        >
                            {t==="deposit"?"Deposit": t==="portfolio"?"Portfolio":"Komplain"}
                        </button>
                    ))}
                </nav>
            </div>

            {tab==="deposit" && <DepositTab customerId={id} />}
            {tab==="portfolio" && <PortfolioTab customerId={id} />}
            {tab==="complaints" && <ComplaintsTab customerId={id} />}
        </div>
    );
}

function InfoRow({label, value}){
    return (
        <div className="flex items-center justify-between border border-slate-900/10 rounded-xl px-4 py-3">
            <div className="text-sm text-slate-600">{label}</div>
            <div className="font-medium max-w-[60%] text-right truncate" title={String(value)}>{value}</div>
        </div>
    );
}

/* ----- Deposit Balance quick card ----- */
function DepositBalance({ customerId }){
    const [bal, setBal] = useState({ balance:0, credit:0, debit:0 });
    const load = async ()=>{
        const { data } = await axios.get(`/api/customers/${customerId}/deposits/balance`);
        setBal(data || { balance:0, credit:0, debit:0 });
    };
    useEffect(()=>{ load(); }, [customerId]);
    return (
        <div className="border border-slate-200 rounded-xl p-3">
            <div className="text-sm text-slate-600">Saldo Deposit</div>
            <div className="text-2xl font-bold">{formatCurrency(bal.balance)}</div>
            <div className="text-xs text-slate-500">Kredit: {formatCurrency(bal.credit)} • Debet: {formatCurrency(bal.debit)}</div>
        </div>
    );
}

/* ----- Deposit Tab: list + credit/debit ----- */
function DepositTab({ customerId }){
    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState({ page:1, limit:10, total:0, pages:1 });
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ type:"credit", amount:"", description:"" });

    const fetchList = async(page=1)=>{
        setLoading(true);
        try{
            const { data } = await axios.get(`/api/customers/${customerId}/deposits`, { params:{ page, limit:10 } });
            setItems(data?.deposits ?? []);
            setMeta(data?.pagination ?? {page,limit:10,total:0,pages:1});
        } finally{ setLoading(false); }
    };
    useEffect(()=>{ fetchList(1); }, [customerId]);

    const submit = async(e)=>{
        e.preventDefault();
        const payload = { amount: Number(form.amount||0), description: form.description||"" };
        if(!payload.amount || payload.amount<=0) return;
        if(form.type==="credit"){
            await axios.post(`/api/customers/${customerId}/deposits/credit`, payload);
        }else{
            await axios.post(`/api/customers/${customerId}/deposits/debit`, payload);
        }
        setForm({ type:"credit", amount:"", description:"" });
        await fetchList(meta.page);
    };

    return (
        <div className="space-y-4">
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-5 gap-3 border border-slate-200 p-3 rounded-xl">
                <select className={inputBase} value={form.type} onChange={e=>setForm(f=>({...f, type:e.target.value}))}>
                    <option value="credit">Top Up (Credit)</option>
                    <option value="debit">Pakai/Tarik (Debit)</option>
                </select>
                <input className={inputBase} placeholder="Nominal" value={form.amount} onChange={e=>setForm(f=>({...f, amount:e.target.value}))} />
                <input className={`${inputBase} md:col-span-2`} placeholder="Keterangan" value={form.description} onChange={e=>setForm(f=>({...f, description:e.target.value}))} />
                <button className={btnPrimary}><Plus className="h-4 w-4"/> Simpan</button>
            </form>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-slate-50">
                        <th className="text-left p-3">Tanggal</th>
                        <th className="text-left p-3">Tipe</th>
                        <th className="text-left p-3">Deskripsi</th>
                        <th className="text-right p-3">Jumlah</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? <tr><td colSpan={4} className="p-4 text-center">Memuat...</td></tr> :
                        items.length===0 ? <tr><td colSpan={4} className="p-4 text-center">Belum ada transaksi</td></tr> :
                            items.map(d=>(
                                <tr key={d.id} className="border-t">
                                    <td className="p-3">{new Date(d.createdAt||d.created_at).toLocaleString("id-ID")}</td>
                                    <td className="p-3">{d.type}</td>
                                    <td className="p-3">{d.description || "-"}</td>
                                    <td className="p-3 text-right">{formatCurrency(d.amount)}</td>
                                </tr>
                            ))
                    }
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ----- Portfolio Tab (riwayat pembelian) ----- */
function PortfolioTab({ customerId }){
    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState({ page:1, limit:10, total:0, pages:1 });
    const [loading, setLoading] = useState(false);

    const load = async(page=1)=>{
        setLoading(true);
        try{
            const { data } = await axios.get(`/api/customers/${customerId}/portfolio`, { params:{ page, limit:10 } });
            setItems(data?.orders ?? []);
            setMeta(data?.pagination ?? { page, limit:10, total:0, pages:1 });
        } finally{ setLoading(false); }
    };
    useEffect(()=>{ load(1); }, [customerId]);

    return (
        <div className="space-y-3">
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-slate-50">
                        <th className="text-left p-3">Tanggal</th>
                        <th className="text-left p-3">Resi</th>
                        <th className="text-right p-3">Total</th>
                        <th className="text-right p-3">Terbayar</th>
                        <th className="text-right p-3">Sisa</th>
                        <th className="text-left p-3">Status</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? <tr><td colSpan={6} className="p-4 text-center">Memuat...</td></tr> :
                        items.length===0 ? <tr><td colSpan={6} className="p-4 text-center">Tidak ada data</td></tr> :
                            items.map(o=>(
                                <tr key={o.id} className="border-t">
                                    <td className="p-3">{new Date(o.created_at||o.createdAt).toLocaleString("id-ID")}</td>
                                    <td className="p-3">{o.resi_no}</td>
                                    <td className="p-3 text-right">{formatCurrency(o.total)}</td>
                                    <td className="p-3 text-right">{formatCurrency(o.paid_amount)}</td>
                                    <td className="p-3 text-right">{formatCurrency(o.balance)}</td>
                                    <td className="p-3">{o.payment_status}</td>
                                </tr>
                            ))
                    }
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ----- Complaints Tab ----- */
function ComplaintsTab({ customerId }){
    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState({ page:1, limit:10, total:0, pages:1 });
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ title:"", content:"", sales_order_id:"" });

    const load = async(page=1)=>{
        setLoading(true);
        try{
            const { data } = await axios.get(`/api/customers/${customerId}/complaints`, { params:{ page, limit:10 } });
            setItems(data?.complaints ?? []);
            setMeta(data?.pagination ?? { page, limit:10, total:0, pages:1 });
        } finally { setLoading(false); }
    };
    useEffect(()=>{ load(1); }, [customerId]);

    const submit = async(e)=>{
        e.preventDefault();
        if(!form.title || !form.content) return;
        await axios.post(`/api/customers/${customerId}/complaints`, {
            title: form.title, content: form.content, sales_order_id: form.sales_order_id || null
        });
        setForm({ title:"", content:"", sales_order_id:"" });
        await load(meta.page);
    };

    const setStatus = async (complaintId, status) => {
        await axios.put(`/api/customers/${customerId}/complaints/${complaintId}/status`, { status });
        await load(meta.page);
    };

    return (
        <div className="space-y-4">
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-3 border border-slate-200 rounded-xl p-3">
                <input className={`${inputBase} md:col-span-2`} placeholder="Judul keluhan" value={form.title} onChange={e=>setForm(f=>({...f, title:e.target.value}))}/>
                <input className={`${inputBase} md:col-span-2`} placeholder="ID Resi/Order (opsional)" value={form.sales_order_id} onChange={e=>setForm(f=>({...f, sales_order_id:e.target.value}))}/>
                <input className={`${inputBase} md:col-span-2`} placeholder="Isi keluhan" value={form.content} onChange={e=>setForm(f=>({...f, content:e.target.value}))}/>
                <div className="md:col-span-6">
                    <button className={btnPrimary}><Plus className="h-4 w-4" /> Simpan Keluhan</button>
                </div>
            </form>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-slate-50">
                        <th className="text-left p-3">Tanggal</th>
                        <th className="text-left p-3">Judul</th>
                        <th className="text-left p-3">Order</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Catatan Penyelesaian</th>
                        <th className="text-right p-3">Aksi</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? <tr><td colSpan={6} className="p-4 text-center">Memuat...</td></tr> :
                        items.length===0 ? <tr><td colSpan={6} className="p-4 text-center">Belum ada komplain</td></tr> :
                            items.map(k=>(
                                <tr key={k.id} className="border-t">
                                    <td className="p-3">{new Date(k.created_at || k.createdAt).toLocaleString("id-ID")}</td>
                                    <td className="p-3">{k.title}</td>
                                    <td className="p-3">{k.sales_order_id || "-"}</td>
                                    <td className="p-3">
                                        <span className="px-2 py-0.5 rounded-full text-xs border bg-slate-50 text-slate-700">{k.status}</span>
                                    </td>
                                    <td className="p-3">{k.resolution_note || "-"}</td>
                                    <td className="p-3 text-right space-x-2">
                                        <button className={btnGhost} onClick={()=>setStatus(k.id, "in_progress")}>Proses</button>
                                        <button className={btnGhost} onClick={()=>setStatus(k.id, "resolved")}>Selesai</button>
                                        <button className={btnGhost} onClick={()=>setStatus(k.id, "rejected")}>Tolak</button>
                                    </td>
                                </tr>
                            ))
                    }
                    </tbody>
                </table>
            </div>
        </div>
    );
}
