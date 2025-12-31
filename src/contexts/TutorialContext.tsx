import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for highlighting
  position?: "top" | "bottom" | "left" | "right" | "center";
  action?: string; // Action hint for the user
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Benvenuto in PantryOS!",
    description: "Questo tutorial ti guiderà attraverso le funzionalità principali. Segui le istruzioni per imparare ad usare l'app.",
    position: "center",
  },
  {
    id: "sidebar",
    title: "Menu di Navigazione",
    description: "Questa è la sidebar. Da qui puoi accedere a tutte le sezioni: Dashboard, Dispense, Dispositivi, Inventario e Grafici.",
    target: "[data-sidebar='sidebar']",
    position: "right",
  },
  {
    id: "dispense",
    title: "Crea la tua prima Dispensa",
    description: "Le dispense sono i luoghi dove conservi i prodotti. Clicca su 'Dispense' nel menu e poi su 'Nuova Dispensa' per crearne una.",
    target: "[href='/dispense']",
    position: "right",
    action: "Clicca su Dispense",
  },
  {
    id: "dispositivi",
    title: "Collega uno Scanner",
    description: "Vai nella sezione 'Dispositivi' per aggiungere uno scanner di codici a barre. Ogni scanner può essere assegnato a una dispensa.",
    target: "[href='/dispositivi']",
    position: "right",
    action: "Clicca su Dispositivi",
  },
  {
    id: "inventario",
    title: "Gestisci l'Inventario",
    description: "Nella sezione 'Inventario' trovi tutti i tuoi prodotti. Puoi aggiungerli manualmente o tramite scansione.",
    target: "[href='/inventario']",
    position: "right",
    action: "Clicca su Inventario",
  },
  {
    id: "grafici",
    title: "Analizza i Dati",
    description: "Vai su 'Grafici' per visualizzare statistiche e trend sui tuoi consumi e le scorte.",
    target: "[href='/grafici']",
    position: "right",
    action: "Clicca su Grafici",
  },
  {
    id: "notifications",
    title: "Notifiche",
    description: "Clicca sulla campanella per vedere le notifiche. Riceverai avvisi quando i prodotti scendono sotto soglia.",
    target: "[data-notification-bell]",
    position: "bottom",
  },
  {
    id: "complete",
    title: "Sei pronto!",
    description: "Ottimo! Ora conosci le funzionalità principali di PantryOS. Inizia creando una dispensa e aggiungendo i tuoi primi prodotti!",
    position: "center",
  },
];

const TUTORIAL_STORAGE_KEY = "pantryos_tutorial_completed";

interface TutorialContextType {
  isOpen: boolean;
  currentStep: number;
  totalSteps: number;
  currentStepData: TutorialStep | undefined;
  steps: TutorialStep[];
  isCompleted: boolean;
  isLoading: boolean;
  startTutorial: () => void;
  closeTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  goToStep: (step: number) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkTutorialStatus();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const checkTutorialStatus = async () => {
    if (!user) return;

    try {
      // Check localStorage first for faster response
      const localCompleted = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (localCompleted === "true") {
        setIsCompleted(true);
        setIsLoading(false);
        return;
      }

      // Check database
      const { data } = await supabase
        .from("profiles")
        .select("tutorial_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data?.tutorial_completed) {
        setIsCompleted(true);
        localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
      } else {
        setIsCompleted(false);
        // Auto-start tutorial for new users
        setIsOpen(true);
      }
    } catch (error) {
      console.error("Error checking tutorial status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const completeTutorial = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from("profiles")
        .update({ tutorial_completed: true })
        .eq("user_id", user.id);

      localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
      setIsCompleted(true);
      setIsOpen(false);
      setCurrentStep(0);
    } catch (error) {
      console.error("Error completing tutorial:", error);
    }
  }, [user]);

  const startTutorial = useCallback(() => {
    setCurrentStep(0);
    setIsOpen(true);
  }, []);

  const closeTutorial = useCallback(() => {
    setIsOpen(false);
    setCurrentStep(0);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      completeTutorial();
    }
  }, [currentStep, completeTutorial]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const skipTutorial = useCallback(() => {
    completeTutorial();
  }, [completeTutorial]);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < TUTORIAL_STEPS.length) {
      setCurrentStep(step);
    }
  }, []);

  return (
    <TutorialContext.Provider
      value={{
        isOpen,
        currentStep,
        totalSteps: TUTORIAL_STEPS.length,
        currentStepData: TUTORIAL_STEPS[currentStep],
        steps: TUTORIAL_STEPS,
        isCompleted,
        isLoading,
        startTutorial,
        closeTutorial,
        nextStep,
        prevStep,
        skipTutorial,
        goToStep,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorialContext() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error("useTutorialContext must be used within a TutorialProvider");
  }
  return context;
}
