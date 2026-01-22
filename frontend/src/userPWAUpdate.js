import { useMemo, useState } from "react";
import { registerSW } from "virtual:pwa-register";

/**
 * Hook untuk:
 * - deteksi versi baru (onNeedRefresh)
 * - siap offline (onOfflineReady)
 * - trigger reload (updateSW(true) -> skipWaiting + reload)
 */
export default function usePWAUpdate() {
    const [needRefresh, setNeedRefresh] = useState(false);
    const [offlineReady, setOfflineReady] = useState(false);

    const updateSW = useMemo(
        () =>
            registerSW({
                immediate: true, // daftar secepatnya
                onNeedRefresh() {
                    setNeedRefresh(true);
                },
                onOfflineReady() {
                    setOfflineReady(true);
                },
                onRegisteredSW(_swUrl, reg) {
                    // polling berkala supaya cek update meski user jarang reload
                    if (reg) {
                        setInterval(() => reg.update(), 60 * 60 * 1000); // tiap 1 jam
                    }
                },
                onRegisterError(err) {
                    console.error("SW registration error:", err);
                },
            }),
        []
    );

    const doReload = () => updateSW(true); // trigger skipWaiting + reload
    const close = () => {
        setNeedRefresh(false);
        setOfflineReady(false);
    };

    return { needRefresh, offlineReady, doReload, close };
}
