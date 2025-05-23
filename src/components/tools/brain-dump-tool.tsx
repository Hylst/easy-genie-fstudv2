"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IntensitySelector } from '@/components/intensity-selector';
import { Save, Trash2, Download } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";


const BRAIN_DUMP_STORAGE_KEY = "easyGenieBrainDump";

export function BrainDumpTool() {
  const [intensity, setIntensity] = useState<number>(3);
  const [dumpText, setDumpText] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const savedDump = localStorage.getItem(BRAIN_DUMP_STORAGE_KEY);
    if (savedDump) {
      setDumpText(savedDump);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem(BRAIN_DUMP_STORAGE_KEY, dumpText);
    toast({
        title: "Pensées sauvegardées !",
        description: "Votre Brain Dump a été sauvegardé localement.",
    });
    // Placeholder: Higher intensity might offer summarization or tagging suggestions (AI feature)
    if (intensity >= 4 && dumpText.length > 100) {
        console.log(`Suggestion pour intensité ${intensity}: Essayez de catégoriser ces pensées ou d'en extraire des actions.`);
    }
  };

  const handleClear = () => {
    setDumpText('');
    localStorage.removeItem(BRAIN_DUMP_STORAGE_KEY);
    toast({
        title: "Zone de vidage nettoyée !",
        variant: "destructive",
    });
  };

  const handleDownload = () => {
    const blob = new Blob([dumpText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'easy-genie-braindump.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
        title: "Téléchargement lancé",
        description: "Votre Brain Dump est en cours de téléchargement.",
    });
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">BrainDump</CardTitle>
        <CardDescription>Un espace pour vider votre esprit. Écrivez tout ce qui vous passe par la tête. Le génie écoute sans jugement. Le niveau de magie peut influencer les suggestions d'organisation futures.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <IntensitySelector value={intensity} onChange={setIntensity} />
        
        <div>
          <label htmlFor="braindump-area" className="sr-only">Zone de Brain Dump</label>
          <Textarea
            id="braindump-area"
            value={dumpText}
            onChange={(e) => setDumpText(e.target.value)}
            placeholder="Laissez vos pensées s'écouler ici... idées, tâches, soucis, inspirations..."
            rows={15}
            className="w-full p-4 text-lg leading-relaxed rounded-md shadow-inner bg-background focus:ring-primary"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row justify-end gap-2">
          <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" /> Sauvegarder Localement</Button>
          <Button onClick={handleDownload} variant="outline"><Download className="mr-2 h-4 w-4" /> Télécharger</Button>
          <Button onClick={handleClear} variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Tout Effacer</Button>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
            {intensity <= 2 ? "Le génie vous offre un espace calme." : 
             intensity <= 4 ? "Pensez à revisiter vos notes plus tard pour les organiser." :
             "Le génie vous encourage à transformer ces pensées en actions concrètes."}
        </p>
      </CardFooter>
    </Card>
  );
}
