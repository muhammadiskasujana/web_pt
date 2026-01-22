// ──────────────────────────────────────────────────────────────────────────────
// File: src/pages/produk/_ui.js
// Shared small UI helpers/consts
// ──────────────────────────────────────────────────────────────────────────────
export const btnPrimary =
    "inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-600/30 transition disabled:opacity-60 disabled:cursor-not-allowed";
export const btnGhost =
    "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-900 bg-white border border-slate-900/20 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-900/10";
export const inputBase =
    "w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-900/20 text-slate-900 placeholder:text-slate-900/40 outline-none focus:ring-4 focus:ring-sky-600/30 focus:border-sky-600 transition";
export const Th = ({ children, className = "" }) => (
    <th className={`text-left text-[11px] uppercase tracking-widest text-slate-500 px-3 py-2 ${className}`}>{children}</th>
);
export const HeaderBack = ({ title, extra, onBack }) => (
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            {onBack && (
                <button className={btnGhost} onClick={onBack}>Kembali</button>
            )}
            <h2 className="text-lg font-bold">{title}</h2>
        </div>
        {extra}
    </div>
);
export const formatCurrency = (n) => {
    if (n === null || n === undefined) return "-";
    try {
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n));
    } catch { return String(n); }
};