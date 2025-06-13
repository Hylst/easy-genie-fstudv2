
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IntensitySelector } from '@/components/intensity-selector';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Play, StopCircle, Loader2, Wand2, Settings2, Info, BookOpenText as BookOpenTextIcon, Sparkles, Brain, ClipboardPaste, Mic, Save, Trash2, TextQuote } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { simplifyText } from '@/ai/flows/simplify-text-flow';
import { useAuth } from '@/contexts/AuthContext';
import type { ImmersiveReaderSettings, ImmersiveReaderDisplayPreset } from '@/types';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';


const DEFAULT_SPEECH_RATE_GENIE = 1;
const IMMERSIVE_READER_SETTINGS_KEY = "easyGenieImmersiveReaderSettings_v2";
const IMMERSIVE_READER_MODE_KEY = "easyGenieImmersiveReaderMode_v1";
const DISPLAY_PRESETS_STORAGE_KEY = "easyGenieImmersiveReaderDisplayPresets_v2";

const VALID_FONT_FAMILIES: ImmersiveReaderSettings['fontFamily'][] = ['System', 'Sans-Serif', 'Serif', 'OpenDyslexic'];

const defaultDisplaySettings: ImmersiveReaderSettings = {
  fontSize: 18,
  fontFamily: 'System',
  lineHeight: 1.6,
  letterSpacing: 0.5,
  wordSpacing: 1,
  theme: 'light',
  focusMode: 'none',
  enableSentenceHighlighting: false, // Default is off
};

interface ParsedTextElement {
  text: string;
  type: 'word' | 'space';
  originalStartIndex: number; 
  originalEndIndex: number;   
  sentenceGroupIndex: number; 
}


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
  
  const [parsedTextElements, setParsedTextElements] = useState<ParsedTextElement[]>([]);
  const [currentWordCharIndex, setCurrentWordCharIndex] = useState<number>(-1); 
  const [currentSpokenWordInfo, setCurrentSpokenWordInfo] = useState<{ originalStartIndex: number, sentenceGroupIndex: number } | null>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  const [displayPresets, setDisplayPresets] = useState<ImmersiveReaderDisplayPreset[]>([]);
  const [isLoadingUserPresets, setIsLoadingUserPresets] = useState<boolean>(false);
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [presetToDelete, setPresetToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem(IMMERSIVE_READER_SETTINGS_KEY);
      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings) as ImmersiveReaderSettings;
          if (!VALID_FONT_FAMILIES.includes(parsedSettings.fontFamily)) {
            parsedSettings.fontFamily = defaultDisplaySettings.fontFamily;
          }
          setDisplaySettings({ ...defaultDisplaySettings, ...parsedSettings });
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

      const savedDisplayPresets = localStorage.getItem(DISPLAY_PRESETS_STORAGE_KEY);
       if (savedDisplayPresets) {
        try {
          const parsedItems = JSON.parse(savedDisplayPresets);
          if (Array.isArray(parsedItems)) {
            const validPresets = parsedItems.filter(
              (p): p is ImmersiveReaderDisplayPreset =>
                p &&
                typeof p.name === 'string' && p.name.trim() !== "" &&
                typeof p.settings === 'object' && p.settings !== null &&
                VALID_FONT_FAMILIES.includes(p.settings.fontFamily) &&
                typeof p.settings.enableSentenceHighlighting === 'boolean'
            );
            setDisplayPresets(validPresets);
          } else { setDisplayPresets([]); }
        } catch (e) {
          console.error("Failed to parse display presets from localStorage:", e);
          localStorage.removeItem(DISPLAY_PRESETS_STORAGE_KEY);
          setDisplayPresets([]);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') { localStorage.setItem(IMMERSIVE_READER_SETTINGS_KEY, JSON.stringify(displaySettings)); }
  }, [displaySettings]);

  useEffect(() => {
    if (typeof window !== 'undefined') { localStorage.setItem(IMMERSIVE_READER_MODE_KEY, toolMode); }
  }, [toolMode]);

  const saveDisplayPresetsToLocalStorage = useCallback((presets: ImmersiveReaderDisplayPreset[]) => {
    if (typeof window !== 'undefined') {
      const presetsToSave = presets.filter(p => p.name && p.name.trim() !== "");
      localStorage.setItem(DISPLAY_PRESETS_STORAGE_KEY, JSON.stringify(presetsToSave));
    }
  }, []);

  useEffect(() => {
    return () => { if (synthesis && synthesis.speaking) { synthesis.cancel(); } };
  }, [synthesis]);

  useEffect(() => {
    if (synthesis && synthesis.speaking && !isSpeaking) { synthesis.cancel(); }
  }, [isSpeaking, synthesis]);

  const generateDisplayElements = useCallback((text: string): ParsedTextElement[] => {
    const elements: ParsedTextElement[] = [];
    if (!text.trim()) return elements;

    let sentenceGroupIndex = 0;
    const sentenceRegex = /([^\.!?]+(?:[\.!?](?=\s+|$)|$))/g;
    let matches;
    const sentenceChunks: { text: string, originalStartIndex: number }[] = [];
    
    let lastIndex = 0;
    while ((matches = sentenceRegex.exec(text)) !== null) {
      sentenceChunks.push({ text: matches[0], originalStartIndex: matches.index });
      lastIndex = matches.index + matches[0].length;
    }
    if (lastIndex < text.length) {
      sentenceChunks.push({ text: text.substring(lastIndex), originalStartIndex: lastIndex });
    }
    if (sentenceChunks.length === 0 && text.trim().length > 0) {
      sentenceChunks.push({ text: text, originalStartIndex: 0 });
    }

    sentenceChunks.forEach(chunk => {
      const sentenceText = chunk.text;
      const sentenceOriginalStartOffset = chunk.originalStartIndex;
      let wordOffsetInSentence = 0;

      sentenceText.split(/(\s+)/).filter(Boolean).forEach(part => {
        elements.push({
          text: part,
          type: /\s+/.test(part) ? 'space' : 'word',
          originalStartIndex: sentenceOriginalStartOffset + wordOffsetInSentence,
          originalEndIndex: sentenceOriginalStartOffset + wordOffsetInSentence + part.length,
          sentenceGroupIndex: sentenceGroupIndex,
        });
        wordOffsetInSentence += part.length;
      });
      sentenceGroupIndex++;
    });
    return elements;
  }, []);

  useEffect(() => {
    const textToParse = toolMode === 'genie' ? (processedText.trim() || inputText.trim()) : '';
    if (toolMode === 'genie') {
      const newElements = generateDisplayElements(textToParse);
      setParsedTextElements(newElements);
      wordRefs.current = new Array(newElements.length).fill(null);
    } else {
      setParsedTextElements([]); 
    }
    setCurrentWordCharIndex(-1);
    setCurrentSpokenWordInfo(null);
    if (synthesis?.speaking) synthesis.cancel();
    setIsSpeaking(false);
  }, [inputText, processedText, toolMode, generateDisplayElements, synthesis]);

  useEffect(() => {
    wordRefs.current = wordRefs.current.slice(0, parsedTextElements.length);
  }, [parsedTextElements]);


  useEffect(() => {
    if (toolMode === 'genie' && isSpeaking && currentSpokenWordInfo && wordRefs.current.length > 0) {
        const currentElementIndex = parsedTextElements.findIndex(el => 
            el.type === 'word' && el.originalStartIndex === currentSpokenWordInfo.originalStartIndex
        );

        if (currentElementIndex !== -1) {
            const targetElement = wordRefs.current[currentElementIndex];
            if (targetElement && typeof targetElement.scrollIntoView === 'function') {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center', 
                    inline: 'nearest'
                });
            }
        }
    }
  }, [currentSpokenWordInfo, parsedTextElements, isSpeaking, toolMode]);


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
      setProcessedText(inputText); 
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
        if (event.name === 'word') { 
          setCurrentWordCharIndex(event.charIndex); 
          const currentElem = parsedTextElements.find(el => el.type === 'word' && el.originalStartIndex <= event.charIndex && event.charIndex < el.originalEndIndex);
          if (currentElem) {
            setCurrentSpokenWordInfo({ originalStartIndex: currentElem.originalStartIndex, sentenceGroupIndex: currentElem.sentenceGroupIndex });
          }
        }
      };
    } else { 
      const baseRate = 0.7;
      const rateIncrement = (1.3 - 0.7) / 4;
      utteranceRef.current.rate = Math.max(0.5, Math.min(2, baseRate + (intensity - 1) * rateIncrement));
      utteranceRef.current.onboundary = null;
      setCurrentSpokenWordInfo(null);
    }

    utteranceRef.current.onstart = () => setIsSpeaking(true);
    utteranceRef.current.onend = () => { setIsSpeaking(false); setCurrentWordCharIndex(-1); setCurrentSpokenWordInfo(null); };
    utteranceRef.current.onerror = (event) => {
      if (event.error === 'interrupted') {
        console.info("Speech synthesis error:", event.error);
      } else {
        console.error("Speech synthesis error:", event.error);
        toast({ title: "Erreur de lecture", description: `Impossible de lire le texte: ${event.error}`, variant: "destructive"});
      }
      setIsSpeaking(false);
      setCurrentWordCharIndex(-1);
      setCurrentSpokenWordInfo(null);
    };

    synthesis.speak(utteranceRef.current);
  };

  const handleStopSpeech = () => {
    if (synthesis && synthesis.speaking) { synthesis.cancel(); }
    setIsSpeaking(false);
    setCurrentWordCharIndex(-1);
    setCurrentSpokenWordInfo(null);
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
      setInputText(prev => (prev ? prev + '\n' + text : text));
      setProcessedText(''); // Clear processed text as input has changed
      toast({ title: "Texte collé !", description: "Le contenu du presse-papiers a été ajouté." });
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
      toast({ title: "Erreur de collage", description: "Impossible de lire le contenu du presse-papiers. Vérifiez les permissions.", variant: "destructive" });
    }
  };

  const handleSaveDisplayPreset = () => {
    if (!newPresetName.trim()) {
      toast({ title: "Nom du préréglage requis", variant: "destructive" });
      return;
    }
    const trimmedName = newPresetName.trim();
    if (displayPresets.some(p => p.name === trimmedName)) {
      toast({ title: "Nom déjà utilisé", description: "Ce nom de préréglage existe déjà.", variant: "destructive" });
      return;
    }
    const newPreset: ImmersiveReaderDisplayPreset = { name: trimmedName, settings: displaySettings };
    const updatedPresets = [...displayPresets, newPreset];
    setDisplayPresets(updatedPresets);
    saveDisplayPresetsToLocalStorage(updatedPresets);
    toast({ title: "Préréglage sauvegardé !", description: `"${newPreset.name}" a été ajouté.` });
    setNewPresetName('');
    setShowSavePresetDialog(false);
  };

  const handleLoadDisplayPreset = (presetName: string) => {
    const preset = displayPresets.find(p => p.name === presetName);
    if (preset) {
      setDisplaySettings(preset.settings);
      toast({ title: "Préréglage chargé", description: `Les paramètres de "${preset.name}" ont été appliqués.` });
    }
  };

  const confirmDeleteDisplayPreset = () => {
    if (!presetToDelete) return;
    const updatedPresets = displayPresets.filter(p => p.name !== presetToDelete);
    setDisplayPresets(updatedPresets);
    saveDisplayPresetsToLocalStorage(updatedPresets);
    toast({ title: "Préréglage supprimé", description: `"${presetToDelete}" a été supprimé.`, variant: "destructive" });
    setPresetToDelete(null);
  };


  const textDisplayStyles = toolMode === 'genie' ? {
    fontSize: `${displaySettings.fontSize}px`,
    fontFamily: displaySettings.fontFamily === 'System' ? 'inherit' 
              : displaySettings.fontFamily === 'Sans-Serif' ? 'Arial, Helvetica, sans-serif'
              : displaySettings.fontFamily === 'Serif' ? 'Georgia, "Times New Roman", serif'
              : `'${displaySettings.fontFamily}'`, 
    lineHeight: displaySettings.lineHeight,
    letterSpacing: `${displaySettings.letterSpacing}px`,
    wordSpacing: `${displaySettings.wordSpacing}px`,
  } : {};

  const themeStyles = toolMode === 'genie' ? {
    backgroundColor: displaySettings.theme === 'dark' ? 'hsl(var(--card-foreground) / 0.95)' : displaySettings.theme === 'sepia' ? '#FBF0D9' : 'hsl(var(--card))',
    color: displaySettings.theme === 'dark' ? 'hsl(var(--card))' : displaySettings.theme === 'sepia' ? '#5B4636' : 'hsl(var(--card-foreground))',
  } : {};


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-3xl font-bold text-primary flex items-center gap-2">
                <BookOpenTextIcon className="h-8 w-8" /> Lecteur Immersif
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
                        <Button variant="outline" className="w-full" disabled={isSpeaking}><Settings2 className="mr-2 h-4 w-4" />Paramètres d'Affichage (Mode Génie)</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md md:max-w-lg">
                        <DialogHeader><DialogTitle>Paramètres d'Affichage (Mode Génie)</DialogTitle></DialogHeader>
                        <ScrollArea className="max-h-[70vh] overflow-y-auto pr-3 -mr-3 py-4">
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
                                    <Label htmlFor="letterSpacing" className="text-sm">Espacement Lettres: {displaySettings.letterSpacing.toFixed(1)}px</Label>
                                    <Slider id="letterSpacing" min={0} max={5} step={0.1} value={[displaySettings.letterSpacing]} onValueChange={(val) => handleSettingChange('letterSpacing', val[0])} />
                                </div>
                                <div>
                                    <Label htmlFor="wordSpacing" className="text-sm">Espacement Mots: {displaySettings.wordSpacing.toFixed(1)}px</Label>
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
                                <div className="flex items-center space-x-2 pt-2">
                                  <Switch
                                    id="sentence-highlight-switch"
                                    checked={displaySettings.enableSentenceHighlighting}
                                    onCheckedChange={(checked) => handleSettingChange('enableSentenceHighlighting', checked)}
                                  />
                                  <Label htmlFor="sentence-highlight-switch" className="text-sm flex items-center gap-1">
                                    <TextQuote className="h-4 w-4" /> Surligner la phrase active
                                  </Label>
                                </div>

                                <Separator className="my-2" />

                                <div className="space-y-2">
                                  <h4 className="font-medium text-sm">Gestion des Préréglages d'Affichage</h4>
                                  <div className="flex items-center gap-2">
                                    <Select onValueChange={handleLoadDisplayPreset} value="">
                                      <SelectTrigger className="flex-grow"><SelectValue placeholder="Charger un préréglage..." /></SelectTrigger>
                                      <SelectContent>
                                        {isLoadingUserPresets && <div className="flex justify-center p-2"><Loader2 className="h-5 w-5 animate-spin"/></div>}
                                        {!isLoadingUserPresets && displayPresets.filter(p => p.name && p.name.trim() !== "").length === 0 && (
                                          <p className="p-2 text-sm text-muted-foreground">Aucun préréglage.</p>
                                        )}
                                        {!isLoadingUserPresets && displayPresets.filter(p => p.name && p.name.trim() !== "").map(p => (
                                          <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Button onClick={() => setShowSavePresetDialog(true)} size="icon" variant="outline" aria-label="Sauvegarder le préréglage actuel">
                                      <Save className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  {displayPresets.filter(p => p.name && p.name.trim() !== "").length > 0 && (
                                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto pr-1">
                                      <Label className="text-xs text-muted-foreground">Mes Préréglages :</Label>
                                      {displayPresets.filter(p => p.name && p.name.trim() !== "").map(p => (
                                        <div key={p.name} className="flex items-center justify-between text-sm p-1 hover:bg-muted/30 rounded-md">
                                          <span className="truncate cursor-default" title={p.name}>{p.name}</span>
                                          <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => setPresetToDelete(p.name)}>
                                            <Trash2 className="h-3 w-3 text-destructive" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                            </div>
                        </ScrollArea>
                        <DialogFooter><DialogClose asChild><Button type="button">Fermer</Button></DialogClose></DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Save Preset Dialog */}
                <Dialog open={showSavePresetDialog} onOpenChange={setShowSavePresetDialog}>
                  <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                      <DialogTitle>Sauvegarder le Préréglage</DialogTitle>
                      <DialogDescription>Donnez un nom à vos paramètres d'affichage actuels.</DialogDescription>
                    </DialogHeader>
                    <Input
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder="Ex: Confort Lecture Soir"
                      className="mt-2"
                    />
                    <DialogFooter>
                      <DialogClose asChild><Button variant="outline" onClick={()=>setNewPresetName('')}>Annuler</Button></DialogClose>
                      <Button onClick={handleSaveDisplayPreset} disabled={!newPresetName.trim()}>Sauvegarder</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Confirm Delete Preset Dialog */}
                <AlertDialog open={!!presetToDelete} onOpenChange={(open) => !open && setPresetToDelete(null)}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer le Préréglage ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Êtes-vous sûr de vouloir supprimer le préréglage "{presetToDelete}" ? Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setPresetToDelete(null)}>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={confirmDeleteDisplayPreset}>Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>


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


        {(inputText.trim() || processedText.trim()) && (
           <ScrollArea 
            className="h-[300px] w-full rounded-md border" 
            style={toolMode === 'genie' ? themeStyles : {}}
          >
            <div
              className={cn(
                  "p-4 text-base leading-relaxed whitespace-pre-wrap max-w-none",
                  toolMode === 'magique' && "prose dark:prose-invert"
                )}
              style={toolMode === 'genie' ? textDisplayStyles : {}} 
            >
              {toolMode === 'genie' && parsedTextElements.length > 0 ? (
                parsedTextElements.map((element, index) => {
                  const isCurrentWord = currentSpokenWordInfo !== null &&
                                        element.type === 'word' &&
                                        element.originalStartIndex === currentSpokenWordInfo.originalStartIndex;
                  
                  const isInCurrentSentenceGroup = displaySettings.enableSentenceHighlighting &&
                                                currentSpokenWordInfo !== null &&
                                                element.sentenceGroupIndex === currentSpokenWordInfo.sentenceGroupIndex;
                  return (
                    <span
                      key={index}
                      ref={el => { wordRefs.current[index] = el; }}
                      className={cn(
                          "transition-colors duration-150 ease-in-out", 
                          isCurrentWord ? "bg-primary/50 text-primary-foreground rounded px-0.5" 
                                        : isInCurrentSentenceGroup ? "bg-primary/20 rounded" : ""
                      )}
                    >
                      {element.text}
                    </span>
                  );
                })
              ) : (
                <p>{processedText || inputText}</p>
              )}
            </div>
          </ScrollArea>
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
