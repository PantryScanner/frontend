import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/backend/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  active: "Attivo",
  trialing: "Periodo di prova",
  past_due: "Pagamento in ritardo",
  canceled: "Annullato",
  expired: "Scaduto",
  incomplete: "Incompleto",
};

const SubscriptionManagement = () => {
  const { plan, subscription, isLoading } = useSubscription();
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const openPortal = async () => {
    setIsOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-customer-portal", {
        body: {},
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
      toast.error("Nessun abbonamento Stripe attivo da gestire.");
    } finally {
      setIsOpeningPortal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Il tuo abbonamento</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {plan?.name ?? "Free"}
            {subscription && (
              <Badge>{STATUS_LABELS[subscription.status] ?? subscription.status}</Badge>
            )}
          </CardTitle>
          <CardDescription>{plan?.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription?.current_period_end && (
            <p className="text-sm text-muted-foreground">
              {subscription.cancel_at_period_end ? "Termina il" : "Si rinnova il"}{" "}
              {new Date(subscription.current_period_end).toLocaleDateString("it-IT")}
            </p>
          )}

          <div className="flex gap-3">
            {subscription?.provider === "stripe" ? (
              <Button onClick={openPortal} disabled={isOpeningPortal}>
                {isOpeningPortal ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Gestisci abbonamento
              </Button>
            ) : (
              <Link to="/pricing">
                <Button>
                  Scopri i piani disponibili
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionManagement;
