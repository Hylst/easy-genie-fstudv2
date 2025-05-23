'use server';
/**
 * @fileOverview A text formalization AI flow.
 *
 * - formalizeText - A function that handles the text formalization process.
 * - FormalizeTextInput - The input type for the formalizeText function.
 * - FormalizeTextOutput - The return type for the formalizeText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { FormalizerStyle } from '@/types';

const formalizerStylesEnum = z.enum([
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
]);

const FormalizeTextInputSchema = z.object({
  textToFormalize: z.string().min(1, { message: "Le texte à formaliser ne peut pas être vide." }).describe('The original text to be transformed.'),
  targetStyle: formalizerStylesEnum.describe('The desired style for the transformed text.'),
  intensityLevel: z.number().min(1).max(5).describe('The intensity of the transformation (1=subtle, 5=strong).'),
});
export type FormalizeTextInput = z.infer<typeof FormalizeTextInputSchema>;

const FormalizeTextOutputSchema = z.object({
  formalizedText: z.string().describe('The transformed text.'),
});
export type FormalizeTextOutput = z.infer<typeof FormalizeTextOutputSchema>;

export async function formalizeText(input: FormalizeTextInput): Promise<FormalizeTextOutput> {
  // Validate input with Zod schema
  const validatedInput = FormalizeTextInputSchema.parse(input);
  return formalizeTextFlow(validatedInput);
}

const formalizerPrompt = ai.definePrompt({
  name: 'formalizerPrompt',
  input: {schema: FormalizeTextInputSchema},
  output: {schema: FormalizeTextOutputSchema},
  prompt: `You are an expert text transformation AI. Your task is to rewrite the given text according to the specified style and intensity.

Original Text:
\`\`\`
{{{textToFormalize}}}
\`\`\`

Target Style: {{{targetStyle}}}
Intensity Level (1=very subtle, 2=slight, 3=clear transformation, 4=strong adherence, 5=extreme transformation/exaggeration): {{{intensityLevel}}}

Key Instructions:
- Analyze the original text carefully.
- Rewrite it to precisely match the 'Target Style'.
- The 'Intensity Level' dictates the degree of alteration:
    - Level 1: Minimal changes, primarily correcting minor tone issues or slight rephrasing.
    - Level 2: Noticeable adjustments to align better with the style, more rephrasing.
    - Level 3: A clear and balanced transformation to the target style. This is the default.
    - Level 4: Strong and significant rephrasing to fully embody the style.
    - Level 5: Extreme transformation. This might involve exaggeration if the style allows (e.g., 'Rendre sarcastique', 'Simplifier (ELI5)'). For 'Simplifier (ELI5)', use very simple language, short sentences, and analogies a 5-year-old would understand. For 'Rendre sarcastique', be clearly and humorously sarcastic.
- If 'Target Style' is 'Transformer en liste à puces': Format the main ideas/points from the original text as a bulleted list (using '-' or '*' for bullets).
- If 'Target Style' is 'Transformer en e-mail court': Produce a concise email body based on the input text. Include a polite salutation and closing if appropriate for a short email.
- Preserve the core meaning and intent of the original text unless the style explicitly demands alteration (e.g., 'Rendre sarcastique' will change the perceived intent).
- The output should ONLY be the transformed text. Do not include any preambles, apologies, or explanations like "Here is the transformed text:". Just provide the direct result.
- Ensure the output language is French if the input appears to be in French, or if the style implies a French context (like ELI5 explanations for a French speaker). Otherwise, match the input language.
- Pay close attention to nuances. For example, "Plus direct" should be assertive but not necessarily rude, while "Moins formel / Plus décontracté" should be casual and relaxed.

Output the transformed text below:
`,
  config: { // Add safety settings if needed, or other model configs
    // Example temperature (adjust as needed, 0.7 is a common default for creative tasks)
    temperature: 0.7,
     safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
    ],
  }
});

const formalizeTextFlow = ai.defineFlow(
  {
    name: 'formalizeTextFlow',
    inputSchema: FormalizeTextInputSchema,
    outputSchema: FormalizeTextOutputSchema,
  },
  async (input) => {
    const {output} = await formalizerPrompt(input);
    if (!output) {
        // This case should ideally be handled by the model or prompt structure ensuring output.
        // If it occurs, it might mean the model failed to produce structured output.
        throw new Error("AI model did not return the expected output structure.");
    }
    return output;
  }
);
