
'use server';
/**
 * @fileOverview An AI flow to simplify text for easier reading.
 *
 * - simplifyText - A function that handles text simplification.
 * - SimplifyTextInput - The input type for the simplifyText function.
 * - SimplifyTextOutput - The return type for the simplifyText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SimplifyTextInputSchema = z.object({
  textToSimplify: z.string().min(1, { message: "Le texte à simplifier ne peut pas être vide." }).describe('The original text to be simplified.'),
  intensityLevel: z.number().min(1).max(5).describe('The intensity of the simplification (1=minimal, 5=very strong).'),
});
export type SimplifyTextInput = z.infer<typeof SimplifyTextInputSchema>;

const SimplifyTextOutputSchema = z.object({
  simplifiedText: z.string().describe('The simplified text.'),
});
export type SimplifyTextOutput = z.infer<typeof SimplifyTextOutputSchema>;

export async function simplifyText(input: SimplifyTextInput): Promise<SimplifyTextOutput> {
  const validatedInput = SimplifyTextInputSchema.parse(input);
  return simplifyTextFlow(validatedInput);
}

const simplifyPrompt = ai.definePrompt({
  name: 'simplifyTextPrompt',
  input: {schema: SimplifyTextInputSchema},
  output: {schema: SimplifyTextOutputSchema},
  prompt: `You are "Easy Genie", an AI assistant specialized in making text easier to read, especially for users with dyslexia or ADHD.
Your task is to rewrite the given text according to the specified simplification intensity level.
The output must be in French if the input is in French. Otherwise, match the input language.

Original Text:
\`\`\`
{{{textToSimplify}}}
\`\`\`

Simplification Intensity Level: {{{intensityLevel}}}

Intensity Level Guidance:
- Level 1 (Minimal): Make very light adjustments. Slightly shorten complex sentences if possible. Replace 1-2 very obscure words with more common synonyms. Preserve original phrasing as much as possible.
- Level 2 (Modéré): Actively shorten longer sentences. Break down complex sentences into 2-3 simpler ones. Replace some jargon or less common words with simpler alternatives. Ensure clarity.
- Level 3 (Standard): Aim for clear, concise sentences. Replace most jargon and complex vocabulary. Rephrase convoluted sentence structures. Ensure the core meaning is easily digestible. Paragraphs might be slightly shorter.
- Level 4 (Intensif): Use very simple vocabulary and short, direct sentences. Focus on single ideas per sentence. Avoid complex conjunctions or subordinate clauses. Ensure the main points are very obvious. This is similar to an "Explain Like I'm 10" (ELI10) style.
- Level 5 (Maximum): Use extremely simple language, very short sentences, and common everyday words. This is similar to an "Explain Like I'm 5" (ELI5) style. If the text is very long, consider providing a very simplified summary of key points instead of a full rewrite, but still present it as if it's the simplified version of the original. Be very direct.

Instructions:
- Preserve the core meaning and intent of the original text.
- Do NOT add any personal opinions, commentary, or information not present in the original text.
- Do NOT start your response with a preamble like "Voici le texte simplifié :" or "Okay, I will simplify...". Only output the simplified text itself.
- Ensure the output strictly adheres to the JSON schema defined for SimplifyTextOutput, specifically a string for 'simplifiedText'.
- If the original text contains formatting like line breaks or bullet points, try to preserve similar structure in the simplified version if it aids readability.

Output the simplified text below:
`,
  config: {
    temperature: 0.5, // More deterministic for simplification
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  }
});

const simplifyTextFlow = ai.defineFlow(
  {
    name: 'simplifyTextFlow',
    inputSchema: SimplifyTextInputSchema,
    outputSchema: SimplifyTextOutputSchema,
  },
  async (input) => {
    const {output} = await simplifyPrompt(input);
    if (!output) {
        throw new Error("AI model did not return the expected output structure for text simplification.");
    }
    return output;
  }
);
