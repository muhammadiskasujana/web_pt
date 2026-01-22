export default function PWAUpdateToast({
                                           show,
                                           title = "Versi baru tersedia",
                                           message = "Klik Muat Ulang untuk mendapatkan pembaruan terbaru.",
                                           onReload,
                                           onClose,
                                       }) {
    if (!show) return null;

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-zinc-900 text-zinc-100 border border-zinc-700 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3">
                <div>
                    <div className="font-semibold">{title}</div>
                    <div className="text-sm text-zinc-300">{message}</div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                    <button
                        onClick={onReload}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm"
                    >
                        Muat Ulang
                    </button>
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 rounded-xl border border-zinc-600 text-sm"
                    >
                        Nanti
                    </button>
                </div>
            </div>
        </div>
    );
}
