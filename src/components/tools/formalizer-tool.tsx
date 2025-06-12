
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IntensitySelector } from '@/components/intensity-selector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Wand2, ClipboardCopy, Loader2, Mic, Download } from 'lucide-react'; // Ajout de Download
import { useToast } from "@/hooks/use-toast";
import type { FormalizerStyle } from '@/types';
import { formalizeText } from '@/ai/flows/formalize-text-flow';
import { useAuth } from '@/contexts/AuthContext'; // Pour l'email utilisateur

const formalizerStyles: FormalizerStyle[] = [
  "Plus professionnel",
  "Plus concis",
  "Plus amical",
  "Moins formel / Plus décontracté",
  "Plus direct",
  "Plus diplomate",
  "Simplifier (ELI5)",
  "Transformer en liste à puces",
  "Transformer en e-mail court",
  "Rendre sarcastique"
];

const intensityDescriptions: { [key: number]: string } = {
  1: "Ajustements mineurs, ton légèrement adapté.",
  2: "Modifications légères pour correspondre au style.",
  3: "Transformation standard vers le style choisi.",
  4: "Réécriture significative, style très marqué.",
  5: "Transformation extrême, peut exagérer le style."
};


export function FormalizerTool() {
  const [intensity, setIntensity] = useState<number>(3);
  const [inputText, setInputText] = useState<string>('');
  const [outputText, setOutputText] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<FormalizerStyle>(formalizerStyles[0]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const { user } = useAuth(); // Récupérer l'utilisateur pour l'email

  const [isListeningInputText, setIsListeningInputText] = useState<boolean>(false);
  const recognitionRefInputText = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRefInputText.current = new SpeechRecognition();
      recognitionRefInputText.current.continuous = false;
      recognitionRefInputText.current.interimResults = false;
      recognitionRefInputText.current.lang = 'fr-FR';

      recognitionRefInputText.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => prev ? prev + ' ' + transcript : transcript);
        toast({ title: "Texte ajouté !", description: "Votre voix a été transcrite." });
      };
      recognitionRefInputText.current.onerror = (event: any) => {
        console.error("Speech recognition error (InputText)", event.error);
        toast({ title: "Erreur de reconnaissance", description: `Le génie n'a pas pu comprendre: ${event.error}`, variant: "destructive" });
      };
      recognitionRefInputText.current.onend = () => {
        setIsListeningInputText(false);
      };
    } else {
      console.warn("Speech Recognition API not supported in this browser.");
    }
    return () => {
      if (recognitionRefInputText.current) {
        recognitionRefInputText.current.stop();
      }
    };
  }, [toast]);

  useEffect(() => {
    if (isListeningInputText && recognitionRefInputText.current) {
      try {
        recognitionRefInputText.current.start();
      } catch (e) {
        setIsListeningInputText(false);
        toast({ title: "Erreur Micro", description: "Impossible de démarrer l'écoute pour le texte original.", variant: "destructive" });
      }
    } else if (!isListeningInputText && recognitionRefInputText.current) {
      recognitionRefInputText.current.stop();
    }
  }, [isListeningInputText, toast]);

  const handleToggleListeningInputText = () => {
    if (!recognitionRefInputText.current) {
      toast({ title: "Micro non supporté", description: "La saisie vocale n'est pas disponible sur ce navigateur.", variant: "destructive" });
      return;
    }
    setIsListeningInputText(prev => !prev);
  };


  const handleFormalize = async () => {
    if (!inputText.trim()) {
      toast({
        title: "Texte manquant",
        description: "Veuillez entrer du texte à formaliser.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setOutputText('');
    try {
      const result = await formalizeText({
        textToFormalize: inputText,
        targetStyle: selectedStyle,
        intensityLevel: intensity,
      });
      setOutputText(result.formalizedText);
      toast({
        title: "Texte transformé !",
        description: "Votre texte a été modifié par le génie.",
      });
    } catch (error) {
      console.error("Error formalizing text:", error);
      toast({
        title: "Erreur de Magie",
        description: "Le génie n'a pas pu transformer votre texte. Veuillez réessayer.",
        variant: "destructive",
      });
      setOutputText("Désolé, une erreur est survenue lors de la transformation. Le génie s'excuse !");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    toast({
      title: "Copié !",
      description: "Le texte transformé a été copié dans le presse-papiers.",
    });
  };

  const handleDownloadText = () => {
    if (!outputText) return;
    const userEmailPart = user?.email?.split('@')[0] || 'invite';
    const date = new Date();
    const formattedDate = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
    const filename = `formaliseur-${formattedDate}-${userEmailPart}.txt`;
    
    const blob = new Blob([outputText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Téléchargement lancé", description: `Fichier ${filename} sauvegardé.` });
  };
  
  const currentIntensityDescription = intensityDescriptions[intensity] || "Le génie adapte son effort à votre demande.";

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary flex items-center gap-2">
          <Wand2 className="h-8 w-8" /> Formaliseur Magique
        </CardTitle>
        <CardDescription>Transformez vos pensées chaotiques en écrits clairs et adaptés, ou vice-versa ! Le génie jongle avec les mots pour vous.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <IntensitySelector value={intensity} onChange={setIntensity} />
         <p className="text-sm text-muted-foreground h-5 -mt-2 text-center">{currentIntensityDescription}</p>
        
        <div>
          <Label htmlFor="input-text" className="block text-sm font-medium text-foreground mb-1">Votre texte original :</Label>
           <div className="relative">
            <Textarea
              id="input-text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Écrivez ou collez votre texte ici..."
              rows={8}
              className="w-full p-3 text-base leading-relaxed rounded-md shadow-inner bg-background focus:ring-primary pr-12" 
              disabled={isLoading || (isListeningInputText)}
            />
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={handleToggleListeningInputText}
              className={`absolute top-3 right-3 text-muted-foreground hover:text-primary ${isListeningInputText ? 'text-red-500 animate-pulse' : ''}`}
              aria-label={isListeningInputText ? "Arrêter l'écoute" : "Démarrer l'écoute vocale pour le texte original"}
              disabled={isLoading || !recognitionRefInputText.current}
            >
              <Mic className="h-6 w-6" />
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="style-select" className="block text-sm font-medium text-foreground mb-1">Rendre mon texte :</Label>
          <Select value={selectedStyle} onValueChange={(value) => setSelectedStyle(value as FormalizerStyle)} disabled={isLoading || isListeningInputText}>
            <SelectTrigger id="style-select" className="w-full">
              <SelectValue placeholder="Choisissez un style" />
            </SelectTrigger>
            <SelectContent>
              {formalizerStyles.map(style => (
                <SelectItem key={style} value={style}>{style}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleFormalize} disabled={isLoading || isListeningInputText || !inputText.trim()} className="w-full text-lg py-3">
          {isLoading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-5 w-5" />
          )}
          Transformer le Texte
        </Button>

        <div>
          <div className="flex justify-between items-center mb-1">
            <Label htmlFor="output-text" className="block text-sm font-medium text-foreground">Texte transformé par le Génie :</Label>
            {outputText && (
                <div className="flex gap-1">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleCopyToClipboard} 
                        className="text-muted-foreground hover:text-primary h-7 w-7"
                        aria-label="Copier le texte transformé"
                    >
                        <ClipboardCopy className="h-4 w-4" />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleDownloadText} 
                        className="text-muted-foreground hover:text-primary h-7 w-7"
                        aria-label="Télécharger le texte transformé"
                    >
                        <Download className="h-4 w-4" />
                    </Button>
                </div>
            )}
          </div>
          <Textarea
            id="output-text"
            value={outputText}
            readOnly
            placeholder="Votre texte transformé apparaîtra ici..."
            rows={8}
            className="w-full p-3 text-base leading-relaxed rounded-md shadow-inner bg-muted/50 focus:ring-primary"
          />
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">
          Le génie reformule vos textes avec la nuance désirée. Pratique pour adapter vos communications !
        </p>
      </CardFooter>
    </Card>
  );
}

