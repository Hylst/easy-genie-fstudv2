
# Changelog

## Done

- Initial project setup (NextJS, ShadCN, Tailwind, Genkit).
- Basic layout (Header, Footer).
- Homepage with Hero and ToolGrid.
- Tool pages: TaskBreaker, TimeFocus, PriorityGrid, BrainDump with client-side logic and IntensitySelector.
- Contact page (mock submission).
- Legal pages (Privacy, Terms).
- Sparks page (placeholder).
- Basic Genkit setup (`ai/genkit.ts`).
- Toaster component for notifications.
- Implemented "Formaliseur" (Formalizer) tool with basic UI and Genkit AI integration (`formalize-text-flow.ts`).
- Configured Gemini API Key in environment variables.
- Updated tool grid with magic/genie themed image hints for existing tools.
- **BrainDump Tool Major Update**:
    - Added "Analyser par le Génie" button for AI-powered text analysis.
    - Implemented `analyze-brain-dump-flow.ts` Genkit flow that varies analysis based on intensity level.
    - Added display area for AI analysis results.
    - Implemented loading state for AI analysis.
    - Added voice input (speech-to-text) functionality with a microphone button next to the textarea, using Web Speech API.
    - Updated save/download to include AI analysis if present.

## To Do

- Integrate Genkit AI more deeply into other existing tools (TaskBreaker suggestions, TimeFocus modes, PriorityGrid classification help) to make the "magic level" (intensity) impact their behavior.
- Implement remaining tools from `tool-grid.tsx` with their specific functionalities and intensity level integrations:
    - RoutineBuilder (placeholder page exists)
    - DecisionHelper (placeholder page exists)
    - MoodTracker (placeholder page exists)
    - FocusMode (placeholder page exists)
- Add user authentication (e.g., Firebase Auth).
- Flesh out "Étincelles" (Sparks) page content.
- Implement actual email sending for contact form.
- Refine UI/UX across all tools, including responsive design, accessibility, loading states, and error handling for new features (e.g., voice input).
- Add relevant image placeholders with `data-ai-hint` to all newly developed tool pages where appropriate.
- Store tool data for authenticated users (e.g., using Firestore).
- Add tests (unit, integration).
- Review and improve safety settings for Genkit flows.
- **Voice Input**: Refine voice input for BrainDump and consider adding it to other tools with text input (e.g., Formalizer, TaskBreaker main task).

    