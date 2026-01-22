import { ChevronLeft, ChevronRight } from "lucide-react";
import { btnGhost } from "../produk/_ui";

export function Section({ title, actions, children }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">{title}</h2>
                <div className="flex gap-2">{actions}</div>
            </div>
            {children}
        </div>
    );
}

export function Paginator({ meta, setParams }) {
    const totalPages =
        meta.pages || Math.max(1, Math.ceil((meta.total || 0) / (meta.limit || 10)));
    return (
        <div className="flex items-center justify-between mt-3">
            <div className="text-sm text-slate-700/70">
                Halaman {meta.page} dari {totalPages} • Total {meta.total}
            </div>
            <div className="flex items-center gap-2">
                <button
                    className={btnGhost}
                    onClick={() =>
                        setParams((prev) => {
                            const n = new URLSearchParams(prev);
                            n.set("page", String(Math.max(1, (meta.page || 1) - 1)));
                            return n;
                        })
                    }
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                    className={btnGhost}
                    onClick={() =>
                        setParams((prev) => {
                            const n = new URLSearchParams(prev);
                            const tp = totalPages;
                            n.set("page", String(Math.min(tp, (meta.page || 1) + 1)));
                            return n;
                        })
                    }
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
