import { useEffect, useState } from "react";
import axios from "../../config/axios";
import { HeaderBack, btnPrimary, btnGhost, inputBase } from "../produk/_ui";
import { Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

const REASONS = [
    { value: "purchase", label: "Pembelian (IN)" },
    { value: "usage", label: "Pemakaian (OUT)" },
    { value: "transfer", label: "Transfer Cabang" },
    { value: "adjustment", label: "Penyesuaian" },
];

export default function MoveCreate() {
    const nav = useNavigate();
    const [rms, setRms] = useState([]);
    const [form, setForm] = useState({
        rm_id: "",
        reason: "purchase",
        from_branch_id: "",
        to_branch_id: "",
        qty: "",
        note: "",
        ref_no: "",
        moved_at: new Date().toISOString().slice(0,16), // datetime-local format
    });

    useEffect(() => {
        (async () => {
            try {
                const { data } = await axios.get("/api/raw-materials/items", { params: { q: "" } });
                setRms(data?.items ?? []);
            } catch {}
        })();
    }, []);

    const change = (e) => {
        const { name, value } = e.target;
        setForm((f)=>({ ...f, [name]: value }));
    };

    const submit = async (e) => {
        e.preventDefault();
        const payload = {
            ...form,
            qty: Number(form.qty || 0),
            moved_at: form.moved_at ? new Date(form.moved_at) : new Date(),
            // kosongkan id branch yang "" agar tidak dikirim
            from_branch_id: form.from_branch_id || undefined,
            to_branch_id: form.to_branch_id || undefined,
        };
        await axios.post("/api/raw-materials/moves", payload);
        nav("/raw-materials/moves");
    };

    const reason = form.reason;
    const needFrom = reason === "usage" || reason === "transfer" || (reason === "adjustment" && form.from_branch_id);
    const needTo   = reason === "purchase" || reason === "transfer" || (reason === "adjustment" && form.to_branch_id);

    return (
        <div className="space-y-4">
            <HeaderBack title="Input Pergerakan Bahan Baku" onBack={()=>nav("/raw-materials/moves")} />

            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                    <label className="block">
                        <span className="mb-2 block text-sm font-medium">Bahan Baku</span>
                        <select name="rm_id" value={form.rm_id} onChange={change} className={inputBase}>
                            <option value="">Pilih...</option>
                            {rms.map((r)=>(
                                <option key={r.id} value={r.id}>
                                    {(r.code ? `${r.code} — ` : "")}{r.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-sm font-medium">Alasan</span>
                        <select name="reason" value={form.reason} onChange={change} className={inputBase}>
                            {REASONS.map((r)=>(<option key={r.value} value={r.value}>{r.label}</option>))}
                        </select>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                            <span className="mb-2 block text-sm font-medium">Dari Cabang (from)</span>
                            <input name="from_branch_id" value={form.from_branch_id} onChange={change} className={inputBase} placeholder="opsional / sesuai reason"/>
                        </label>
                        <label className="block">
                            <span className="mb-2 block text-sm font-medium">Ke Cabang (to)</span>
                            <input name="to_branch_id" value={form.to_branch_id} onChange={change} className={inputBase} placeholder="opsional / sesuai reason"/>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className="block">
                            <span className="mb-2 block text-sm font-medium">Qty</span>
                            <input type="number" min="0" name="qty" value={form.qty} onChange={change} className={inputBase} placeholder="0" />
                        </label>
                        <label className="block sm:col-span-2">
                            <span className="mb-2 block text-sm font-medium">Waktu Pencatatan</span>
                            <input type="datetime-local" name="moved_at" value={form.moved_at} onChange={change} className={inputBase}/>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                            <span className="mb-2 block text-sm font-medium">No. Referensi</span>
                            <input name="ref_no" value={form.ref_no} onChange={change} className={inputBase} placeholder="Faktur/PO/SPK/etc" />
                        </label>
                        <label className="block">
                            <span className="mb-2 block text-sm font-medium">Catatan</span>
                            <input name="note" value={form.note} onChange={change} className={inputBase} placeholder="Catatan singkat" />
                        </label>
                    </div>

                    <div className="flex gap-2">
                        <button className={btnPrimary}><Save className="h-4 w-4"/> Simpan</button>
                        <button type="button" className={btnGhost} onClick={()=>nav("/raw-materials/moves")}>Batal</button>
                    </div>

                    {/* Bantuan rule singkat */}
                    <div className="text-xs text-slate-500 mt-2">
                        <div>purchase → butuh <strong>to_branch_id</strong> (stok masuk)</div>
                        <div>usage → butuh <strong>from_branch_id</strong> (stok keluar)</div>
                        <div>transfer → butuh <strong>from</strong> & <strong>to</strong></div>
                        <div>adjustment → isi salah satu: dari = pengurangan, ke = penambahan</div>
                    </div>
                </div>
            </form>
        </div>
    );
}
