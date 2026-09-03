import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";

let reader: BrowserMultiFormatReader | null = null;

function getReader(): BrowserMultiFormatReader {
  if (!reader) reader = new BrowserMultiFormatReader();
  return reader;
}

export interface ScanHandle {
  stop: () => void;
}

export async function startScan(
  videoElement: HTMLVideoElement,
  onResult: (code: string) => void,
  onError?: (err: any) => void
): Promise<ScanHandle> {
  const r = getReader();
  let controls: IScannerControls | null = null;
  let stopped = false;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    try {
      controls?.stop();
    } catch {
      /* noop */
    }
  };

  try {
    // Prefer the back/environment camera. Use `ideal` (not `exact`) so
    // it falls back gracefully on devices without a back camera (e.g.
    // a laptop during development). Also request a decent resolution:
    // higher-res frames make ZXing's decoder far more reliable.
    //
    // Previously this code enumerated devices and picked the first
    // video input (which on phones is the front camera) and passed
    // both deviceId + facingMode to getUserMedia. But deviceId takes
    // precedence and overrides facingMode, so the front camera won
    // every time. Letting ZXing handle the stream via
    // decodeFromConstraints also avoids the manual srcObject conflict
    // that was hurting decode reliability.
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };

    controls = await r.decodeFromConstraints(
      constraints,
      videoElement,
      (result, _err, c) => {
        if (c) controls = c;
        if (stopped || !result) return;
        onResult(result.getText());
        stop();
      }
    );

    return { stop };
  } catch (err) {
    onError?.(err);
    return { stop };
  }
}

export function isCameraSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}
