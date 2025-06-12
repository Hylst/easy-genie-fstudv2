
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IntensitySelector } from '@/components/intensity-selector';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Play, StopCircle, Loader2, Wand2, Settings2, Info, BookOpenText, Sparkles, Brain, ClipboardPaste, Mic } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { simplifyText } from '@/ai/flows/simplify-text-flow';
import { useAuth } from '@/contexts/AuthContext';
import type { ImmersiveReaderSettings } from '@/types';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';

const DEFAULT_SPEECH_RATE_GENIE = 1;
const IMMERSIVE_READER_SETTINGS_KEY = "easyGenieImmersiveReaderSettings_v1";
const IMMERSIVE_READER_MODE_KEY = "easyGenieImmersiveReaderMode_v1";

const defaultDisplaySettings: ImmersiveReaderSettings = {
  fontSize: 18,
  fontFamily: 'System',
  lineHeight: 1.6,
  letterSpacing: 0.5,
  wordSpacing: 1,
  theme: 'light',
  focusMode: 'none',
};

const VALID_FONT_FAMILIES: ImmersiveReaderSettings['fontFamily'][] = ['System', 'Sans-Serif', 'Serif', 'OpenDyslexic'];


export function ImmersiveReaderTool() {
  const [intensity, setIntensity] = useState<number>(3);
  const [inputText, setInputText] = useState<string>('');
  const [processedText, setProcessedText] = useState<string>('');
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [toolMode, setToolMode] = useState<'magique' | 'genie'>('magique');

  const { toast } = useToast();
  const { user } = useAuth();

  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(DEFAULT_SPEECH_RATE_GENIE);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;

  const [displaySettings, setDisplaySettings] = useState<ImmersiveReaderSettings>(defaultDisplaySettings);
  const [showSettingsDialog, setShowSettingsDialog] = useState<boolean>(false);
  const [words, setWords] = useState<string[]>([]);
  const [currentWordCharIndex, setCurrentWordCharIndex] = useState<number>(-1);

  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem(IMMERSIVE_READER_SETTINGS_KEY);
      if (savedSettings) {
        try { 
          const parsedSettings = JSON.parse(savedSettings) as ImmersiveReaderSettings;
          // Ensure fontFamily is valid, fallback if not
          if (!VALID_FONT_FAMILIES.includes(parsedSettings.fontFamily)) {
            parsedSettings.fontFamily = defaultDisplaySettings.fontFamily;
          }
          setDisplaySettings(parsedSettings); 
        }
        catch (e) { 
          console.error("Failed to parse saved display settings:", e); 
          localStorage.removeItem(IMMERSIVE_READER_SETTINGS_KEY); 
          setDisplaySettings(defaultDisplaySettings);
        }
      } else {
        setDisplaySettings(defaultDisplaySettings);
      }
      const savedMode = localStorage.getItem(IMMERSIVE_READER_MODE_KEY);
      if (savedMode === 'genie' || savedMode === 'magique') { setToolMode(savedMode as 'magique' | 'genie'); }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') { localStorage.setItem(IMMERSIVE_READER_SETTINGS_KEY, JSON.stringify(displaySettings)); }
  }, [displaySettings]);

  useEffect(() => {
    if (typeof window !== 'undefined') { localStorage.setItem(IMMERSIVE_READER_MODE_KEY, toolMode); }
  }, [toolMode]);

  useEffect(() => {
    return () => { if (synthesis && synthesis.speaking) { synthesis.cancel(); } };
  }, [synthesis]);

  useEffect(() => {
    if (synthesis && synthesis.speaking && !isSpeaking) { synthesis.cancel(); }
  }, [isSpeaking, synthesis]);

  useEffect(() => {
    const textToDisplay = processedText.trim() || inputText.trim();
    setWords(textToDisplay.split(/(\s+)/).filter(Boolean));
    setCurrentWordCharIndex(-1);
    if (synthesis?.speaking) synthesis.cancel();
    setIsSpeaking(false);
  }, [inputText, processedText, synthesis]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'fr-FR';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => (prev ? prev + ' ' : '') + transcript);
        toast({ title: "Texte ajouté !", description: "Votre voix a été transcrite." });
      };
      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        toast({ title: "Erreur de reconnaissance", description: `Le génie n'a pas pu comprendre: ${event.error}`, variant: "destructive" });
      };
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      console.warn("Speech Recognition API not supported in this browser.");
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  useEffect(() => {
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        setIsListening(false);
        toast({ title: "Erreur Micro", description: "Impossible de démarrer l'écoute.", variant: "destructive" });
      }
    } else if (!isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [isListening, toast]);

  const handleToggleListening = () => {
    if (!recognitionRef.current) {
      toast({ title: "Micro non supporté", description: "La saisie vocale n'est pas disponible.", variant: "destructive" });
      return;
    }
    setIsListening(prev => !prev);
  };


  const handleProcessText = async () => {
    if (!inputText.trim()) {
      toast({ title: "Texte manquant", description: "Veuillez entrer du texte à préparer.", variant: "destructive" });
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
      setProcessedText(inputText); // Fallback to original text on error
      toast({ title: "Erreur de Simplification", description: (error as Error).message + " Le texte original sera utilisé.", variant: "destructive" });
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handlePlaySpeech = () => {
    if (!synthesis) {
      toast({ title: "Synthèse vocale non supportée", variant: "destructive"});
      return;
    }
    if (synthesis.speaking) { synthesis.cancel(); }

    const textToSpeak = processedText.trim() || inputText.trim();
    if (!textToSpeak) {
      toast({ title: "Aucun texte à lire", variant: "destructive" });
      return;
    }

    utteranceRef.current = new SpeechSynthesisUtterance(textToSpeak);
    utteranceRef.current.lang = 'fr-FR';

    if (toolMode === 'genie') {
      utteranceRef.current.rate = speechRate;
      utteranceRef.current.onboundary = (event) => {
        if (event.name === 'word') { setCurrentWordCharIndex(event.charIndex); }
      };
    } else { // 'magique' mode
      const baseRate = 0.7;
      const rateIncrement = (1.3 - 0.7) / 4; 
      utteranceRef.current.rate = Math.max(0.5, Math.min(2, baseRate + (intensity - 1) * rateIncrement));
      utteranceRef.current.onboundary = null; 
    }

    utteranceRef.current.onstart = () => setIsSpeaking(true);
    utteranceRef.current.onend = () => { setIsSpeaking(false); setCurrentWordCharIndex(-1); };
    utteranceRef.current.onerror = (event) => {
      if (event.error === 'interrupted') {
        console.info("Speech synthesis interrupted:", event.error);
      } else {
        console.error("Speech synthesis error:", event.error);
        toast({ title: "Erreur de lecture", description: `Impossible de lire le texte: ${event.error}`, variant: "destructive"});
      }
      setIsSpeaking(false);
      setCurrentWordCharIndex(-1);
    };

    synthesis.speak(utteranceRef.current);
  };

  const handleStopSpeech = () => {
    if (synthesis && synthesis.speaking) { synthesis.cancel(); }
    setIsSpeaking(false);
    setCurrentWordCharIndex(-1);
  };

  const getIntensityDescription = () => {
    if (toolMode === 'genie') {
      if (intensity <= 2) return "Simplification IA légère du texte.";
      if (intensity <= 4) return "Simplification IA modérée.";
      return "Simplification IA marquée pour une lecture facile.";
    } else { 
      if (intensity <= 2) return "Simplification IA légère, vitesse de lecture plus lente.";
      if (intensity <= 4) return "Simplification IA modérée, vitesse de lecture normale.";
      return "Simplification IA marquée, vitesse de lecture plus rapide.";
    }
  };

  const handleSettingChange = (setting: keyof ImmersiveReaderSettings, value: any) => {
    setDisplaySettings(prev => ({ ...prev, [setting]: value }));
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        toast({ title: "Fonctionnalité non supportée", description: "Votre navigateur ne permet pas de coller depuis le presse-papiers de cette manière.", variant: "destructive" });
        return;
      }
      const text = await navigator.clipboard.readText();
      setInputText(prev => prev ? prev + '\n' + text : text);
      setProcessedText(''); 
      toast({ title: "Texte collé !", description: "Le contenu du presse-papiers a été ajouté." });
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
      toast({ title: "Erreur de collage", description: "Impossible de lire le contenu du presse-papiers. Vérifiez les permissions.", variant: "destructive" });
    }
  };

  const textDisplayStyles = toolMode === 'genie' ? {
    fontSize: `${displaySettings.fontSize}px`,
    fontFamily: displaySettings.fontFamily === 'System' ? 'inherit' : `'${displaySettings.fontFamily}'`,
    lineHeight: displaySettings.lineHeight,
    letterSpacing: `${displaySettings.letterSpacing}px`,
    wordSpacing: `${displaySettings.wordSpacing}px`,
    backgroundColor: displaySettings.theme === 'dark' ? 'hsl(var(--card-foreground) / 0.95)' : displaySettings.theme === 'sepia' ? '#FBF0D9' : 'hsl(var(--card))',
    color: displaySettings.theme === 'dark' ? 'hsl(var(--card))' : displaySettings.theme === 'sepia' ? '#5B4636' : 'hsl(var(--card-foreground))',
    padding: '1rem',
    borderRadius: 'var(--radius)',
  } : {
    padding: '1rem', 
    borderRadius: 'var(--radius)',
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-3xl font-bold text-primary flex items-center gap-2">
                <BookOpenText className="h-8 w-8" /> Lecteur Immersif
                {toolMode === 'magique' ? <Sparkles className="h-6 w-6 text-accent" /> : <Brain className="h-6 w-6 text-accent" />}
                </CardTitle>
                <CardDescription>
                    {toolMode === 'magique'
                    ? "Mode Magique : Simplification IA et lecture à voix haute à vitesse variable."
                    : "Mode Génie : Personnalisation avancée de l'affichage et surlignage synchronisé."}
                </CardDescription>
            </div>
            <div className="flex items-center space-x-2 pt-1">
                <Label htmlFor="tool-mode-switch" className="text-sm text-muted-foreground">
                    {toolMode === 'magique' ? "Magique" : "Génie"}
                </Label>
                <Switch
                    id="tool-mode-switch"
                    checked={toolMode === 'genie'}
                    onCheckedChange={(checked) => setToolMode(checked ? 'genie' : 'magique')}
                    aria-label={`Passer en mode ${toolMode === 'magique' ? 'Génie' : 'Magique'}`}
                    disabled={isSpeaking || isLoadingAI}
                />
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <IntensitySelector value={intensity} onChange={setIntensity} />
        <p className="text-sm text-muted-foreground text-center -mt-4 h-5">{getIntensityDescription()}</p>

        <div>
            <div className="flex justify-between items-center mb-1">
                <Label htmlFor="input-text-immersive" className="block text-sm font-medium text-foreground">
                    Collez votre texte ou dictez-le :
                </Label>
                <div className="flex gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handlePasteFromClipboard}
                        className="h-7 w-7"
                        aria-label="Coller le texte depuis le presse-papiers"
                        disabled={isLoadingAI || isSpeaking || isListening}
                    >
                        <ClipboardPaste className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleToggleListening}
                        className={`h-7 w-7 ${isListening ? 'text-red-500 animate-pulse' : ''}`}
                        aria-label={isListening ? "Arrêter la dictée" : "Démarrer la dictée vocale"}
                        disabled={isLoadingAI || isSpeaking || !recognitionRef.current}
                    >
                        <Mic className="h-4 w-4" />
                    </Button>
                </div>
            </div>
          <Textarea
            id="input-text-immersive"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setProcessedText('');
            }}
            placeholder="Écrivez ou collez le texte que vous souhaitez lire..."
            rows={10}
            className="w-full p-3 text-base leading-relaxed rounded-md shadow-inner bg-background focus:ring-primary"
            disabled={isLoadingAI || isSpeaking || isListening}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <Button onClick={handleProcessText} disabled={isLoadingAI || !inputText.trim() || isSpeaking} className="w-full sm:flex-1">
            {isLoadingAI ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
            Préparer le Texte
          </Button>
          <Button onClick={handlePlaySpeech} disabled={isLoadingAI || (!processedText.trim() && !inputText.trim()) || isSpeaking} className="w-full sm:flex-1">
            <Play className="mr-2 h-5 w-5" /> Lire le Texte
          </Button>
          <Button onClick={handleStopSpeech} disabled={!isSpeaking} variant="outline" className="w-full sm:flex-1">
            <StopCircle className="mr-2 h-5 w-5" /> Arrêter la Lecture
          </Button>
        </div>

        {toolMode === 'genie' && (
            <>
                <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-full" disabled={isSpeaking}><Settings2 className="mr-2 h-4 w-4" />Paramètres d'Affichage</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[480px]">
                        <DialogHeader><DialogTitle>Paramètres d'Affichage (Mode Génie)</DialogTitle></DialogHeader>
                        <ScrollArea className="max-h-[60vh] overflow-y-auto pr-2 -mr-2 py-4">
                            <div className="grid gap-4">
                                <div>
                                    <Label htmlFor="fontSize" className="text-sm">Taille de Police: {displaySettings.fontSize}px</Label>
                                    <Slider id="fontSize" min={12} max={32} step={1} value={[displaySettings.fontSize]} onValueChange={(val) => handleSettingChange('fontSize', val[0])} />
                                </div>
                                <div>
                                    <Label htmlFor="fontFamily" className="text-sm">Police</Label>
                                    <Select value={displaySettings.fontFamily} onValueChange={(val) => handleSettingChange('fontFamily', val as ImmersiveReaderSettings['fontFamily'])}>
                                        <SelectTrigger id="fontFamily"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="System">Système</SelectItem>
                                            <SelectItem value="Sans-Serif">Sans-Serif</SelectItem>
                                            <SelectItem value="Serif">Serif</SelectItem>
                                            <SelectItem value="OpenDyslexic">OpenDyslexic</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="lineHeight" className="text-sm">Hauteur de Ligne: {displaySettings.lineHeight.toFixed(1)}</Label>
                                    <Slider id="lineHeight" min={1.2} max={2.5} step={0.1} value={[displaySettings.lineHeight]} onValueChange={(val) => handleSettingChange('lineHeight', val[0])} />
                                </div>
                                <div>
                                    <Label htmlFor="letterSpacing" className="text-sm">Espacement Lettres: {displaySettings.letterSpacing}px</Label>
                                    <Slider id="letterSpacing" min={0} max={5} step={0.1} value={[displaySettings.letterSpacing]} onValueChange={(val) => handleSettingChange('letterSpacing', val[0])} />
                                </div>
                                <div>
                                    <Label htmlFor="wordSpacing" className="text-sm">Espacement Mots: {displaySettings.wordSpacing}px</Label>
                                    <Slider id="wordSpacing" min={0} max={10} step={0.5} value={[displaySettings.wordSpacing]} onValueChange={(val) => handleSettingChange('wordSpacing', val[0])} />
                                </div>
                                <div>
                                    <Label htmlFor="theme" className="text-sm">Thème Couleur</Label>
                                    <Select value={displaySettings.theme as string} onValueChange={(val) => handleSettingChange('theme', val as ImmersiveReaderSettings['theme'])}>
                                        <SelectTrigger id="theme"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="light">Clair (Défaut)</SelectItem>
                                            <SelectItem value="dark">Sombre</SelectItem>
                                            <SelectItem value="sepia">Sépia</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </ScrollArea>
                        <DialogFooter><DialogClose asChild><Button type="button">Fermer</Button></DialogClose></DialogFooter>
                    </DialogContent>
                </Dialog>

                <div>
                    <Label htmlFor="speech-rate-slider-genie" className="text-sm font-medium text-foreground">
                        Vitesse de lecture (Génie): {speechRate.toFixed(1)}x
                    </Label>
                    <Slider
                        id="speech-rate-slider-genie"
                        min={0.5} max={2} step={0.1}
                        value={[speechRate]}
                        onValueChange={(value) => setSpeechRate(value[0])}
                        className="w-full mt-1"
                        disabled={isSpeaking}
                    />
                </div>
            </>
        )}


        {(processedText || inputText) && (
          <div className="space-y-2 pt-4">
            <h3 className="text-xl font-semibold text-primary">
              {processedText && inputText !== processedText ? "Texte préparé pour la lecture :" : "Texte à lire :"}
            </h3>
            <Card className="bg-card shadow-inner">
              <div
                className={cn(
                    "text-base leading-relaxed whitespace-pre-wrap max-w-none min-h-[100px]",
                    toolMode === 'magique' && "prose dark:prose-invert" 
                  )}
                style={textDisplayStyles}
              >
                {toolMode === 'genie' && words.length > 0 ? (
                  words.map((word, index) => {
                    let wordStartIndex = 0;
                    for (let i = 0; i < index; i++) { wordStartIndex += words[i].length; }
                    const isCurrentWord = currentWordCharIndex !== -1 &&
                                          wordStartIndex <= currentWordCharIndex &&
                                          currentWordCharIndex < wordStartIndex + word.length &&
                                          word.trim() !== '';
                    return (
                      <span key={index} className={isCurrentWord ? "bg-primary/40 dark:bg-primary/60 rounded px-0.5" : ""}>
                        {word}
                      </span>
                    );
                  })
                ) : (
                  <p>{processedText || inputText}</p>
                )}
              </div>
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
          {toolMode === 'genie'
            ? "Utilisez les paramètres pour ajuster l'affichage à vos besoins."
            : "L'intensité magique ajuste la simplification du texte et la vitesse de lecture."}
        </p>
      </CardFooter>
    </Card>
  );
}

