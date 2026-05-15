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
  Camera,
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

// --- Asset Audio ---
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

const SCAN_COOLDOWN_MS = 2000;

export function MobileScanner({
  open,
  onOpenChange,
  defaultDispensaId,
  onScanComplete,
}: MobileScannerProps) {
  const { user } = useAuth();
  const { activeGroup } = useActiveGroup();

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const lastScanRef = useRef<{ code: string; ts: number }>({ code: "", ts: 0 });
  const selectedDispensaIdRef = useRef<string>("");
  const busyRef = useRef(false);

  // Audio elements
  const audioSuccess = useRef<HTMLAudioElement | null>(null);
  const audioError = useRef<HTMLAudioElement | null>(null);

  // State
  const [dispense, setDispense] = useState<Dispensa[]>([]);
  const [selectedDispensaId, setSelectedDispensaId] = useState<string>(
    defaultDispensaId ?? "",
  );
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [flash, setFlash] = useState<SuccessFlash | null>(null);
  const [pulse, setPulse] = useState(false);

  // Initialize audio
  useEffect(() => {
    audioSuccess.current = new Audio(SOUND_SUCCESS);
    audioError.current = new Audio(SOUND_ERROR);
  }, []);

  useEffect(() => {
    selectedDispensaIdRef.current = selectedDispensaId;
  }, [selectedDispensaId]);

  // Caricamento dispense
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
      const { data } = await q.order("name");
      const list = data ?? [];
      setDispense(list);

      if (!selectedDispensaId && list.length > 0) {
        const saved = localStorage.getItem("mobileScanner.dispensaId");
        const found = saved && list.find((d) => d.id === saved);
        setSelectedDispensaId(found ? saved : list[0].id);
      }
    })();
  }, [open, defaultDispensaId, user, activeGroup]);

  const playSound = (type: "success" | "error") => {
    const sound =
      type === "success" ? audioSuccess.current : audioError.current;
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {}); // Ignora blocchi autoplay browser
    }
  };

  const submitScan = useCallback(
    async (barcode: string) => {
      const dispensaId = selectedDispensaIdRef.current;
      if (!dispensaId) {
        appToast.warning("Seleziona prima una dispensa");
        return;
      }

      busyRef.current = true;
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

        // Feedback Successo
        playSound("success");
        setScanCount((c) => c + 1);
        setPulse(true);
        setTimeout(() => setPulse(false), 500);

        const flashItem: SuccessFlash = {
          id: Date.now(),
          productName: data?.productName ?? "Prodotto aggiunto",
          productImage: data?.productImage ?? null,
          newQuantity: data?.newQuantity ?? 0,
        };
        setFlash(flashItem);
        setTimeout(
          () => setFlash((curr) => (curr?.id === flashItem.id ? null : curr)),
          2500,
        );

        onScanComplete?.();
      } catch (e: any) {
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
      const code = barcode.trim();
      if (!code || busyRef.current) return;

      const now = Date.now();
      if (
        lastScanRef.current.code === code &&
        now - lastScanRef.current.ts < SCAN_COOLDOWN_MS
      )
        return;
      lastScanRef.current = { code, ts: now };

      if (navigator.vibrate) navigator.vibrate(60);
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
      BarcodeFormat.CODE_128,
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
      } catch (err) {
        if (isMounted) setCameraError("Impossibile accedere alla fotocamera.");
      }
    };

    startCamera();
    return () => {
      isMounted = false;
      if (controlsRef.current) controlsRef.current.stop();
    };
  }, [open, handleDetected]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden sm:rounded-2xl border-none gap-0">
        <DialogHeader className="px-4 pt-4 pb-4 bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-2 rounded-lg">
                <ScanLine className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base">
                  Scansione Rapida
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Inquadra il codice a barre
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {!defaultDispensaId && (
          <div className="px-4 pb-3 bg-background">
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

        <div className="relative bg-black aspect-[4/5] overflow-hidden">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Flash Overlay */}
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-300 pointer-events-none z-10",
              pulse ? "bg-green-500/30 opacity-100" : "opacity-0",
            )}
          />

          {/* Target Frame */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <div className="w-64 h-48 border-2 border-white/30 rounded-3xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
              <div
                className={cn(
                  "absolute inset-x-0 h-0.5 bg-primary shadow-[0_0_15px_rgba(var(--primary),0.8)] top-1/2 -translate-y-1/2",
                  cameraReady && "animate-[bounce_2s_infinite]",
                )}
              />
              {/* Corner Accents */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
            </div>
          </div>

          {/* States */}
          {!cameraReady && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/80 gap-3 z-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Ottimizzazione sensore...</p>
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

          {/* Success Popup (Flash Card) */}
          {flash && (
            <div className="absolute bottom-6 left-6 right-6 z-30 animate-in fade-in zoom-in-95 slide-in-from-bottom-10 duration-300">
              <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-2xl border-2 border-green-500/50 p-4 rounded-2xl flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center overflow-hidden border shadow-sm shrink-0">
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
                    In dispensa:{" "}
                    <span className="font-semibold text-foreground">
                      {flash.newQuantity}
                    </span>
                  </p>
                </div>
                <div className="bg-green-500 text-white h-10 w-10 rounded-full flex items-center justify-center font-bold shadow-lg">
                  +1
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 flex items-center justify-between bg-background border-t">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-full text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{scanCount} prodotti in questa sessione</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground font-semibold"
          >
            Fine
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
