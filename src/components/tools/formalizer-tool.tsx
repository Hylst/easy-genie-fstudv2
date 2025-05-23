"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IntensitySelector } from '@/components/intensity-selector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Wand2, ClipboardCopy, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { FormalizerStyle } from '@/types';
import { formalizeText } from '@/ai/flows/formalize-text-flow'; // Will create this flow

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
  
  const currentIntensityDescription = intensityDescriptions[intensity] || "Le génie adapte son effort à votre demande.";

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
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
          <Textarea
            id="input-text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Écrivez ou collez votre texte ici..."
            rows={8}
            className="w-full p-3 text-base leading-relaxed rounded-md shadow-inner bg-background focus:ring-primary"
          />
        </div>

        <div>
          <Label htmlFor="style-select" className="block text-sm font-medium text-foreground mb-1">Rendre mon texte :</Label>
          <Select value={selectedStyle} onValueChange={(value) => setSelectedStyle(value as FormalizerStyle)}>
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

        <Button onClick={handleFormalize} disabled={isLoading} className="w-full text-lg py-3">
          {isLoading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-5 w-5" />
          )}
          Transformer le Texte
        </Button>

        <div>
          <Label htmlFor="output-text" className="block text-sm font-medium text-foreground mb-1">Texte transformé par le Génie :</Label>
          <div className="relative">
            <Textarea
              id="output-text"
              value={outputText}
              readOnly
              placeholder="Votre texte transformé apparaîtra ici..."
              rows={8}
              className="w-full p-3 text-base leading-relaxed rounded-md shadow-inner bg-muted/50 focus:ring-primary"
            />
            {outputText && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleCopyToClipboard} 
                className="absolute top-2 right-2 text-muted-foreground hover:text-primary"
                aria-label="Copier le texte transformé"
              >
                <ClipboardCopy className="h-5 w-5" />
              </Button>
            )}
          </div>
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
