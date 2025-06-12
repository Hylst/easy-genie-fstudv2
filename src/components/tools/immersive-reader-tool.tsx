
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IntensitySelector } from '@/components/intensity-selector';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Play, StopCircle, Loader2, Wand2, FileText, Volume2, Settings2, Info, BookOpenText } from 'lucide-react'; // Added BookOpenText
import { useToast } from "@/hooks/use-toast";
import { simplifyText } from '@/ai/flows/simplify-text-flow'; 
import { useAuth } from '@/contexts/AuthContext';

// Default settings, more can be added later from ImmersiveReaderSettings type
const DEFAULT_SPEECH_RATE = 1; // Normal speed

export function ImmersiveReaderTool() {
  const [intensity, setIntensity] = useState<number>(3);
  const [inputText, setInputText] = useState<string>('');
  const [processedText, setProcessedText] = useState<string>(''); // For simplified text
  const [isProcessing, setIsProcessing] = useState<boolean>(false); // General processing, not used currently
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);

  const { toast } = useToast();
  const { user } = useAuth();

  // Web Speech API state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(DEFAULT_SPEECH_RATE);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;

  // Stop speech when component unmounts or text changes
  useEffect(() => {
    return () => {
      if (synthesis && synthesis.speaking) {
        synthesis.cancel();
      }
    };
  }, [synthesis]);
  
  useEffect(() => {
    if (synthesis && synthesis.speaking && !isSpeaking) {
        synthesis.cancel();
    }
  }, [isSpeaking, synthesis]);

  useEffect(() => {
    // Adjust speech rate based on intensity when intensity changes
    // Lower intensity -> slower speech, higher intensity -> faster speech
    // Mapping intensity 1-5 to speech rate 0.7 - 1.3 (example range)
    const newRate = 0.7 + (intensity - 1) * ( (1.3 - 0.7) / 4 );
    setSpeechRate(Math.max(0.5, Math.min(2, newRate))); // Clamp between 0.5 and 2
  }, [intensity]);


  const handleProcessText = async () => {
    if (!inputText.trim()) {
      toast({ title: "Texte manquant", description: "Veuillez entrer du texte à préparer pour la lecture.", variant: "destructive" });
      setProcessedText('');
      return;
    }
    setIsLoadingAI(true);
    setProcessedText('');
    try {
      const result = await simplifyText({ textToSimplify: inputText, intensityLevel: intensity });
      setProcessedText(result.simplifiedText);
      toast({ title: "Texte préparé !", description: "Le texte a été simplifié par le Génie." });
    } catch (error) {
      console.error("Error simplifying text:", error);
      setProcessedText("Désolé, une erreur est survenue lors de la simplification. Le texte original sera utilisé pour la lecture.");
      toast({ title: "Erreur de Simplification", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoadingAI(false);
    }
  };
  
  const handlePlaySpeech = () => {
    if (!synthesis) {
      toast({ title: "Synthèse vocale non supportée", description: "Votre navigateur ne supporte pas la synthèse vocale.", variant: "destructive"});
      return;
    }
    if (synthesis.speaking) {
      synthesis.cancel(); // Stop current speech before starting new
    }

    const textToSpeak = processedText.trim() || inputText.trim();
    if (!textToSpeak) {
      toast({ title: "Aucun texte à lire", variant: "destructive" });
      return;
    }

    utteranceRef.current = new SpeechSynthesisUtterance(textToSpeak);
    utteranceRef.current.lang = 'fr-FR'; // Assume French for now
    utteranceRef.current.rate = speechRate;
    
    utteranceRef.current.onstart = () => setIsSpeaking(true);
    utteranceRef.current.onend = () => setIsSpeaking(false);
    utteranceRef.current.onerror = (event) => {
      console.error("Speech synthesis error:", event.error);
      setIsSpeaking(false);
      toast({ title: "Erreur de lecture", description: `Impossible de lire le texte: ${event.error}`, variant: "destructive"});
    };
    
    synthesis.speak(utteranceRef.current);
  };

  const handleStopSpeech = () => {
    if (synthesis && synthesis.speaking) {
      synthesis.cancel();
    }
    setIsSpeaking(false);
  };


  const intensityDescription = () => {
    if (intensity <= 2) return "Simplification légère du texte, vitesse de lecture plus lente.";
    if (intensity <= 4) return "Simplification modérée, vitesse de lecture normale.";
    return "Simplification marquée pour une lecture facile, vitesse de lecture plus rapide.";
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary flex items-center gap-2">
          <BookOpenText className="h-8 w-8" /> Lecteur Immersif Magique
        </CardTitle>
        <CardDescription>Collez votre texte et laissez le Génie vous aider à le lire plus facilement grâce à la simplification et la synthèse vocale. L'intensité ajuste la simplification et la vitesse de lecture.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <IntensitySelector value={intensity} onChange={setIntensity} />
        <p className="text-sm text-muted-foreground text-center -mt-4 h-5">{intensityDescription()}</p>
        
        <div>
          <Label htmlFor="input-text-immersive" className="block text-sm font-medium text-foreground mb-1">
            Collez votre texte ici :
          </Label>
          <Textarea
            id="input-text-immersive"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setProcessedText(''); // Clear processed text if input changes
              if (synthesis?.speaking) synthesis.cancel();
              setIsSpeaking(false);
            }}
            placeholder="Écrivez ou collez le texte que vous souhaitez lire..."
            rows={10}
            className="w-full p-3 text-base leading-relaxed rounded-md shadow-inner bg-background focus:ring-primary"
            disabled={isLoadingAI || isSpeaking}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleProcessText} disabled={isLoadingAI || !inputText.trim() || isSpeaking} className="w-full sm:flex-1">
            {isLoadingAI ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
            Préparer le Texte avec le Génie
          </Button>
           <Button onClick={handlePlaySpeech} disabled={isLoadingAI || (!processedText.trim() && !inputText.trim()) || isSpeaking} className="w-full sm:flex-1">
            <Volume2 className="mr-2 h-5 w-5" /> Lire le Texte
          </Button>
          <Button onClick={handleStopSpeech} disabled={!isSpeaking} variant="outline" className="w-full sm:flex-1">
            <StopCircle className="mr-2 h-5 w-5" /> Arrêter la Lecture
          </Button>
        </div>
        
        <div>
            <Label htmlFor="speech-rate-slider" className="text-sm font-medium text-foreground">
                Vitesse de lecture (actuellement: {speechRate.toFixed(1)}x)
                <Info className="inline h-3 w-3 ml-1 text-muted-foreground cursor-help" title="La vitesse est aussi influencée par le niveau d'Énergie Magique."/>
            </Label>
            <Slider
                id="speech-rate-slider"
                min={0.5} max={2} step={0.1}
                value={[speechRate]}
                onValueChange={(value) => setSpeechRate(value[0])}
                className="w-full mt-1"
                disabled={isSpeaking}
            />
        </div>


        {(processedText || inputText) && (
          <div className="space-y-2 pt-4">
            <h3 className="text-xl font-semibold text-primary">
              {processedText ? "Texte préparé pour la lecture :" : "Texte à lire :"}
            </h3>
            <Card className="bg-muted/30 p-4 shadow-inner">
              <CardContent className="text-base leading-relaxed whitespace-pre-wrap prose dark:prose-invert max-w-none">
                <p>{processedText || inputText}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {!user && (
          <Card className="mt-4 p-4 bg-yellow-50 border-yellow-300 text-yellow-700 text-center">
            <Info className="h-6 w-6 mx-auto mb-1" />
            <p className="font-medium">Connectez-vous pour une expérience complète et sauvegarder vos préférences (fonctionnalité à venir).</p>
          </Card>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">
          Astuce : Utilisez l'Énergie Magique pour ajuster la simplification du texte et la vitesse de lecture à vos besoins.
        </p>
      </CardFooter>
    </Card>
  );
}

