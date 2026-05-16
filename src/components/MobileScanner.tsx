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

const SCAN_COOLDOWN_MS = 800;

export function MobileScanner({
  open,
  onOpenChange,
  defaultDispensaId,
  onScanComplete,
}: MobileScannerProps) {
  const { user } = useAuth();
  const { activeGroup } = useActiveGroup();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const lastScanRef = useRef<{ code: string; ts: number }>({ code: "", ts: 0 });
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
      console.log("[Scanner] Caricamento elenco dispense...");
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
        console.error("[Scanner] Errore caricamento dispense:", error);
        return;
      }

      const list = data ?? [];
      setDispense(list);

      if (!selectedDispensaId && list.length > 0) {
        const saved = localStorage.getItem("mobileScanner.dispensaId");
        const found = saved && list.find((d) => d.id === saved);
        const finalId = found ? (saved as string) : list[0].id;
        setSelectedDispensaId(finalId);
        console.log("[Scanner] Dispensa selezionata:", finalId);
      }
    })();
  }, [open, defaultDispensaId, user, activeGroup]);

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
        console.warn(
          "[Scanner] Scansione annullata: nessuna dispensa selezionata.",
        );
        appToast.warning("Seleziona prima una dispensa");
        return;
      }

      busyRef.current = true;
      // Inizio cronometro
      const startTime = performance.now();
      console.log(`[Scanner] 🚀 Avvio elaborazione: ${barcode}`);

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

        // Calcolo tempo trascorso
        const duration = (performance.now() - startTime).toFixed(0);
        console.log(
          `[Scanner] ✅ Completato in ${duration}ms. Prodotto: ${data?.productName}`,
        );

        playSound("success");
        setScanCount((c) => c + 1);
        setPulse(true);
        setTimeout(() => setPulse(false), 400);

        const flashItem: SuccessFlash = {
          id: Date.now(),
          productName: data?.productName ?? "Prodotto aggiunto",
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
        console.error(`[Scanner] ❌ Errore dopo ${duration}ms:`, e.message);

        playSound("error");
        appToast.error("Errore", {
          description: e.message || "Prodotto non trovato",
        });
      } finally {
        busyRef.current = false;
      }
    },
    [onScanComplete],
  );

  const handleDetected = useCallback(
    (barcode: string) => {
      if (!scanningActiveRef.current) return;
      const code = barcode.trim();
      if (!code) return;

      if (busyRef.current) {
        console.log("[Scanner] Coda occupata, ignoro rilevamento:", code);
        return;
      }

      const now = Date.now();
      if (
        lastScanRef.current.code === code &&
        now - lastScanRef.current.ts < SCAN_COOLDOWN_MS
      ) {
        console.log("[Scanner] Codice ignorato (cooldown):", code);
        return;
      }

      console.log("[Scanner] Codice rilevato:", code);
      lastScanRef.current = { code, ts: now };

      if (navigator.vibrate) navigator.vibrate(40);
      submitScan(code);
    },
    [submitScan],
  );

  useEffect(() => {
    if (!open) return;
    console.log("[Scanner] Inizializzazione fotocamera...");

    let isMounted = true;
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints);

    const startCamera = async () => {
      await new Promise((r) => setTimeout(r, 200));
      if (!videoRef.current || !isMounted) return;

      try {
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
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
        setCameraReady(true);
        console.log("[Scanner] Stream video attivo.");
      } catch (err) {
        console.error("[Scanner] Errore inizializzazione stream:", err);
        if (isMounted) setCameraError("Impossibile accedere alla fotocamera.");
      }
    };

    startCamera();
    return () => {
      console.log("[Scanner] Chiusura scanner e rilascio risorse.");
      isMounted = false;
      scanningActiveRef.current = false;
      if (controlsRef.current) controlsRef.current.stop();
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      setCameraReady(false);
    };
  }, [open, handleDetected]);

  const startScanning = () => {
    if (!selectedDispensaIdRef.current) {
      appToast.warning("Seleziona prima una dispensa");
      return;
    }
    console.log("[Scanner] Scansione attivata (pulsante premuto)");
    scanningActiveRef.current = true;
    setIsHolding(true);
    if (navigator.vibrate) navigator.vibrate(20);
  };

  const stopScanning = () => {
    if (scanningActiveRef.current) {
      console.log("[Scanner] Scansione disattivata (pulsante rilasciato)");
    }
    scanningActiveRef.current = false;
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
                <DialogTitle className="text-base">Scanner</DialogTitle>
                <DialogDescription className="text-xs">
                  Tieni premuto il pulsante per scansionare
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
                <SelectValue placeholder="Scegli destinazione" />
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
              <p className="text-sm font-medium">Avvio fotocamera...</p>
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
                Riprova
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
                      alt="prodotto"
                    />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400">
                      Aggiunto
                    </span>
                  </div>
                  <p className="text-sm font-bold truncate leading-tight">
                    {flash.productName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Totale:{" "}
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
            aria-label="Tieni premuto per scansionare"
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
              ? "Scansione attiva..."
              : "Tieni premuto per scansionare"}
          </p>

          <div className="w-full flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-full text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{scanCount} scansionati</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground font-semibold"
            >
              Chiudi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
