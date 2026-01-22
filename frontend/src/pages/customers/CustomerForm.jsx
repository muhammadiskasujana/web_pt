import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../../config/axios";
import { HeaderBack, inputBase, btnPrimary, btnGhost } from "../produk/_ui";

export default function CustomerForm(){
    const { id } = useParams();
    const editMode = !!id;
    const nav = useNavigate();
    const [loading, setLoading] = useState(!!id);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState([]);
    const [f, setF] = useState({
        code:"", name:"", customer_category_id:"", email:"", phone:"", address:"", note:"", is_active:true
    });

    useEffect(() => {
        (async()=>{
            try {
                // --- Ambil kategori customer dari /api/catalog/customer?page=1&limit=500 ---
                try {
                    const { data } = await axios.get("/api/catalog/customer", {
                        params: { page: 1, limit: 500 },
                    });
                    // tahan banting terhadap berbagai shape respons:
                    const rows =
                        data?.items ||
                        data?.categories ||
                        data?.data?.items ||
                        data?.data?.categories ||
                        [];
                    // normalisasi minimal: butuh {id, name}
                    const norm = rows.map((r) => ({
                        id: r.id ?? r.value ?? r.code ?? r.uuid ?? r._id,
                        name: r.name ?? r.label ?? r.title ?? r.text ?? String(r.code || r.id || ""),
                    })).filter(x => x.id && x.name);
                    setCategories(norm);
                } catch (err) {
                    console.warn("Gagal load kategori customer:", err);
                    setCategories([]);
                }

                if(editMode){
                    const { data } = await axios.get(`/api/customers/${id}`);
                    const c = data?.customer;
                    setF({
                        code: c?.code || "",
                        name: c?.name || "",
                        customer_category_id: c?.customer_category_id || "",
                        email: c?.email || "",
                        phone: c?.phone || "",
                        address: c?.address || "",
                        note: c?.note || "",
                        is_active: !!c?.is_active
                    });
                }
            } finally { setLoading(false); }
        })();
    }, [id, editMode]);

    const onSubmit = async (e)=>{
        e.preventDefault();
        setSaving(true);
        try{
            const payload = {
                ...f,
                // kirim null kalau kosong
                customer_category_id: f.customer_category_id || null,
                email: f.email || null,
                phone: f.phone || null,
                address: f.address || null,
                note: f.note || null,
            };
            if(editMode){
                await axios.put(`/api/customers/${id}`, payload);
            }else{
                await axios.post(`/api/customers`, payload);
            }
            nav("/customers");
        } finally { setSaving(false); }
    };

    if(loading) return <div>Memuat...</div>;

    return (
        <div className="space-y-4">
            <HeaderBack title={editMode?"Edit Pelanggan":"Pelanggan Baru"} onBack={()=>nav("/customers")} />
            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs text-slate-500">Kode</label>
                    <input className={inputBase} value={f.code} onChange={e=>setF({...f, code:e.target.value})} placeholder="(opsional unik)"/>
                </div>
                <div>
                    <label className="text-xs text-slate-500">Nama*</label>
                    <input className={inputBase} required value={f.name} onChange={e=>setF({...f, name:e.target.value})}/>
                </div>
                <div>
                    <label className="text-xs text-slate-500">Kategori</label>
                    <select
                        className={inputBase}
                        value={f.customer_category_id || ""}
                        onChange={(e)=>setF({...f, customer_category_id: e.target.value || null})}
                    >
                        <option value="">-</option>
                        {categories.map(c=>(
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs text-slate-500">Email</label>
                    <input className={inputBase} type="email" value={f.email} onChange={e=>setF({...f, email:e.target.value})}/>
                </div>
                <div>
                    <label className="text-xs text-slate-500">Telepon</label>
                    <input className={inputBase} value={f.phone} onChange={e=>setF({...f, phone:e.target.value})}/>
                </div>
                <div className="md:col-span-2">
                    <label className="text-xs text-slate-500">Alamat</label>
                    <textarea className={inputBase} rows={3} value={f.address} onChange={e=>setF({...f, address:e.target.value})}/>
                </div>
                <div className="md:col-span-2">
                    <label className="text-xs text-slate-500">Catatan</label>
                    <textarea className={inputBase} rows={3} value={f.note} onChange={e=>setF({...f, note:e.target.value})}/>
                </div>
                <div>
                    <label className="text-xs text-slate-500">Status</label>
                    <select className={inputBase} value={f.is_active ? "1":"0"} onChange={e=>setF({...f, is_active: e.target.value==="1"})}>
                        <option value="1">Aktif</option>
                        <option value="0">Non-aktif</option>
                    </select>
                </div>

                <div className="md:col-span-2 flex gap-2">
                    <button className={btnPrimary} disabled={saving}>{saving?"Menyimpan...":"Simpan"}</button>
                    <button type="button" className={btnGhost} onClick={()=>nav(-1)}>Batal</button>
                </div>
            </form>
        </div>
    );
}
