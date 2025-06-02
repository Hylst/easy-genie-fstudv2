
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
    *   Added voice input (speech-to-text) functionality with a microphone button next to the textarea, using Web Speech API.
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
    - All task data, including new properties, is saved to/loaded from `localStorage` (using key `PRIORITY_GRID_STORAGE_KEY_TASKS_v1`).
    - Implemented a functional **Preset System**:
        - "Charger un Preset" button opens a dialog.
        - Dialog lists hardcoded, categorized presets using an Accordion for a tree-like structure.
        - Selecting a preset populates the "Add Task" form, expanding advanced options if needed.
        - Toast notification confirms preset loading.
        - Added more preset categories and items.
- **PriorityGrid Tool Enhancements (Phase 1.5 - Custom Presets)**:
    - Added "Sauvegarder comme Preset" button to save current task form details as a custom preset.
    - Custom presets are named by the user via a dialog.
    - Custom presets are saved to/loaded from `localStorage` (using key `PRIORITY_GRID_CUSTOM_PRESETS_KEY_v1`).
    - Custom presets are displayed in the "Charger un Preset" dialog under a "Mes Presets Personnalisés" category.
- **Database Integration Planning (Phase 0 Started)**:
    - Installed `@supabase/supabase-js` library.
    - Added placeholder `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env`.
    - Added a placeholder "Hors ligne / Online" toggle button to the header (shows a toast).
- **Database Integration (Phase 0 Continued)**:
    - Removed "Outils (Lampe)" and "Étincelles" navigation buttons from header.
    - Updated `.env` with actual Supabase project URL and anon key.
    - Created `src/lib/supabaseClient.ts` to initialize and export the Supabase client.
    - Provided `supabase_schema.sql` for user to set up tables (brain_dumps, routines, routine_steps, task_breaker_tasks, priority_tasks) and RLS policies in their Supabase project.
    - User executed `supabase_schema.sql` in their Supabase project.
- **Database Integration (Phase 1: User Authentication)**:
    - Implemented Sign Up (`/auth/signup/page.tsx`) and Log In (`/auth/login/page.tsx`) pages with UI logic using ShadCN components, react-hook-form, Zod, and Supabase client methods.
    - Created `AuthContext` (`src/contexts/AuthContext.tsx`) for session management (listens to `onAuthStateChange` from Supabase). It also initializes `AppDataService` with user ID and manages a basic online/offline state.
    - Wrapped root layout in `AuthProvider`.
    - Updated `MagicHeader` (`src/components/common/magic-header.tsx`) to dynamically display:
        - "Connexion" and "Inscription" links when logged out.
        - User avatar (initials), email (desktop), and "Déconnexion" button when logged in.
        - Loading skeletons during auth state determination.
    - The "Hors ligne / Online" button is now visually disabled if no user is logged in, and toggles a global state managed via `AuthContext` and `AppDataService`.
- **Database Integration (Phase 2: Abstract Data Layer & Services - PriorityTask)**:
    - Installed `dexie` library for IndexedDB management.
    - Updated `src/types/index.ts` with comprehensive data models including `id`, `user_id`, `created_at`, `updated_at` and DTOs for creation. Ensured `PriorityTask` includes `isCompleted`.
    - Defined service interfaces in `src/services/interfaces/` (`IService.ts`, `IPriorityTaskService.ts`, `IRoutineService.ts`, `IBrainDumpService.ts`, `ITaskBreakerService.ts`).
    - Updated `src/services/indexeddb/db.ts` to set up Dexie database schema ("EasyGenieDB_v1", version 2) for all entities, confirming `id` as primary key for UUIDs.
    - Implemented `PriorityTaskIndexedDBService` (`src/services/indexeddb/priority-task.indexeddb.service.ts`) with full CRUD operations.
    - Implemented `PriorityTaskSupabaseService` (`src/services/supabase/priority-task.supabase.service.ts`) with full CRUD operations, ensuring user_id filtering.
    - Created/Updated `AppDataService` (`src/services/appDataService.ts`) to orchestrate data operations for `PriorityTask` based on online/offline state and user ID.
    - Ensured `AuthContext` correctly initializes `AppDataService` with `userId` and current `isOnline` status, and updates `AppDataService` on changes.
- **Database Integration (Phase 2: Abstract Data Layer & Services - Continued for All Entities)**:
    - Updated `src/types/index.ts` ensuring comprehensive DTOs for `Routine`, `RoutineStep`, `BrainDumpContent`, `TaskBreakerTask`.
    - Implemented IndexedDB service providers:
        - `RoutineIndexedDBService` (`src/services/indexeddb/routine.indexeddb.service.ts`) with full CRUD for routines and steps.
        - `BrainDumpIndexedDBService` (`src/services/indexeddb/brain-dump.indexeddb.service.ts`) with full CRUD for brain dumps.
        - `TaskBreakerIndexedDBService` (`src/services/indexeddb/task-breaker.indexeddb.service.ts`) with full CRUD for tasks, including parent-child relationships.
    - Implemented Supabase service providers:
        - `RoutineSupabaseService` (`src/services/supabase/routine.supabase.service.ts`) with full CRUD for routines and steps.
        - `BrainDumpSupabaseService` (`src/services/supabase/brain-dump.supabase.service.ts`) with full CRUD for brain dumps.
        - `TaskBreakerSupabaseService` (`src/services/supabase/task-breaker.supabase.service.ts`) with full CRUD for tasks.
    - Expanded `AppDataService` (`src/services/appDataService.ts`) to include methods for `RoutineService`, `BrainDumpService`, and `TaskBreakerService`, routing calls to the appropriate local or remote service based on online status and user ID.
- **Database Integration (Phase 3: Integrate PriorityGrid with New Data Layer)**
    - Refactored `PriorityGridTool` to use `AppDataService.getAllPriorityTasks()`, `AppDataService.addPriorityTask()`, etc., instead of `localStorage` for task data.
    - Used ShadCN `Checkbox` component for task completion in `PriorityGridTool`.
    - The "Hors ligne / Online" toggle in `MagicHeader` (managed via `AuthContext`) now effectively switches data sources for `PriorityGridTool` (IndexedDB or Supabase) via `AppDataService`, triggering data re-fetch.
    - Implemented loading states and error handling for data operations in `PriorityGridTool`.
    - Ensured task manipulation UI (add, edit, delete, complete) is disabled if no user is logged in.

## To Do

- **Database & Sync Implementation (High Priority)**:
    - **Phase 4: Synchronization Logic**
        *   Implement logic for tracking local changes (dirty checking or pending sync log in IndexedDB when an online operation fails or when offline).
        *   Implement initial sync (on login/switch to online): upload local changes, download remote changes, implement conflict resolution strategy (e.g., last write wins based on `updated_at`, or server/client priority).
        *   Implement ongoing sync: attempt Supabase write first if online; if fails (e.g. network issue), queue locally with "pending_sync" status.
        *   Implement offline-to-online sync: process pending_sync queue, fetch remote changes since last sync, resolve conflicts.
    - **Phase 5: Integrate Other Tools** (TaskBreaker, RoutineBuilder, BrainDump) with `AppDataService` and the new data persistence layer.
    - **Phase 6: UI Feedback & Error Handling** for sync status, online/offline mode transitions, and data operation errors across all tools.
- **PriorityGrid Tool Enhancements (Post-Database Integration)**:
    - Implement a full client-side recurrence engine (managing completion cycles, auto-generating next instances for daily, weekly tasks etc.).
    - Integrate voice input for adding/editing tasks in PriorityGrid.
    - Explore AI assistance for quadrant suggestion based on task text and intensity.
    - Consider migrating custom preset storage from `localStorage` to the database.
- **TaskBreaker Tool Enhancements**:
    - Consider voice input for adding/editing individual sub-tasks (currently only for main task).
    - Refine UI for very deep nesting if it becomes an issue.
    - Ensure robust recursive deletion of child tasks in Supabase (currently relies on DB cascade or needs client-side recursion for Supabase service).
- **RoutineBuilder Tool Enhancements (Phase 2)**:
    - Consider UI for reordering routines and steps.
    - Optional: Add specific time input for routines.
    *   Optional: Interactive execution mode (checking off steps as done for a specific day).
    - Refine voice input for editing existing step text (currently only appends).
- Integrate Genkit AI more deeply into other existing tools (TimeFocus modes) to make the "magic level" (intensity) impact their behavior.
- Implement remaining tools from `tool-grid.tsx` (DecisionHelper, MoodTracker, FocusMode) with their specific functionalities, intensity level integrations, and database persistence.
- Flesh out "Étincelles" (Sparks) page content.
- Implement actual email sending for contact form.
- Refine UI/UX across all tools, including responsive design, accessibility, loading states, and error handling for new features.
- Add relevant image placeholders with `data-ai-hint` to all newly developed tool pages where appropriate.
- Add tests (unit, integration).
- Review and improve safety settings for Genkit flows.
- **Voice Input**: Refine voice input for BrainDump, Formalizer. Fully implement for new tools where applicable.
- **User Profile**: Consider a dedicated user profile page for managing account details (e.g., password change, profile picture if Supabase Storage is used).
- **Email Confirmation**: Ensure "Confirm email" is enabled in Supabase project settings for production.
- **Password Reset**: Implement a "Forgot Password" flow using Supabase's `sendPasswordResetEmail` and a page to handle the password update.

```

