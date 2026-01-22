import { useEffect, useState } from "react";
import axios from "../../config/axios";
import { HeaderBack, inputBase, btnPrimary, btnGhost } from "../produk/_ui";
import { Save, Upload, X } from "lucide-react";

export default function CompanyProfile() {
    const [loading, setLoading] = useState(true);
    const [cp, setCp] = useState(null);
    const [logoFile, setLogoFile] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/company");
            setCp(data?.company ?? null);
        } finally { setLoading(false); }
    };

    useEffect(()=>{ load(); }, []);

    const submit = async (e) => {
        e.preventDefault();
        const fd = new FormData();
        const fields = ["name","address","phone","email","website","npwp","note"];
        fields.forEach(k => fd.append(k, e.currentTarget[k]?.value || ""));
        if (logoFile) fd.append("logo", logoFile);

        if (cp) {
            await axios.put("/api/company", fd, { headers: { "Content-Type":"multipart/form-data" } });
        } else {
            await axios.post("/api/company", fd, { headers: { "Content-Type":"multipart/form-data" } });
        }
        setLogoFile(null);
        await load();
    };

    const removeLogo = async () => {
        await axios.delete("/api/company/logo");
        await load();
    };

    if (loading) return <div>Memuat...</div>;

    return (
        <div className="space-y-4">
            <HeaderBack title="Profil Perusahaan" />

            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                    <label className="block">
                        <span className="block text-sm font-medium mb-1">Nama</span>
                        <input name="name" defaultValue={cp?.name || ""} className={inputBase} placeholder="PT/UD/CV ..." />
                    </label>
                    <label className="block">
                        <span className="block text-sm font-medium mb-1">Alamat</span>
                        <input name="address" defaultValue={cp?.address || ""} className={inputBase} />
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                            <span className="block text-sm font-medium mb-1">Telepon</span>
                            <input name="phone" defaultValue={cp?.phone || ""} className={inputBase} />
                        </label>
                        <label className="block">
                            <span className="block text-sm font-medium mb-1">Email</span>
                            <input name="email" defaultValue={cp?.email || ""} className={inputBase} />
                        </label>
                    </div>
                    {/*<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">*/}
                    {/*    <label className="block">*/}
                    {/*        <span className="block text-sm font-medium mb-1">Website</span>*/}
                    {/*        <input name="website" defaultValue={cp?.website || ""} className={inputBase} />*/}
                    {/*    </label>*/}
                    {/*    <label className="block">*/}
                    {/*        <span className="block text-sm font-medium mb-1">NPWP</span>*/}
                    {/*        <input name="npwp" defaultValue={cp?.npwp || ""} className={inputBase} />*/}
                    {/*    </label>*/}
                    {/*</div>*/}
                    <label className="block">
                        <span className="block text-sm font-medium mb-1">Catatan</span>
                        <input name="note" defaultValue={cp?.note || ""} className={inputBase} />
                    </label>

                    <div className="flex gap-2">
                        <button className={btnPrimary}><Save className="h-4 w-4" /> Simpan</button>
                        <button type="button" className={btnGhost} onClick={load}>Reset</button>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="text-sm font-medium">Logo</div>
                    <div className="border border-slate-200 rounded-xl p-4">
                        {cp?.logo_url ? (
                            <div className="space-y-3">
                                <img src={cp.logo_url} className="max-h-40 object-contain" />
                                <div className="flex gap-2">
                                    <label className={btnGhost}>
                                        <Upload className="h-4 w-4" /> Ganti Logo
                                        <input type="file" accept="image/*" hidden onChange={(e)=>setLogoFile(e.target.files?.[0]||null)} />
                                    </label>
                                    <button type="button" className={btnGhost} onClick={removeLogo}><X className="h-4 w-4" /> Hapus Logo</button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="text-slate-500 text-sm">Belum ada logo.</div>
                                <label className={btnGhost}>
                                    <Upload className="h-4 w-4" /> Upload Logo
                                    <input type="file" accept="image/*" hidden onChange={(e)=>setLogoFile(e.target.files?.[0]||null)} />
                                </label>
                            </div>
                        )}
                        {logoFile && <div className="text-xs text-slate-500 mt-2">File dipilih: {logoFile.name}</div>}
                    </div>
                </div>
            </form>
        </div>
    );
}
