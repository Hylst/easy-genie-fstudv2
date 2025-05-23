'use server';
/**
 * @fileOverview An AI flow to suggest routines.
 *
 * - suggestRoutine - A function that handles routine suggestion.
 * - SuggestRoutineInput - The input type for the suggestRoutine function.
 * - SuggestRoutineOutput - The return type for the suggestRoutine function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { DAYS_OF_WEEK_ARRAY, type DayOfWeek } from '@/types';

// Zod enum from array
const DaysOfWeekEnum = z.enum(DAYS_OF_WEEK_ARRAY);

const SuggestRoutineInputSchema = z.object({
  goal: z.string().min(3, { message: "L'objectif doit contenir au moins 3 caractères." }).describe('The user\'s goal for the routine (e.g., "morning productivity", "relaxing evening").'),
  intensityLevel: z.number().min(1).max(5).describe('The intensity of the suggestions (1=simple, 5=detailed).'),
  existingRoutineNames: z.array(z.string()).optional().describe('Optional list of existing routine names to avoid duplicates or provide context.')
});
export type SuggestRoutineInput = z.infer<typeof SuggestRoutineInputSchema>;

const SuggestedRoutineOutputSchema = z.object({
  name: z.string().describe("Nom suggéré pour la routine."),
  description: z.string().optional().describe("Description suggérée pour la routine."),
  steps: z.array(z.string()).min(1).describe("Liste des textes pour les étapes suggérées (au moins une étape)."),
  days: z.array(DaysOfWeekEnum).optional().describe("Jours suggérés pour la routine (optionnel).")
});
export type SuggestRoutineOutput = z.infer<typeof SuggestedRoutineOutputSchema>;

export async function suggestRoutine(input: SuggestRoutineInput): Promise<SuggestRoutineOutput> {
  const validatedInput = SuggestRoutineInputSchema.parse(input);
  return suggestRoutineFlow(validatedInput);
}

const suggestPrompt = ai.definePrompt({
  name: 'suggestRoutinePrompt',
  input: {schema: SuggestRoutineInputSchema},
  output: {schema: SuggestedRoutineOutputSchema},
  prompt: `You are "Easy Genie", an AI assistant specialized in helping users create effective routines.
Your task is to generate a routine (name, description, steps, and optionally days) based on the user's goal and the specified intensity level.
The output must be in French.

User's Goal: {{{goal}}}
Intensity Level: {{{intensityLevel}}}
{{#if existingRoutineNames}}
Existing Routine Names (for context, try to suggest something different or complementary):
{{#each existingRoutineNames}}
- {{{this}}}
{{/each}}
{{/if}}

Intensity Level Guidance:
- Level 1 (Minimal): Suggest a very simple routine with 1-2 basic steps. Name should be concise. Description optional or very short. No specific days.
- Level 2 (Modéré): Suggest a routine with 2-3 steps. Name can be slightly more descriptive. Short description. Maybe suggest 1-2 common days (e.g., 'Lun', 'Mer').
- Level 3 (Standard): Suggest a balanced routine with 3-5 steps. Clear name and helpful description. May suggest 3-5 days if applicable to the goal (e.g., weekdays for a work routine).
- Level 4 (Intensif): Suggest a more detailed routine with 4-6 steps. Steps can be more specific. Name and description should be encouraging. May suggest specific days that make sense for the goal.
- Level 5 (Maximum): Suggest a comprehensive routine with 5-7 well-defined steps. Steps might include sub-details or tips. Name and description should be motivating. Actively suggest a set of days.

Instructions:
- The routine name should be clear and related to the goal.
- The description should briefly explain the purpose or benefit of the routine.
- Provide at least one step. Steps should be actionable.
- If suggesting days, use the French abbreviations: ${DAYS_OF_WEEK_ARRAY.join(', ')}.
- Ensure the output strictly adheres to the JSON schema defined for SuggestRoutineOutput.
- Only provide the JSON output. Do not include any other text or explanations.

Example for "morning productivity" at intensity 3:
Output:
{
  "name": "Boost Matinal Productif",
  "description": "Une routine pour commencer la journée avec énergie et concentration.",
  "steps": [
    "Réveil et verre d'eau citronnée.",
    "10 minutes de méditation ou étirements légers.",
    "Revue rapide des 3 tâches prioritaires de la journée.",
    "Petit-déjeuner équilibré sans distractions.",
    "Commencer la première tâche prioritaire."
  ],
  "days": ["Lun", "Mar", "Mer", "Jeu", "Ven"]
}
`,
  config: {
    temperature: 0.7,
     safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  }
});

const suggestRoutineFlow = ai.defineFlow(
  {
    name: 'suggestRoutineFlow',
    inputSchema: SuggestRoutineInputSchema,
    outputSchema: SuggestedRoutineOutputSchema,
  },
  async (input) => {
    const {output} = await suggestPrompt(input);
    if (!output) {
        throw new Error("AI model did not return the expected output structure for routine suggestion.");
    }
    // Ensure steps is always an array, even if model hallucinates something else
    if (!Array.isArray(output.steps)) {
        console.warn("AI returned non-array for steps, forcing to empty array. Output:", output);
        output.steps = [];
    }
     if (output.steps.length === 0) {
        output.steps = ["Étape suggérée par le Génie."]; // Ensure at least one step
    }
    if (output.days && !Array.isArray(output.days)) {
      console.warn("AI returned non-array for days, forcing to empty array. Output:", output);
      output.days = [];
    }
    return output;
  }
);
