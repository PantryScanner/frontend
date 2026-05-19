import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Sparkles,
  ScanLine,
  Package,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveGroup } from "@/contexts/ActiveGroupContext";
import { useAuth } from "@/contexts/AuthContext";
import { appToast } from "@/lib/toast";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SOUND_SUCCESS =
  "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3";
const SOUND_ERROR =
  "https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3";

interface Dispensa {
  id: string;
  name: string;
  color: string | null;
  group_id: string | null;
}

interface MobileScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDispensaId?: string;
  onScanComplete?: () => void;
}

interface SuccessFlash {
  id: number;
  productName: string;
  productImage: string | null;
  newQuantity: number;
}

// === SCAN ACCURACY TUNING ===
// Time after a successful submission during which the SAME code is ignored
const SAME_CODE_COOLDOWN_MS = 1500;
// Time after a successful submission during which ANY code is ignored
const GLOBAL_COOLDOWN_MS = 350;
// How many consecutive identical reads we need to consider it confirmed
const CONFIRM_THRESHOLD = 2;
// Max age between confirming reads (ms)
const CONFIRM_WINDOW_MS = 600;

/** EAN-13 / EAN-8 / UPC-A checksum validator. Returns true for non-numeric (CODE_128, etc.) — only validates GTINs. */
function isValidGtin(code: string): boolean {
  if (!/^\d+$/.test(code)) return true; // non-numeric → trust the symbology
  if (![8, 12, 13, 14].includes(code.length)) return true;
  const digits = code.split("").map(Number);
  const check = digits.pop()!;
  let sum = 0;
  // GTIN: starting from rightmost digit BEFORE the check digit, alternate ×3,×1
  const rev = digits.reverse();
  for (let i = 0; i < rev.length; i++) {
    sum += rev[i] * (i % 2 === 0 ? 3 : 1);
  }
  const expected = (10 - (sum % 10)) % 10;
  return expected === check;
}

export function MobileScanner({
  open,
  onOpenChange,
  defaultDispensaId,
  onScanComplete,
}: MobileScannerProps) {
  const { user } = useAuth();
  const { activeGroup } = useActiveGroup();
  const { t } = useT();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  /** code → last submission timestamp (for per-code cooldown) */
  const lastSubmissionsRef = useRef<Map<string, number>>(new Map());
  /** last global submission timestamp (any code) */
  const lastGlobalTsRef = useRef<number>(0);
  /** consecutive-confirmation buffer */
  const confirmBufRef = useRef<{ code: string; count: number; firstTs: number }>({
    code: "",
    count: 0,
    firstTs: 0,
  });
  const selectedDispensaIdRef = useRef<string>("");
  const busyRef = useRef(false);
  const scanningActiveRef = useRef(false);

  const audioSuccess = useRef<HTMLAudioElement | null>(null);
  const audioError = useRef<HTMLAudioElement | null>(null);

  const [dispense, setDispense] = useState<Dispensa[]>([]);
  const [selectedDispensaId, setSelectedDispensaId] = useState<string>(
    defaultDispensaId ?? "",
  );
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [flash, setFlash] = useState<SuccessFlash | null>(null);
  const [pulse, setPulse] = useState(false);
  const [isHolding, setIsHolding] = useState(false);

  useEffect(() => {
    audioSuccess.current = new Audio(SOUND_SUCCESS);
    audioError.current = new Audio(SOUND_ERROR);
  }, []);

  useEffect(() => {
    selectedDispensaIdRef.current = selectedDispensaId;
  }, [selectedDispensaId]);

  useEffect(() => {
    if (!open || defaultDispensaId || !user) return;
    (async () => {
      let q = supabase.from("dispense").select("id, name, color, group_id");
      if (activeGroup) {
        q = q.or(
          `group_id.eq.${activeGroup.id},and(user_id.eq.${user.id},group_id.is.null)`,
        );
      } else {
        q = q.eq("user_id", user.id);
      }
      const { data, error } = await q.order("name");

      if (error) {
        console.error("[Scanner] dispense load error:", error);
        return;
      }

      const list = data ?? [];
      setDispense(list);

      if (!selectedDispensaId && list.length > 0) {
        const saved = localStorage.getItem("mobileScanner.dispensaId");
        const found = saved && list.find((d) => d.id === saved);
        const finalId = found ? (saved as string) : list[0].id;
        setSelectedDispensaId(finalId);
      }
    })();
  }, [open, defaultDispensaId, user, activeGroup, selectedDispensaId]);

  useEffect(() => {
    if (selectedDispensaId) {
      localStorage.setItem("mobileScanner.dispensaId", selectedDispensaId);
    }
  }, [selectedDispensaId]);

  const playSound = (type: "success" | "error") => {
    const sound =
      type === "success" ? audioSuccess.current : audioError.current;
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  };

  const submitScan = useCallback(
    async (barcode: string) => {
      const dispensaId = selectedDispensaIdRef.current;
      if (!dispensaId) {
        appToast.warning(t("scanner.selectPantryFirst"));
        return;
      }

      busyRef.current = true;
      const startTime = performance.now();

      try {
        const { data, error } = await supabase.functions.invoke(
          "mobile-scan-product",
          {
            body: {
              barcode,
              dispensa_id: dispensaId,
              action: "add",
              quantity: 1,
            },
          },
        );

        if (error || data?.error)
          throw new Error(error?.message || data?.error);

        const duration = (performance.now() - startTime).toFixed(0);
        console.log(
          `[Scanner] ✅ ${duration}ms · ${data?.productName} (${barcode})`,
        );

        // Record successful submission to drive the per-code cooldown
        lastSubmissionsRef.current.set(barcode, Date.now());
        lastGlobalTsRef.current = Date.now();

        playSound("success");
        setScanCount((c) => c + 1);
        setPulse(true);
        setTimeout(() => setPulse(false), 400);

        const flashItem: SuccessFlash = {
          id: Date.now(),
          productName: data?.productName ?? t("scanner.productAddedDefault"),
          productImage: data?.productImage ?? null,
          newQuantity: data?.newQuantity ?? 0,
        };
        setFlash(flashItem);
        setTimeout(
          () => setFlash((curr) => (curr?.id === flashItem.id ? null : curr)),
          2000,
        );

        onScanComplete?.();
      } catch (e: any) {
        const duration = (performance.now() - startTime).toFixed(0);
        console.error(`[Scanner] ❌ ${duration}ms:`, e.message);

        playSound("error");
        appToast.error(t("common.error"), {
          description: e.message || t("scanner.productNotFound"),
        });
      } finally {
        busyRef.current = false;
      }
    },
    [onScanComplete, t],
  );

  const handleDetected = useCallback(
    (raw: string) => {
      if (!scanningActiveRef.current) return;
      const code = raw.trim();
      if (!code) return;

      // Reject GTINs with invalid checksum (the #1 source of "wrong barcode")
      if (!isValidGtin(code)) {
        // Reset buffer so a fresh, correct read isn't blocked
        confirmBufRef.current = { code: "", count: 0, firstTs: 0 };
        return;
      }

      if (busyRef.current) return;

      const now = Date.now();

      // Global cooldown right after any submission to dampen burst-reads
      if (now - lastGlobalTsRef.current < GLOBAL_COOLDOWN_MS) return;

      // Per-code cooldown so the same item isn't auto-incremented on every frame
      const lastForCode = lastSubmissionsRef.current.get(code) ?? 0;
      if (now - lastForCode < SAME_CODE_COOLDOWN_MS) return;

      // Multi-frame confirmation buffer for accuracy
      const buf = confirmBufRef.current;
      if (
        buf.code === code &&
        now - buf.firstTs < CONFIRM_WINDOW_MS
      ) {
        buf.count += 1;
      } else {
        confirmBufRef.current = { code, count: 1, firstTs: now };
      }

      if (confirmBufRef.current.count < CONFIRM_THRESHOLD) return;

      // Confirmed → reset buffer and submit
      confirmBufRef.current = { code: "", count: 0, firstTs: 0 };
      lastGlobalTsRef.current = now;

      if (navigator.vibrate) navigator.vibrate(30);
      submitScan(code);
    },
    [submitScan],
  );

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
    ]);
    // TRY_HARDER produces more reads per frame → more chances to confirm.
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints, {
      // Decode every ~120ms (faster than the 500ms default) → quicker detection.
      delayBetweenScanAttempts: 120,
      delayBetweenScanSuccess: 120,
    });

    const startCamera = async () => {
      await new Promise((r) => setTimeout(r, 100));
      if (!videoRef.current || !isMounted) return;

      try {
        // Hi-res constraints — better focus on dense barcodes.
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            // @ts-expect-error advanced not in TS lib
            advanced: [{ focusMode: "continuous" }],
          },
          audio: false,
        };

        const controls = await reader.decodeFromConstraints(
          constraints,
          videoRef.current,
          (result) => {
            if (result && isMounted) handleDetected(result.getText());
          },
        );
        if (!isMounted) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;

        // Try to lock continuous autofocus + exposure on the active track for
        // sharper reads. Best-effort: silently ignored if unsupported.
        const stream = videoRef.current.srcObject as MediaStream | null;
        const track = stream?.getVideoTracks()?.[0];
        if (track && "applyConstraints" in track) {
          try {
            await track.applyConstraints({
              advanced: [
                { focusMode: "continuous" },
                { exposureMode: "continuous" },
                { whiteBalanceMode: "continuous" },
              ],
            } as MediaTrackConstraints);
          } catch {
            /* ignore */
          }
        }

        setCameraReady(true);
      } catch (err) {
        console.error("[Scanner] camera init error:", err);
        if (isMounted) setCameraError(t("scanner.cameraError"));
      }
    };

    startCamera();
    return () => {
      isMounted = false;
      scanningActiveRef.current = false;
      if (controlsRef.current) controlsRef.current.stop();
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((tr) => tr.stop());
      setCameraReady(false);
      // Reset accuracy state between sessions
      confirmBufRef.current = { code: "", count: 0, firstTs: 0 };
      lastSubmissionsRef.current.clear();
      lastGlobalTsRef.current = 0;
    };
  }, [open, handleDetected, t]);

  const startScanning = () => {
    if (!selectedDispensaIdRef.current) {
      appToast.warning(t("scanner.selectPantryFirst"));
      return;
    }
    // Reset buffer on each press for clean confirmation runs
    confirmBufRef.current = { code: "", count: 0, firstTs: 0 };
    scanningActiveRef.current = true;
    setIsHolding(true);
    if (navigator.vibrate) navigator.vibrate(15);
  };

  const stopScanning = () => {
    scanningActiveRef.current = false;
    confirmBufRef.current = { code: "", count: 0, firstTs: 0 };
    setIsHolding(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden sm:rounded-2xl border-none gap-0 my-4 max-h-[calc(100vh-2rem)] flex flex-col">
        <DialogHeader className="px-4 pt-4 pb-3 bg-background shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-2 rounded-lg">
                <ScanLine className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-base">
                  {t("scanner.title")}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {t("scanner.holdToScan")}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {!defaultDispensaId && (
          <div className="px-4 pb-3 bg-background shrink-0">
            <Select
              value={selectedDispensaId}
              onValueChange={setSelectedDispensaId}
            >
              <SelectTrigger className="w-full bg-muted/50 border-none h-11">
                <SelectValue placeholder={t("scanner.chooseDestination")} />
              </SelectTrigger>
              <SelectContent>
                {dispense.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ background: d.color || "#ccc" }}
                      />
                      {d.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="relative bg-black flex-1 min-h-[280px] overflow-hidden">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
          />

          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-300 pointer-events-none z-10",
              pulse ? "bg-green-500/30 opacity-100" : "opacity-0",
            )}
          />

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <div
              className={cn(
                "w-64 h-44 border-2 rounded-3xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] transition-colors",
                isHolding ? "border-primary" : "border-white/30",
              )}
            >
              {isHolding && (
                <div className="absolute inset-x-0 h-0.5 bg-primary shadow-[0_0_15px_rgba(var(--primary),0.8)] top-1/2 -translate-y-1/2 animate-[bounce_1.2s_infinite]" />
              )}
              <div
                className={cn(
                  "absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 rounded-tl-lg transition-colors",
                  isHolding ? "border-primary" : "border-white/70",
                )}
              />
              <div
                className={cn(
                  "absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 rounded-tr-lg transition-colors",
                  isHolding ? "border-primary" : "border-white/70",
                )}
              />
              <div
                className={cn(
                  "absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 rounded-bl-lg transition-colors",
                  isHolding ? "border-primary" : "border-white/70",
                )}
              />
              <div
                className={cn(
                  "absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 rounded-br-lg transition-colors",
                  isHolding ? "border-primary" : "border-white/70",
                )}
              />
            </div>
          </div>

          {!cameraReady && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/80 gap-3 z-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">
                {t("scanner.startingCamera")}
              </p>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/90 p-6 text-center gap-4 z-20">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-sm">{cameraError}</p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                {t("common.retry")}
              </Button>
            </div>
          )}

          {flash && (
            <div className="absolute top-4 left-4 right-4 z-30 animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300">
              <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-2xl border-2 border-green-500/50 p-3 rounded-2xl flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden border shadow-sm shrink-0">
                  {flash.productImage ? (
                    <img
                      src={flash.productImage}
                      className="object-cover h-full w-full"
                      alt={flash.productName}
                    />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400">
                      {t("scanner.productAdded")}
                    </span>
                  </div>
                  <p className="text-sm font-bold truncate leading-tight">
                    {flash.productName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("common.total")}:{" "}
                    <span className="font-semibold text-foreground">
                      {flash.newQuantity}
                    </span>
                  </p>
                </div>
                <div className="bg-green-500 text-white h-9 w-9 rounded-full flex items-center justify-center font-bold shadow-lg text-sm">
                  +1
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-background border-t px-4 pt-4 pb-5 shrink-0 flex flex-col items-center gap-3">
          <button
            type="button"
            aria-label={t("scanner.holdButton")}
            disabled={!cameraReady}
            onPointerDown={(e) => {
              e.preventDefault();
              (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
              startScanning();
            }}
            onPointerUp={stopScanning}
            onPointerCancel={stopScanning}
            onPointerLeave={stopScanning}
            onContextMenu={(e) => e.preventDefault()}
            className={cn(
              "select-none touch-none relative h-20 w-20 rounded-full flex items-center justify-center font-bold text-primary-foreground transition-all duration-150 shadow-lg",
              "bg-gradient-to-br from-primary to-primary/70",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isHolding
                ? "scale-110 shadow-[0_0_40px_hsl(var(--primary)/0.7)] ring-4 ring-primary/40"
                : "active:scale-95 hover:scale-105",
            )}
          >
            {isHolding && (
              <span className="absolute inset-0 rounded-full animate-ping bg-primary/30" />
            )}
            <ScanLine className="h-8 w-8 relative z-10" />
          </button>
          <p className="text-xs text-muted-foreground font-medium">
            {isHolding
              ? t("scanner.scanningActive")
              : t("scanner.holdButton")}
          </p>

          <div className="w-full flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-full text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t("scanner.scannedCount", { count: scanCount })}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground font-semibold"
            >
              {t("common.close")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
