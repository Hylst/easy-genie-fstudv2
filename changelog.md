
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
- **RoutineBuilder Tool Initial Implementation**:
    - Enabled in ToolGrid with `CalendarCheck` icon and `genie planner` hint.
    - Created page `src/app/routine-builder/page.tsx` with banner image.
    - Developed `RoutineBuilderTool` component (`src/components/tools/routine-builder-tool.tsx`):
        - Includes `IntensitySelector`.
        - Allows creating, deleting routines (name, description, days, steps).
        - Allows adding, editing (text), deleting steps within routines.
        - Routines and steps are saved to/loaded from localStorage.
        - Routines displayed in an accordion.
        - Day selection for routines.
- **RoutineBuilder Tool Enhancements (Phase 1)**:
    - Implemented Genkit AI flow `suggest-routine-flow.ts` for "Obtenir des suggestions du Génie" to provide actual routine/step suggestions based on user goal and intensity.
        - AI suggestion is added directly to the routine list, marked as a suggestion.
    - Implemented voice input using Web Speech API for:
        - New routine name.
        - New routine description.
        - New step text for each routine.
    - Added dialog to capture user's goal for AI routine suggestion.
    - Visual feedback for active microphone and loading states.

## To Do

- **RoutineBuilder Tool Enhancements (Phase 2)**:
    - Consider UI for reordering routines and steps.
    - Optional: Add specific time input for routines.
    - Optional: Interactive execution mode (checking off steps as done for a specific day).
    - Refine voice input for editing existing step text (currently only appends).
- Integrate Genkit AI more deeply into other existing tools (TaskBreaker suggestions, TimeFocus modes, PriorityGrid classification help) to make the "magic level" (intensity) impact their behavior.
- Implement remaining tools from `tool-grid.tsx` with their specific functionalities and intensity level integrations:
    - DecisionHelper (placeholder page exists)
    - MoodTracker (placeholder page exists)
    - FocusMode (placeholder page exists)
- Add user authentication (e.g., Firebase Auth).
- Flesh out "Étincelles" (Sparks) page content.
- Implement actual email sending for contact form.
- Refine UI/UX across all tools, including responsive design, accessibility, loading states, and error handling for new features.
- Add relevant image placeholders with `data-ai-hint` to all newly developed tool pages where appropriate.
- Store tool data for authenticated users (e.g., using Firestore).
- Add tests (unit, integration).
- Review and improve safety settings for Genkit flows.
- **Voice Input**: Refine voice input for BrainDump and Formalizer. Fully implement for TaskBreaker, PriorityGrid, and new tools where applicable.
    
