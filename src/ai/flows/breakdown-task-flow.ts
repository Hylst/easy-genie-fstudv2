
'use server';
/**
 * @fileOverview An AI flow to break down a main task into sub-tasks, including time estimates.
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

const SubTaskWithEstimateSchema = z.object({
  text: z.string().describe("The text of the sub-task."),
  estimated_time_minutes: z.number().nullable().describe("Estimated time in minutes to complete the sub-task. Null if not applicable or hard to estimate.").optional()
});

const BreakdownTaskOutputSchema = z.object({
  suggestedSubTasks: z.array(SubTaskWithEstimateSchema).describe('A list of suggested sub-tasks for the main task, each with optional time estimates.'),
  error: z.string().optional().describe("Error message if the operation failed.")
});
export type BreakdownTaskOutput = z.infer<typeof BreakdownTaskOutputSchema>;


export async function breakdownTask(input: BreakdownTaskInput): Promise<BreakdownTaskOutput> {
  try {
    const validatedInput = BreakdownTaskInputSchema.parse(input);
    const result = await breakdownTaskFlow(validatedInput);
    // Ensure error property is explicitly undefined on success if not already set
    return { ...result, error: result.error || undefined };
  } catch (error: any) {
    console.error("Error in breakdownTask (exported function):", error);
    // Handle Zod validation errors or other unexpected errors before flow execution
    if (error.name === 'ZodError') {
      return { suggestedSubTasks: [], error: "INPUT_VALIDATION_ERROR: " + error.issues.map((issue: any) => `${issue.path.join('.')} - ${issue.message}`).join('; ') };
    }
    return { suggestedSubTasks: [], error: "UNEXPECTED_ERROR_IN_WRAPPER" };
  }
}

const breakdownPrompt = ai.definePrompt({
  name: 'breakdownTaskPrompt',
  input: {schema: BreakdownTaskInputSchema},
  output: {schema: BreakdownTaskOutputSchema},
  prompt: `You are "Easy Genie", an AI assistant specialized in helping users break down complex tasks into manageable sub-tasks.
Your goal is to analyze the user's main task and suggest a list of sub-tasks based on the specified intensity level.
For each sub-task, also provide an "estimated_time_minutes" which is your best guess for how long it might take to complete, in minutes.
If a task is very quick (e.g., less than 5 minutes) or very hard to estimate, you can provide \`null\` or omit the "estimated_time_minutes" field for that sub-task. Be realistic.
The output must be in French.

Main Task: {{{mainTaskText}}}
Intensity Level: {{{intensityLevel}}}

Intensity Level Guidance for Sub-task Generation:
- Level 1 (Minimal): Suggest 1-3 very simple, high-level sub-tasks. Keep them broad. Time estimates should be simple or null.
- Level 2 (Modéré): Suggest 2-4 slightly more specific sub-tasks. They should be clear, actionable steps. Provide reasonable time estimates.
- Level 3 (Standard): Suggest 3-5 moderately detailed sub-tasks. These should represent a logical flow to accomplish the main task. Provide plausible time estimates.
- Level 4 (Intensif): Suggest 4-6 detailed and actionable sub-tasks. Consider potential pre-requisites or smaller components. Steps should be very clear. Time estimates should be more granular.
- Level 5 (Maximum): Suggest 5-7 (or more if logical for a very complex task) highly detailed, granular sub-tasks. Break down steps into their smallest feasible actions. You might include minor details or reminders. Time estimates should be as specific as possible.

Instructions:
- The sub-tasks should be actionable and directly contribute to completing the main task.
- Phrase sub-tasks as imperative commands or short descriptive actions (e.g., "Rechercher des lieux", "Contacter les fournisseurs", "Envoyer les invitations").
- Ensure the output strictly adheres to the JSON schema defined for BreakdownTaskOutput, specifically an array of objects like {"text": "...", "estimated_time_minutes": ...} for 'suggestedSubTasks'.
- Only provide the JSON output. Do not include any other text, explanations, or introductory phrases like "Voici les sous-tâches :".

Example for "Organiser une fête d'anniversaire" at intensity 3:
Output:
{
  "suggestedSubTasks": [
    { "text": "Définir la date, l'heure et le budget.", "estimated_time_minutes": 60 },
    { "text": "Choisir un lieu et le réserver si nécessaire.", "estimated_time_minutes": 90 },
    { "text": "Dresser la liste des invités et envoyer les invitations.", "estimated_time_minutes": 120 },
    { "text": "Planifier le menu (gâteau, boissons, snacks) et faire les courses.", "estimated_time_minutes": 180 },
    { "text": "Préparer les décorations et l'animation.", "estimated_time_minutes": null }
  ]
}

Based on the main task and the intensity level, provide your list of sub-tasks with their time estimates.
`,
  config: {
    temperature: 0.6, 
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
    try {
      const {output} = await breakdownPrompt(input);
      if (!output || !Array.isArray(output.suggestedSubTasks)) {
          console.warn("AI returned invalid or no sub-tasks structure, defaulting to empty array. Output:", output);
          return { suggestedSubTasks: [], error: "INVALID_OUTPUT_STRUCTURE" };
      }
      // Ensure each subtask object has at least a text field, and time estimate is number or null
      const validatedSubTasks = output.suggestedSubTasks.map(st => ({
          text: typeof st.text === 'string' ? st.text : "Texte de tâche manquant",
          estimated_time_minutes: (typeof st.estimated_time_minutes === 'number' || st.estimated_time_minutes === null) ? st.estimated_time_minutes : null,
      }));

      return { suggestedSubTasks: validatedSubTasks, error: undefined };
    } catch (error: any) {
        console.error("Error in breakdownTaskFlow execution (inside defineFlow):", error);
        let errorMessage = "SERVICE_UNAVAILABLE_IN_FLOW";
        if (error.message && typeof error.message === 'string') {
          if (error.message.includes("503") || error.message.toLowerCase().includes("overloaded")) {
            errorMessage = "SERVICE_UNAVAILABLE";
          } else if (error.name === 'ZodError') {
            errorMessage = "OUTPUT_VALIDATION_ERROR: " + error.issues.map((issue: any) => `${issue.path.join('.')} - ${issue.message}`).join('; ');
          } else {
            errorMessage = "API_ERROR_IN_FLOW";
          }
        }
        return { suggestedSubTasks: [], error: errorMessage };
    }
  }
);

