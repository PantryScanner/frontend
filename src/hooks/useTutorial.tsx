import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for highlighting
  position?: "top" | "bottom" | "left" | "right" | "center";
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Benvenuto in PantryOS!",
    description: "Questo breve tutorial ti guiderà attraverso le funzionalità principali dell'app. Puoi sempre rivederlo dal menu Aiuto.",
    position: "center",
  },
  {
    id: "dispense",
    title: "Crea la tua prima Dispensa",
    description: "Le dispense sono i luoghi dove conservi i tuoi prodotti (es. cucina, garage, cantina). Inizia creandone una per organizzare il tuo inventario.",
    position: "center",
  },
  {
    id: "scanner",
    title: "Aggiungi uno Scanner",
    description: "Collega uno scanner di codici a barre per tracciare automaticamente i prodotti in entrata e uscita dalle tue dispense.",
    position: "center",
  },
  {
    id: "products",
    title: "Scansiona i Prodotti",
    description: "Usa lo scanner per aggiungere prodotti. Le informazioni come nome, categoria e valori nutrizionali vengono recuperate automaticamente.",
    position: "center",
  },
  {
    id: "inventory",
    title: "Monitora l'Inventario",
    description: "Nella sezione Inventario puoi vedere tutti i tuoi prodotti, filtrarli per categoria e controllare le quantità.",
    position: "center",
  },
  {
    id: "analytics",
    title: "Analizza i Dati",
    description: "Nella sezione Grafici trovi statistiche e grafici sull'utilizzo dei tuoi prodotti, le tendenze di consumo e altro ancora.",
    position: "center",
  },
  {
    id: "complete",
    title: "Sei pronto!",
    description: "Ora sai tutto quello che ti serve per iniziare. Buon divertimento con PantryOS!",
    position: "center",
  },
];

const TUTORIAL_STORAGE_KEY = "pantryos_tutorial_completed";

export function useTutorial() {
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

  return {
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
  };
}
