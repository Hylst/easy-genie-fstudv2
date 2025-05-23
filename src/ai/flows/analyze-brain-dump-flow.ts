
'use server';
/**
 * @fileOverview An AI flow to analyze brain dump text.
 *
 * - analyzeBrainDump - A function that handles the brain dump analysis.
 * - AnalyzeBrainDumpInput - The input type for the analyzeBrainDump function.
 * - AnalyzeBrainDumpOutput - The return type for the analyzeBrainDump function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeBrainDumpInputSchema = z.object({
  brainDumpText: z.string().min(1, { message: "Le texte du Brain Dump ne peut pas être vide." }).describe('The text content from the brain dump.'),
  intensityLevel: z.number().min(1).max(5).describe('The intensity of the analysis (1=light, 5=deep).'),
});
export type AnalyzeBrainDumpInput = z.infer<typeof AnalyzeBrainDumpInputSchema>;

const AnalyzeBrainDumpOutputSchema = z.object({
  analysis: z.string().describe('The AI-generated analysis of the brain dump text.'),
});
export type AnalyzeBrainDumpOutput = z.infer<typeof AnalyzeBrainDumpOutputSchema>;

export async function analyzeBrainDump(input: AnalyzeBrainDumpInput): Promise<AnalyzeBrainDumpOutput> {
  const validatedInput = AnalyzeBrainDumpInputSchema.parse(input);
  return analyzeBrainDumpFlow(validatedInput);
}

const analyzePrompt = ai.definePrompt({
  name: 'analyzeBrainDumpPrompt',
  input: {schema: AnalyzeBrainDumpInputSchema},
  output: {schema: AnalyzeBrainDumpOutputSchema},
  prompt: `You are an AI assistant called "Easy Genie", specialized in helping users organize their thoughts from a "brain dump".
Analyze the following text based on the specified intensity level.

Intensity Level Guidance:
- Level 1 (Minimal): Provide a very concise summary (1-2 sentences). Identify 1-2 main topics if apparent. Keep it light and encouraging.
- Level 2 (Modéré): Provide a concise summary (2-3 sentences). Identify up to 3 key themes or topics. Gently suggest one possible area for further thought.
- Level 3 (Standard): Provide a balanced summary of the text. Identify key themes and distinct points. Suggest 2-3 potential next actions or questions for reflection based on the content. If tasks are mentioned, list them.
- Level 4 (Intensif): Perform a more detailed analysis. Provide a structured summary. Extract actionable tasks clearly. Attempt to categorize different thoughts (e.g., work, personal, ideas, worries). Identify any recurring patterns or potential emotional undertones (e.g., stress, excitement) if clearly expressed. Suggest concrete next steps for some of the identified items.
- Level 5 (Maximum): Conduct a deep and thorough analysis. Provide a comprehensive, structured summary. Extract all potential actionable tasks and list them clearly. Categorize thoughts extensively. Analyze potential connections between different points. Discuss any evident emotional undertones and offer supportive suggestions or reframing if appropriate. Propose a prioritized list of 2-3 key actions or areas to focus on. Be directive and encouraging.

Brain Dump Text:
\`\`\`
{{{brainDumpText}}}
\`\`\`

Current Intensity Level: {{{intensityLevel}}}

Based on the text and the intensity level, provide your analysis.
Format your response clearly. For example, if extracting tasks, use bullet points. If providing a summary, label it.
The output should ONLY be the analysis text. Do not include any preambles like "Here is the analysis:".
The output should be in French.
`,
  config: {
    temperature: 0.6, // Slightly more deterministic for analysis
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  }
});

const analyzeBrainDumpFlow = ai.defineFlow(
  {
    name: 'analyzeBrainDumpFlow',
    inputSchema: AnalyzeBrainDumpInputSchema,
    outputSchema: AnalyzeBrainDumpOutputSchema,
  },
  async (input) => {
    const {output} = await analyzePrompt(input);
    if (!output) {
        throw new Error("AI model did not return the expected output structure for brain dump analysis.");
    }
    return output;
  }
);

    