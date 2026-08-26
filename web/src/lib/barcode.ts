import { BrowserMultiFormatReader } from "@zxing/browser";

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
  let stopped = false;
  let controls: { stop: () => void } | null = null;
  let stream: MediaStream | null = null;

  function stop() {
    stopped = true;
    try {
      controls?.stop();
    } catch {
      /* noop */
    }
    stream?.getTracks().forEach((t) => t.stop());
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cam = devices.find((d) => d.kind === "videoinput");
    stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: cam?.deviceId, facingMode: "environment" },
    });
    videoElement.srcObject = stream;
    await videoElement.play();

    controls = await r.decodeFromVideoElement(videoElement, (result, _err, c) => {
      if (c) controls = c;
      if (stopped || !result) return;
      onResult(result.getText());
      stop();
    });
    videoElement.onerror = () => onError?.(new Error("Video error"));
    return { stop };
  } catch (err) {
    onError?.(err);
    return { stop };
  }
}

export function isCameraSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}
