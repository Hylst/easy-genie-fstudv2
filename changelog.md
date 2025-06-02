
# Changelog

## Done

- Initial project setup (NextJS, ShadCN, Tailwind, Genkit).
- Basic layout (Header, Footer).
- Homepage with Hero and ToolGrid.
- Tool pages: TaskBreaker (basic client-side), TimeFocus, PriorityGrid (basic client-side), BrainDump (basic client-side logic and IntensitySelector).
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
- **Attribution**: Added "Geoffroy Streit" as creator in README and Footer.
- **Standardized Development Guide**: Created `tool_coding_method.md`.
- **TaskBreaker Tool AI Enhancement & Recursive Breakdown**:
    - Implemented Genkit AI flow `breakdown-task-flow.ts` for "Décomposer" button to provide sub-task suggestions based on main task and intensity.
    - Updated `TaskBreakerTool` UI to call AI, display suggestions, and handle loading states.
    - Added voice input for the main task field.
    - Sub-tasks (AI-generated or manual) are saved to/loaded from localStorage.
    - **Recursive Breakdown**: Implemented ability to break down any sub-task into further sub-sub-tasks, both manually and using AI. UI updated with indentation and controls for nested tasks. State management refactored to handle tree structure. LocalStorage updated to `TASK_BREAKER_STORAGE_KEY_SUBTASKS_v2` due to structure change.
- **PriorityGrid Tool Enhancements (Phase 1 - UI/UX & Basic Presets)**:
    - Updated `PriorityTask` interface to include optional `frequency`, `specificDate`, `specificTime`.
    - Enhanced the "Add Task" form with inputs for these new properties (Select for frequency, Popover Calendar for date, input type="time" for time).
    - **UI Clarity**:
        - Added asterisk `*` for required fields in "Add Task" and "Edit Task".
        - Implemented collapsible "Options avancées" section for frequency, date, and time in both "Add Task" and "Edit Task" forms to reduce initial clutter.
        - Added `Tooltip` components to clarify the purpose of quadrants and other input fields.
    - Implemented an "Edit Task" dialog to modify all task properties.
    - Task cards in the grid now display frequency, date, and time if set.
    - All task data, including new properties, is saved to/loaded from `localStorage` (using key `PRIORITY_GRID_STORAGE_KEY_v1`).
    - Implemented a functional **Preset System**:
        - "Charger un Preset" button opens a dialog.
        - Dialog lists hardcoded, categorized presets (e.g., "Routine Matinale", "Projet Important").
        - Selecting a preset populates the "Add Task" form, expanding advanced options if needed.
        - Toast notification confirms preset loading.

## To Do

- **PriorityGrid Tool Enhancements (Phase 2 - Recurrence & Storage)**:
    - Implement a basic client-side recurrence display logic (e.g., show "Due today" if daily and date matches).
    - Develop a full client-side recurrence engine (managing completion cycles, auto-generating next instances).
    - Integrate voice input for adding/editing tasks in PriorityGrid.
    - Explore AI assistance for quadrant suggestion based on task text and intensity.
    - Consider transitioning local storage from `localStorage` to IndexedDB for better structured data handling.
    - Plan Firebase integration for remote data storage and synchronization (requires authentication).
- **TaskBreaker Tool Enhancements**:
    - Consider voice input for adding/editing individual sub-tasks (currently only for main task).
    - Refine UI for very deep nesting if it becomes an issue.
- **RoutineBuilder Tool Enhancements (Phase 2)**:
    - Consider UI for reordering routines and steps.
    - Optional: Add specific time input for routines.
    - Optional: Interactive execution mode (checking off steps as done for a specific day).
    - Refine voice input for editing existing step text (currently only appends).
- Integrate Genkit AI more deeply into other existing tools (TimeFocus modes) to make the "magic level" (intensity) impact their behavior.
- Implement remaining tools from `tool-grid.tsx` with their specific functionalities and intensity level integrations:
    - DecisionHelper (placeholder page exists)
    - MoodTracker (placeholder page exists)
    - FocusMode (placeholder page exists)
- Add user authentication (e.g., Firebase Auth).
- Flesh out "Étincelles" (Sparks) page content.
- Implement actual email sending for contact form.
- Refine UI/UX across all tools, including responsive design, accessibility, loading states, and error handling for new features.
- Add relevant image placeholders with `data-ai-hint` to all newly developed tool pages where appropriate.
- Store tool data for authenticated users (e.g., using Firestore, once auth is in place).
- Add tests (unit, integration).
- Review and improve safety settings for Genkit flows.
- **Voice Input**: Refine voice input for BrainDump, Formalizer. Fully implement for new tools where applicable.

    