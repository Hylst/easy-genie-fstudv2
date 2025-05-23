
"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IntensitySelector } from '@/components/intensity-selector';
import { Save, Trash2, Download, Wand2, Mic, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { analyzeBrainDump } from '@/ai/flows/analyze-brain-dump-flow'; // Will create this

const BRAIN_DUMP_STORAGE_KEY = "easyGenieBrainDump";

export function BrainDumpTool() {
  const [intensity, setIntensity] = useState<number>(3);
  const [dumpText, setDumpText] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const { toast } = useToast();
  const recognitionRef = useRef<any>(null); // For SpeechRecognition instance

  useEffect(() => {
    const savedDump = localStorage.getItem(BRAIN_DUMP_STORAGE_KEY);
    if (savedDump) {
      setDumpText(savedDump);
    }

    // Initialize SpeechRecognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'fr-FR';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setDumpText(prev => prev ? prev + ' ' + transcript : transcript);
        setIsListening(false);
        toast({ title: "Texte ajouté !", description: "Votre voix a été transcrite." });
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        toast({ title: "Erreur de reconnaissance", description: `Le génie n'a pas pu comprendre: ${event.error}`, variant: "destructive" });
      };
      
      recognitionRef.current.onend = () => {
        if (isListening) { // if it ended prematurely by itself
            setIsListening(false);
        }
      };

    } else {
      console.warn("Speech Recognition API not supported in this browser.");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []); // Empty dependency array, runs once on mount

 useEffect(() => {
    // Control listening state
    if (recognitionRef.current) {
      if (isListening) {
        try {
            recognitionRef.current.start();
        } catch (e) {
            // Could be AbortError if start() is called while already started, or other issues.
            console.error("Error starting recognition:", e);
            setIsListening(false);
            toast({title: "Erreur Micro", description: "Impossible de démarrer l'écoute.", variant: "destructive"});
        }
      } else {
        recognitionRef.current.stop();
      }
    }
  }, [isListening]);


  const handleSave = () => {
    localStorage.setItem(BRAIN_DUMP_STORAGE_KEY, dumpText);
    toast({
        title: "Pensées sauvegardées !",
        description: "Votre Brain Dump a été sauvegardé localement.",
    });
  };

  const handleClear = () => {
    setDumpText('');
    setAnalysisResult('');
    localStorage.removeItem(BRAIN_DUMP_STORAGE_KEY);
    toast({
        title: "Zone de vidage nettoyée !",
        variant: "destructive",
    });
  };

  const handleDownload = () => {
    const contentToDownload = `Brain Dump:\n${dumpText}\n\nAnalyse du Génie (Niveau ${intensity}):\n${analysisResult || 'Aucune analyse générée.'}`;
    const blob = new Blob([contentToDownload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'easy-genie-braindump-analyse.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
        title: "Téléchargement lancé",
        description: "Votre Brain Dump et son analyse sont en cours de téléchargement.",
    });
  };

  const handleAnalyze = async () => {
    if (!dumpText.trim()) {
      toast({ title: "Texte manquant", description: "Veuillez écrire quelque chose avant que le génie puisse l'analyser.", variant: "destructive" });
      return;
    }
    setIsAnalyzing(true);
    setAnalysisResult('');
    try {
      const result = await analyzeBrainDump({ brainDumpText: dumpText, intensityLevel: intensity });
      setAnalysisResult(result.analysis);
      toast({ title: "Analyse terminée !", description: "Le génie a examiné vos pensées." });
    } catch (error) {
      console.error("Error analyzing brain dump:", error);
      setAnalysisResult("Désolé, une erreur est survenue pendant l'analyse. Le génie est confus.");
      toast({ title: "Erreur d'analyse", description: "Le génie n'a pas pu analyser votre texte. Essayez à nouveau.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleListening = () => {
    if (!recognitionRef.current) {
      toast({ title: "Micro non supporté", description: "La saisie vocale n'est pas disponible sur ce navigateur.", variant: "destructive" });
      return;
    }
    setIsListening(prev => !prev);
 };


  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">BrainDump Magique</CardTitle>
        <CardDescription>Un espace pour vider votre esprit. Écrivez ou dictez tout ce qui vous passe par la tête. Le génie peut ensuite analyser et organiser vos pensées selon le niveau de magie choisi.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <IntensitySelector value={intensity} onChange={setIntensity} />
        
        <div>
          <label htmlFor="braindump-area" className="sr-only">Zone de Brain Dump</label>
          <div className="relative">
            <Textarea
              id="braindump-area"
              value={dumpText}
              onChange={(e) => setDumpText(e.target.value)}
              placeholder="Laissez vos pensées s'écouler ici... idées, tâches, soucis, inspirations..."
              rows={15}
              className="w-full p-4 text-lg leading-relaxed rounded-md shadow-inner bg-background focus:ring-primary pr-12" // Added pr-12 for mic button
            />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleToggleListening}
              className={`absolute top-3 right-3 text-muted-foreground hover:text-primary ${isListening ? 'text-red-500 animate-pulse' : ''}`}
              aria-label={isListening ? "Arrêter l'écoute" : "Démarrer l'écoute vocale"}
              disabled={!recognitionRef.current}
            >
              <Mic className="h-6 w-6" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <Button onClick={handleAnalyze} disabled={isAnalyzing || !dumpText.trim()} className="w-full sm:w-auto text-lg py-3">
            {isAnalyzing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
            Analyser par le Génie
          </Button>
          <div className="flex gap-2">
            <Button onClick={handleSave} variant="outline"><Save className="mr-2 h-4 w-4" /> Sauvegarder</Button>
            <Button onClick={handleDownload} variant="outline" disabled={!dumpText.trim()}><Download className="mr-2 h-4 w-4" /> Télécharger</Button>
            <Button onClick={handleClear} variant="destructive" disabled={!dumpText.trim() && !analysisResult.trim()}><Trash2 className="mr-2 h-4 w-4" /> Effacer</Button>
          </div>
        </div>
        
        {analysisResult && (
          <div className="space-y-2 pt-4">
            <h3 className="text-xl font-semibold text-primary">Analyse du Génie :</h3>
            <Card className="bg-muted/50 p-4 ">
              <CardContent className="text-sm whitespace-pre-wrap">{analysisResult}</CardContent>
            </Card>
          </div>
        )}

      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">
            {intensity <= 2 ? "Le génie attend vos pensées pour une analyse légère." : 
             intensity <= 4 ? "Le génie peut vous aider à structurer vos idées." :
             "Le génie est prêt pour une analyse approfondie et des suggestions détaillées."}
        </p>
      </CardFooter>
    </Card>
  );
}

    