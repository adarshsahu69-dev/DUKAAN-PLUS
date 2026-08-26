import { useEffect, useRef, useState } from "react";
import { Modal } from "./ui";
import { startScan, isCameraSupported } from "../lib/barcode";

export default function BarcodeScanner({
  open,
  onClose,
  onDetected,
}: {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (!isCameraSupported()) {
      setError("Camera not available on this device/browser.");
      return;
    }
    let handle: { stop: () => void } | null = null;
    setScanning(true);
    const el = videoRef.current!;
    startScan(
      el,
      (code) => {
        onDetected(code);
        handle?.stop();
        onClose();
      },
      (err) => {
        setError(err?.message || "Could not access camera.");
        setScanning(false);
      }
    ).then((h) => (handle = h));

    return () => handle?.stop();
  }, [open, onDetected, onClose]);

  return (
    <Modal open={open} onClose={onClose} title="Scan Barcode">
      <div className="space-y-3">
        <div className="overflow-hidden rounded-lg bg-black aspect-video">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        </div>
        {scanning && !error && (
          <p className="text-center text-sm text-slate-500">Point the camera at a barcode…</p>
        )}
        {error && <p className="text-center text-sm text-rose-600">{error}</p>}
        <p className="text-center text-xs text-slate-400">
          Tip: you can also type a barcode manually in the search box.
        </p>
      </div>
    </Modal>
  );
}
