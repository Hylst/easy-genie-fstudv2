
'use server';
/**
 * @fileOverview An AI flow to break down a main task into sub-tasks.
 *
 * - breakdownTask - A function that handles the task breakdown process.
 * - BreakdownTaskInput - The input type for the breakdownTask function.
 * - BreakdownTaskOutput - The return type for the breakdownTask function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BreakdownTaskInputSchema = z.object({
  mainTaskText: z.string().min(3, { message: "La tâche principale doit contenir au moins 3 caractères." }).describe('The main task to be broken down.'),
  intensityLevel: z.number().min(1).max(5).describe('The intensity of the breakdown (1=simple, 5=very detailed).'),
});
export type BreakdownTaskInput = z.infer<typeof BreakdownTaskInputSchema>;

const BreakdownTaskOutputSchema = z.object({
  suggestedSubTasks: z.array(z.string()).describe('A list of suggested sub-tasks for the main task.'),
});
export type BreakdownTaskOutput = z.infer<typeof BreakdownTaskOutputSchema>;

export async function breakdownTask(input: BreakdownTaskInput): Promise<BreakdownTaskOutput> {
  const validatedInput = BreakdownTaskInputSchema.parse(input);
  return breakdownTaskFlow(validatedInput);
}

const breakdownPrompt = ai.definePrompt({
  name: 'breakdownTaskPrompt',
  input: {schema: BreakdownTaskInputSchema},
  output: {schema: BreakdownTaskOutputSchema},
  prompt: `You are "Easy Genie", an AI assistant specialized in helping users break down complex tasks into manageable sub-tasks.
Your goal is to analyze the user's main task and suggest a list of sub-tasks based on the specified intensity level.
The output must be in French.

Main Task: {{{mainTaskText}}}
Intensity Level: {{{intensityLevel}}}

Intensity Level Guidance for Sub-task Generation:
- Level 1 (Minimal): Suggest 1-3 very simple, high-level sub-tasks. Keep them broad.
- Level 2 (Modéré): Suggest 2-4 slightly more specific sub-tasks. They should be clear, actionable steps.
- Level 3 (Standard): Suggest 3-5 moderately detailed sub-tasks. These should represent a logical flow to accomplish the main task.
- Level 4 (Intensif): Suggest 4-6 detailed and actionable sub-tasks. Consider potential pre-requisites or smaller components within each sub-task. Steps should be very clear.
- Level 5 (Maximum): Suggest 5-7 (or more if logical for a very complex task) highly detailed, granular sub-tasks. Break down steps into their smallest feasible actions. You might include minor details or reminders within the sub-task descriptions.

Instructions:
- The sub-tasks should be actionable and directly contribute to completing the main task.
- Phrase sub-tasks as imperative commands or short descriptive actions (e.g., "Rechercher des lieux", "Contacter les fournisseurs", "Envoyer les invitations").
- Ensure the output strictly adheres to the JSON schema defined for BreakdownTaskOutput, specifically an array of strings for 'suggestedSubTasks'.
- Only provide the JSON output. Do not include any other text, explanations, or introductory phrases like "Voici les sous-tâches :".

Example for "Organiser une fête d'anniversaire" at intensity 3:
Output:
{
  "suggestedSubTasks": [
    "Définir la date, l'heure et le budget.",
    "Choisir un lieu et le réserver si nécessaire.",
    "Dresser la liste des invités et envoyer les invitations.",
    "Planifier le menu (gâteau, boissons, snacks) et faire les courses.",
    "Préparer les décorations et l'animation."
  ]
}

Based on the main task and the intensity level, provide your list of sub-tasks.
`,
  config: {
    temperature: 0.6, // Balanced for helpful and somewhat creative breakdown
     safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  }
});

const breakdownTaskFlow = ai.defineFlow(
  {
    name: 'breakdownTaskFlow',
    inputSchema: BreakdownTaskInputSchema,
    outputSchema: BreakdownTaskOutputSchema,
  },
  async (input) => {
    const {output} = await breakdownPrompt(input);
    if (!output || !Array.isArray(output.suggestedSubTasks)) {
        console.warn("AI returned invalid or no sub-tasks, defaulting to empty array. Output:", output);
        return { suggestedSubTasks: [] };
    }
    return output;
  }
);
