import { useTutorial } from "@/hooks/useTutorial";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

export function TutorialOverlay() {
  const {
    isOpen,
    currentStep,
    totalSteps,
    currentStepData,
    nextStep,
    prevStep,
    skipTutorial,
    closeTutorial,
  } = useTutorial();

  if (!isOpen || !currentStepData) return null;

  const progress = ((currentStep + 1) / totalSteps) * 100;
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={closeTutorial}
      />

      {/* Tutorial Card */}
      <Card className="relative z-10 w-full max-w-md mx-4 shadow-2xl border-2 animate-scale-in">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">
                Passo {currentStep + 1} di {totalSteps}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={closeTutorial}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={progress} className="h-1 mt-3" />
        </CardHeader>

        <CardContent className="pt-4">
          <CardTitle className="text-xl mb-3">
            {currentStepData.title}
          </CardTitle>
          <p className="text-muted-foreground leading-relaxed">
            {currentStepData.description}
          </p>
        </CardContent>

        <CardFooter className="flex justify-between gap-3 pt-2">
          <div>
            {!isFirstStep && (
              <Button variant="ghost" onClick={prevStep}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Indietro
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            {!isLastStep && (
              <Button variant="ghost" onClick={skipTutorial}>
                Salta
              </Button>
            )}
            <Button onClick={nextStep}>
              {isLastStep ? (
                "Inizia"
              ) : (
                <>
                  Avanti
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
