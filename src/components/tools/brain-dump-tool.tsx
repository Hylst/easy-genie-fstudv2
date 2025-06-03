
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IntensitySelector } from '@/components/intensity-selector';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Trash2, Download, Wand2, Mic, Loader2, Eye, History, Info } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { analyzeBrainDump } from '@/ai/flows/analyze-brain-dump-flow';
import type { BrainDumpContent, CreateBrainDumpContentDTO, BrainDumpHistoryEntry, CreateBrainDumpHistoryEntryDTO } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  addBrainDump,
  updateBrainDump,
  getAllBrainDumps,
  addBrainDumpHistoryEntry,
  getAllBrainDumpHistoryEntries,
  deleteBrainDumpHistoryEntry,
} from '@/services/appDataService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from '../ui/label';


export function BrainDumpTool() {
  const [intensity, setIntensity] = useState<number>(3);
  const [dumpText, setDumpText] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);
  const { user, isOnline } = useAuth();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [activeDumpId, setActiveDumpId] = useState<string | null>(null);
  const [isLoadingActiveDump, setIsLoadingActiveDump] = useState(true);

  const [historyEntries, setHistoryEntries] = useState<BrainDumpHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showSaveHistoryDialog, setShowSaveHistoryDialog] = useState(false);
  const [historyEntryName, setHistoryEntryName] = useState('');


  const loadActiveDump = useCallback(async () => {
    if (!user) {
      setActiveDumpId(null);
      setDumpText('');
      setAnalysisResult('');
      setIntensity(3);
      setIsLoadingActiveDump(false);
      return;
    }
    setIsLoadingActiveDump(true);
    try {
      const dumps = await getAllBrainDumps(); // Should be sorted by updated_at desc by service
      if (dumps.length > 0) {
        const mostRecent = dumps[0];
        setActiveDumpId(mostRecent.id);
        setDumpText(mostRecent.dump_text);
        setAnalysisResult(mostRecent.analysis_text || '');
        setIntensity(mostRecent.intensity_level_on_analysis || 3);
      } else {
        setActiveDumpId(null); // No active dump, prepare for creation
        setDumpText('');
        setAnalysisResult('');
        setIntensity(3);
      }
    } catch (error) {
      console.error("Error loading active brain dump:", error);
      toast({ title: "Erreur de chargement", description: "Impossible de charger votre décharge de pensées active.", variant: "destructive" });
    } finally {
      setIsLoadingActiveDump(false);
    }
  }, [user, toast]);

  const loadHistory = useCallback(async () => {
    if (!user) {
      setHistoryEntries([]);
      setIsLoadingHistory(false);
      return;
    }
    setIsLoadingHistory(true);
    try {
      const entries = await getAllBrainDumpHistoryEntries();
      setHistoryEntries(entries);
    } catch (error) {
      console.error("Error loading brain dump history:", error);
      toast({ title: "Erreur de chargement de l'historique", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadActiveDump();
    loadHistory();
  }, [user, isOnline, loadActiveDump, loadHistory]);


  useEffect(() => {
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
      recognitionRef.current.onend = () => { if (isListening) setIsListening(false); };
    } else console.warn("Speech Recognition API not supported in this browser.");

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [isListening]); // Removed dumpText to avoid re-init on text change

 useEffect(() => {
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.start(); } 
      catch (e) { setIsListening(false); toast({title: "Erreur Micro", description: "Impossible de démarrer l'écoute.", variant: "destructive"});}
    } else if (!isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [isListening, toast]);

  useEffect(() => {
    if (!isLoadingActiveDump && user && dumpText !== undefined) { // Only save if not loading and text is defined
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        handleSave(false); // Pass false to indicate this is a debounced auto-save
      }, 2000); // 2 seconds debounce
    }
    return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dumpText, user, isLoadingActiveDump]); // analysisResult, intensity are not debounced


  const handleSave = async (showToast: boolean = true) => {
    if (!user) {
      if (showToast) toast({ title: "Non connecté", description: "Connectez-vous pour sauvegarder.", variant: "destructive" });
      return;
    }
    if (!dumpText.trim() && !analysisResult.trim() && !activeDumpId) {
        if (showToast) toast({ title: "Rien à sauvegarder", description: "Le contenu est vide." });
        return;
    }

    setIsSaving(true);
    try {
      const dumpData: CreateBrainDumpContentDTO | Partial<CreateBrainDumpContentDTO> = {
        dump_text: dumpText,
        analysis_text: analysisResult || undefined,
        intensity_level_on_analysis: analysisResult ? intensity : undefined,
      };

      if (activeDumpId) {
        await updateBrainDump(activeDumpId, dumpData as Partial<CreateBrainDumpContentDTO>);
      } else {
        const newDump = await addBrainDump(dumpData as CreateBrainDumpContentDTO);
        setActiveDumpId(newDump.id);
      }
      if (showToast) toast({ title: "Sauvegardé !", description: "Votre décharge de pensées est à jour." });
    } catch (error) {
      console.error("Error saving brain dump:", error);
      if (showToast) toast({ title: "Erreur de sauvegarde", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    if (!user) {
      setDumpText('');
      setAnalysisResult('');
      toast({ title: "Zone de décharge nettoyée !", variant: "destructive" });
      return;
    }
    setDumpText('');
    setAnalysisResult('');
    setActiveDumpId(null); // This will trigger creation of a new dump on next save
    if (activeDumpId) { // If there was an active dump, mark it as empty essentially or delete it
        try {
            // Option 1: Update existing to empty
            // await updateBrainDump(activeDumpId, { dump_text: '', analysis_text: undefined, intensity_level_on_analysis: undefined });
            // Option 2: Delete it (might be better UX if user expects clear to "remove")
            // await deleteBrainDump(activeDumpId); // This would require sync and local hard delete
            // For simplicity of not creating "deleted" active dumps, we'll just clear fields and let next save be a new one if activeDumpId was nullified
             if (activeDumpId) {
                // To truly clear the "active" session, we effectively start a new one by nullifying activeDumpId
                // The next save will create a new record. The old one remains but won't be the "most recent" anymore.
             }

        } catch (error) {
            console.error("Error clearing active dump on server:", error);
            toast({ title: "Erreur", description: "Impossible de réinitialiser la session active sur le serveur.", variant: "destructive" });
        }
    }
    toast({ title: "Zone de décharge nettoyée !", description: "Prêt pour une nouvelle session.", variant: "destructive" });
  };

  const handleDownload = () => {
    const contentToDownload = `Décharge de Pensées:\n${dumpText}\n\nAnalyse du Génie (Niveau ${intensity}):\n${analysisResult || 'Aucune analyse générée.'}`;
    const blob = new Blob([contentToDownload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `easy-genie-decharge-pensees.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Téléchargement lancé" });
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
      await handleSave(false); // Save after analysis
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

  const handleOpenSaveHistoryDialog = () => {
    if (!user) {
      toast({ title: "Non connecté", description: "Connectez-vous pour utiliser l'historique.", variant: "destructive"});
      return;
    }
     if (!dumpText.trim() && !analysisResult.trim()) {
      toast({ title: "Rien à enregistrer", description: "Écrivez quelque chose avant d'enregistrer dans l'historique.", variant: "destructive" });
      return;
    }
    setHistoryEntryName(`Décharge du ${new Date().toLocaleDateString()} à ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`);
    setShowSaveHistoryDialog(true);
  };

  const handleSaveToHistory = async () => {
    if (!user || !historyEntryName.trim()) {
      toast({ title: "Nom manquant", description: "Veuillez nommer votre entrée d'historique.", variant: "destructive"});
      return;
    }
    setIsSaving(true);
    try {
      const historyDto: CreateBrainDumpHistoryEntryDTO = {
        name: historyEntryName,
        dump_text: dumpText,
        analysis_text: analysisResult || undefined,
        intensity_level_on_analysis: analysisResult ? intensity : undefined,
      };
      await addBrainDumpHistoryEntry(historyDto);
      await loadHistory(); // Refresh history list
      setShowSaveHistoryDialog(false);
      setHistoryEntryName('');
      toast({ title: "Enregistré dans l'historique !" });
    } catch (error) {
      console.error("Error saving to history:", error);
      toast({ title: "Erreur d'enregistrement", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadFromHistory = (entry: BrainDumpHistoryEntry) => {
    setDumpText(entry.dump_text);
    setAnalysisResult(entry.analysis_text || '');
    setIntensity(entry.intensity_level_on_analysis || 3);
    setActiveDumpId(null); // Consider this loaded content as a new "active" session, or find/update existing if desired
    toast({ title: `"${entry.name}" chargé !`, description: "Le contenu a été restauré dans la zone principale."});
  };

  const handleDeleteFromHistory = async (id: string) => {
    if (!user) return;
    setIsSaving(true); // Use general saving indicator
    try {
      await deleteBrainDumpHistoryEntry(id);
      await loadHistory(); // Refresh history list
      toast({ title: "Entrée d'historique supprimée", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting from history:", error);
      toast({ title: "Erreur de suppression", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingActiveDump && user) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-xl mx-auto shadow-xl"> {/* Reduced width */}
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">Décharge de Pensées Magique</CardTitle>
        <CardDescription>Un espace pour vider votre esprit. Écrivez ou dictez. Le génie peut ensuite analyser et organiser vos pensées.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <IntensitySelector value={intensity} onChange={setIntensity} />
        
        <div>
          <label htmlFor="braindump-area" className="sr-only">Zone de Décharge de Pensées</label>
          <div className="relative">
            <Textarea
              id="braindump-area"
              value={dumpText}
              onChange={(e) => setDumpText(e.target.value)}
              placeholder="Laissez vos pensées s'écouler ici... idées, tâches, soucis, inspirations..."
              rows={15}
              className="w-full p-4 text-lg leading-relaxed rounded-md shadow-inner bg-background focus:ring-primary pr-12"
              disabled={!user || isSaving || isAnalyzing}
            />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleToggleListening}
              className={`absolute top-3 right-3 text-muted-foreground hover:text-primary ${isListening ? 'text-red-500 animate-pulse' : ''}`}
              aria-label={isListening ? "Arrêter l'écoute" : "Démarrer l'écoute vocale"}
              disabled={!recognitionRef.current || !user || isSaving || isAnalyzing}
            >
              <Mic className="h-6 w-6" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <Button onClick={handleAnalyze} disabled={isAnalyzing || !dumpText.trim() || !user || isSaving} className="w-full sm:w-auto text-lg py-3">
            {isAnalyzing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
            Analyser par le Génie
          </Button>
          <div className="flex gap-2">
            <Button onClick={() => handleSave(true)} variant="outline" disabled={isSaving || !user || isAnalyzing}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} 
                Sauvegarder Actif
            </Button>
            <Button onClick={handleDownload} variant="outline" disabled={!dumpText.trim()}><Download className="mr-2 h-4 w-4" /> Télécharger</Button>
            <Button onClick={handleClear} variant="destructive" disabled={(!dumpText.trim() && !analysisResult.trim()) || !user || isSaving || isAnalyzing}><Trash2 className="mr-2 h-4 w-4" /> Effacer Actif</Button>
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

         {!user && (
          <Card className="p-4 bg-yellow-50 border-yellow-300 text-yellow-700 text-center">
            <Info className="h-6 w-6 mx-auto mb-1" />
            <p className="font-medium">Connectez-vous pour sauvegarder vos décharges de pensées et accéder à l'historique.</p>
          </Card>
        )}

        {user && (
            <div className="pt-4">
                <Button onClick={handleOpenSaveHistoryDialog} variant="secondary" className="w-full" disabled={isSaving || isAnalyzing || (!dumpText.trim() && !analysisResult.trim())}>
                    <History className="mr-2 h-4 w-4"/> Enregistrer la session actuelle dans l'historique
                </Button>

                 <Accordion type="single" collapsible className="w-full mt-4">
                    <AccordionItem value="history">
                        <AccordionTrigger className="text-lg font-medium">
                            Historique des Décharges ({isLoadingHistory ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : historyEntries.length})
                        </AccordionTrigger>
                        <AccordionContent>
                            {isLoadingHistory && <div className="text-center p-4">Chargement de l'historique...</div>}
                            {!isLoadingHistory && historyEntries.length === 0 && (
                                <p className="text-muted-foreground p-4 text-center">Votre historique est vide.</p>
                            )}
                            {!isLoadingHistory && historyEntries.length > 0 && (
                                <ScrollArea className="h-[300px] pr-2">
                                    <div className="space-y-3">
                                    {historyEntries.map(entry => (
                                        <Card key={entry.id} className="p-3">
                                            <CardHeader className="p-0 pb-2 flex flex-row justify-between items-center">
                                                <CardTitle className="text-base">{entry.name}</CardTitle>
                                                <span className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleDateString()}</span>
                                            </CardHeader>
                                            <CardContent className="p-0 pb-2">
                                                <p className="text-xs text-muted-foreground truncate">Contenu: {entry.dump_text.substring(0, 50)}...</p>
                                                {entry.analysis_text && <p className="text-xs text-muted-foreground truncate">Analyse: {entry.analysis_text.substring(0, 50)}...</p>}
                                            </CardContent>
                                            <CardFooter className="p-0 flex justify-end gap-2">
                                                <Button size="sm" variant="outline" onClick={() => handleLoadFromHistory(entry)} disabled={isSaving || isAnalyzing}><Eye className="mr-1 h-3 w-3"/> Charger</Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button size="sm" variant="destructive" disabled={isSaving || isAnalyzing}><Trash2 className="mr-1 h-3 w-3"/>Suppr.</Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Supprimer cette entrée ?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Êtes-vous sûr de vouloir supprimer l'entrée "{entry.name}" de l'historique ?
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteFromHistory(entry.id)}>Supprimer</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
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

       <Dialog open={showSaveHistoryDialog} onOpenChange={setShowSaveHistoryDialog}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Enregistrer dans l'Historique</DialogTitle>
                <DialogDescription>Donnez un nom à cette session de décharge de pensées pour la retrouver plus tard.</DialogDescription>
            </DialogHeader>
            <div className="py-2">
                <Label htmlFor="historyEntryName">Nom de l'entrée</Label>
                <Input
                id="historyEntryName"
                value={historyEntryName}
                onChange={(e) => setHistoryEntryName(e.target.value)}
                placeholder="Ex: Idées projet X, Réflexions du jour..."
                />
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline" onClick={() => setHistoryEntryName('')}>Annuler</Button></DialogClose>
                <Button onClick={handleSaveToHistory} disabled={!historyEntryName.trim() || isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Save className="h-4 w-4 mr-2" />} 
                    Enregistrer
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
