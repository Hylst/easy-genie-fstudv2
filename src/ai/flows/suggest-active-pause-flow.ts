
'use server';
/**
 * @fileOverview An AI flow to suggest active pause ideas.
 *
 * - suggestActivePause - A function that handles active pause suggestion.
 * - SuggestActivePauseInput - The input type for the suggestActivePause function.
 * - SuggestActivePauseOutput - The return type for the suggestActivePause function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestActivePauseInputSchema = z.object({
  intensityLevel: z.number().min(1).max(5).describe('The desired intensity/complexity of the pause suggestion (1=very simple, 5=more involved or multiple options).'),
  breakDurationMinutes: z.number().min(1).describe('The duration of the break in minutes, to tailor suggestions.'),
});
export type SuggestActivePauseInput = z.infer<typeof SuggestActivePauseInputSchema>;

const SuggestActivePauseOutputSchema = z.object({
  suggestion: z.string().describe('A concise suggestion for an active pause.'),
});
export type SuggestActivePauseOutput = z.infer<typeof SuggestActivePauseOutputSchema>;

export async function suggestActivePause(input: SuggestActivePauseInput): Promise<SuggestActivePauseOutput> {
  const validatedInput = SuggestActivePauseInputSchema.parse(input);
  return suggestActivePauseFlow(validatedInput);
}

const suggestPausePrompt = ai.definePrompt({
  name: 'suggestActivePausePrompt',
  input: {schema: SuggestActivePauseInputSchema},
  output: {schema: SuggestActivePauseOutputSchema},
  prompt: `You are "Easy Genie", an AI assistant focused on well-being and productivity.
Your task is to suggest a short, active pause activity for a user based on the desired intensity level and break duration.
The suggestion should be actionable and promote physical or mental refreshment.
The output must be in French.

Intensity Level: {{{intensityLevel}}}
Break Duration (minutes): {{{breakDurationMinutes}}}

Intensity Level Guidance for Pause Suggestions:
- Level 1 (Minimal): Suggest one very simple, quick activity (e.g., "Étirez-vous simplement.", "Buvez un verre d'eau.").
- Level 2 (Modéré): Suggest a slightly more specific, but still easy activity (e.g., "Faites quelques étirements du cou et des épaules.", "Marchez un peu dans la pièce.").
- Level 3 (Standard): Suggest a common, beneficial activity (e.g., "Prenez 5 minutes pour une courte marche.", "Faites une série de 10 squats légers."). Tailor slightly to duration.
- Level 4 (Intensif): Suggest a more engaging activity or a couple of short options (e.g., "Essayez une technique de respiration comme la cohérence cardiaque pendant 3 minutes.", "Montez et descendez quelques escaliers.").
- Level 5 (Maximum): Suggest a more invigorating activity, multiple options, ou a mini-routine (e.g., "Faites une courte séance de yoga de 5 min (soleil salutation).", "Buvez de l'eau, étirez vos jambes, et regardez au loin par la fenêtre pendant 2 minutes.").

Break Duration Guidance:
- For very short breaks (1-3 min): Focus on extremely quick actions (stretching, breathing).
- For medium breaks (5-10 min): Can suggest short walks, simple exercises.
- For longer breaks (15+ min): Can suggest more involved activities or a combination.

Instructions:
- The suggestion should be concise and encouraging.
- Ensure the output strictly adheres to the JSON schema defined for SuggestActivePauseOutput, which is a single string for 'suggestion'.
- Only provide the JSON output. Do not include any other text or explanations.

Example for intensity 3 and break duration 5 minutes:
Output:
{
  "suggestion": "Prenez 5 minutes pour une courte marche rapide afin de vous dégourdir."
}

Based on the intensity and break duration, provide your suggestion.
`,
  config: {
    temperature: 0.75,
     safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  }
});

const suggestActivePauseFlow = ai.defineFlow(
  {
    name: 'suggestActivePauseFlow',
    inputSchema: SuggestActivePauseInputSchema,
    outputSchema: SuggestActivePauseOutputSchema,
  },
  async (input) => {
    const {output} = await suggestPausePrompt(input);
    if (!output || typeof output.suggestion !== 'string') {
        throw new Error("AI model did not return the expected output structure for active pause suggestion.");
    }
    return output;
  }
);
