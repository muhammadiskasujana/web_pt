// src/components/QRScanner.jsx
import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect } from "react";

export default function QRScanner({ onScanSuccess }) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: 250 },
      false
    );

    scanner.render(
      (decodedText) => {
        onScanSuccess(decodedText);
        scanner.clear(); // Stop scanner setelah sukses
      },
      (error) => {
        // bisa log error ringan
      }
    );

    return () => {
      scanner.clear();
    };
  }, []);

  return <div id="reader" className="w-full" />;
}
