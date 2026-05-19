import { useState } from "react";
import { MobileScanner } from "@/components/MobileScanner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScanLine, Camera, Zap, Hand } from "lucide-react";
import { useT } from "@/lib/i18n";

const Scan = () => {
  const [open, setOpen] = useState(true);
  const { t } = useT();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-glow">
          <ScanLine className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold">{t("scanner.pageTitle")}</h1>
        <p className="text-muted-foreground">{t("scanner.pageSubtitle")}</p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">{t("scanner.quickTap")}</p>
              <p className="text-xs text-muted-foreground">{t("scanner.quickTapDesc")}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Hand className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">{t("scanner.holdDown")}</p>
              <p className="text-xs text-muted-foreground">{t("scanner.holdDownDesc")}</p>
            </div>
          </div>
        </div>

        <Button size="lg" className="w-full" onClick={() => setOpen(true)}>
          <Camera className="h-5 w-5 mr-2" />
          {t("scanner.openScanner")}
        </Button>
      </Card>

      <MobileScanner open={open} onOpenChange={setOpen} />
    </div>
  );
};

export default Scan;
