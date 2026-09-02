import { useEffect, useRef, useState } from "react";
import { Modal } from "./ui";
import { startScan, isCameraSupported } from "../lib/barcode";

export default function BarcodeScanner({
  open,
  onClose,
  onDetected,
}: {
  open: boolean;
  onDetected: (code: string) => void;
  onClose: () => void;
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
        {/* Camera viewport + scan-frame overlay. The overlay is purely
            visual (pointer-events-none) and dims the area outside the
            frame using the classic box-shadow "cutout" trick so the
            user knows exactly where to align the barcode. */}
        <div className="relative overflow-hidden rounded-lg bg-black aspect-video">
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            playsInline
          />

          <div className="pointer-events-none absolute inset-0">
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                         w-[72%] max-w-[340px] aspect-[2.6/1] rounded-lg
                         shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
            >
              {/* Four corner brackets */}
              <span className="absolute -left-px -top-px h-6 w-6 border-l-[3px] border-t-[3px] border-white rounded-tl" />
              <span className="absolute -right-px -top-px h-6 w-6 border-r-[3px] border-t-[3px] border-white rounded-tr" />
              <span className="absolute -left-px -bottom-px h-6 w-6 border-l-[3px] border-b-[3px] border-white rounded-bl" />
              <span className="absolute -right-px -bottom-px h-6 w-6 border-r-[3px] border-b-[3px] border-white rounded-br" />

              {/* Animated scan line (see .animate-scan-line in index.css) */}
              <div className="absolute inset-x-3 inset-y-0">
                <div className="absolute left-0 right-0 h-[2px] bg-rose-400 animate-scan-line shadow-[0_0_8px_rgba(251,113,133,0.7)]" />
              </div>
            </div>
          </div>
        </div>

        {scanning && !error && (
          <p className="text-center text-sm text-slate-500">
            Align the barcode inside the frame…
          </p>
        )}
        {error && <p className="text-center text-sm text-rose-600">{error}</p>}
        <p className="text-center text-xs text-slate-400">
          Tip: you can also type a barcode manually in the search box.
        </p>
      </div>
    </Modal>
  );
}
