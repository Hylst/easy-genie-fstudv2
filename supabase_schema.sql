
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Disable RLS for initial schema setup (optional, can be done per table)
-- ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- BrainDumps Table
CREATE TABLE IF NOT EXISTS public.brain_dumps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    dump_text TEXT,
    analysis_result TEXT,
    intensity_level INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
-- RLS for brain_dumps
ALTER TABLE public.brain_dumps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own brain dumps"
    ON public.brain_dumps
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
-- Trigger to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_brain_dumps_updated_at
BEFORE UPDATE ON public.brain_dumps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Routines Table
CREATE TABLE IF NOT EXISTS public.routines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    days TEXT[], -- Array of strings: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
    is_suggestion BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
-- RLS for routines
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own routines"
    ON public.routines
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_routines_updated_at
BEFORE UPDATE ON public.routines
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Routine Steps Table
CREATE TABLE IF NOT EXISTS public.routine_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    routine_id UUID REFERENCES public.routines(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- For simpler RLS directly on this table too
    text TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    step_order INTEGER DEFAULT 0, -- To maintain order of steps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
-- RLS for routine_steps
ALTER TABLE public.routine_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage steps for their own routines"
    ON public.routine_steps
    FOR ALL
    USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.routines WHERE public.routines.id = routine_id AND public.routines.user_id = auth.uid()))
    WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.routines WHERE public.routines.id = routine_id AND public.routines.user_id = auth.uid()));
-- Consider adding an index on routine_id for performance
CREATE INDEX IF NOT EXISTS idx_routine_steps_routine_id ON public.routine_steps(routine_id);
CREATE TRIGGER update_routine_steps_updated_at
BEFORE UPDATE ON public.routine_steps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- TaskBreaker Tasks Table
CREATE TABLE IF NOT EXISTS public.task_breaker_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    parent_id UUID REFERENCES public.task_breaker_tasks(id) ON DELETE CASCADE, -- Self-referencing for tree structure
    text TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    depth INTEGER NOT NULL DEFAULT 0,
    task_order INTEGER DEFAULT 0, -- To maintain order of sibling tasks
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
-- RLS for task_breaker_tasks
ALTER TABLE public.task_breaker_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own task breaker tasks"
    ON public.task_breaker_tasks
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
-- Consider adding an index on parent_id for performance
CREATE INDEX IF NOT EXISTS idx_task_breaker_tasks_parent_id ON public.task_breaker_tasks(parent_id);
CREATE TRIGGER update_task_breaker_tasks_updated_at
BEFORE UPDATE ON public.task_breaker_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- PriorityGrid Tasks Table
CREATE TABLE IF NOT EXISTS public.priority_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    text TEXT NOT NULL,
    quadrant TEXT NOT NULL, -- e.g., 'urgentImportant', 'notUrgentImportant'
    frequency TEXT, -- e.g., 'daily', 'weekly', 'once'
    specific_date DATE,
    specific_time TIME,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
-- RLS for priority_tasks
ALTER TABLE public.priority_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own priority tasks"
    ON public.priority_tasks
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_priority_tasks_updated_at
BEFORE UPDATE ON public.priority_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Ensure the 'update_updated_at_column' function is created if not already present
-- (It's defined once above and reused by triggers)

-- You might want to add more specific indexes based on query patterns later.
-- For example, on user_id columns in each table if you frequently query by user.
CREATE INDEX IF NOT EXISTS idx_brain_dumps_user_id ON public.brain_dumps(user_id);
CREATE INDEX IF NOT EXISTS idx_routines_user_id ON public.routines(user_id);
CREATE INDEX IF NOT EXISTS idx_routine_steps_user_id ON public.routine_steps(user_id); -- if you decide to use this for RLS directly
CREATE INDEX IF NOT EXISTS idx_task_breaker_tasks_user_id ON public.task_breaker_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_priority_tasks_user_id ON public.priority_tasks(user_id);

-- Note on Routine Steps RLS:
-- The RLS policy for routine_steps ensures that a user can only interact with steps
-- if they own the parent routine. This is a common way to handle related data.
-- If you also added user_id directly to routine_steps and indexed it,
-- you could simplify the RLS to just check auth.uid() = routine_steps.user_id,
-- but you'd need to ensure user_id is always correctly populated on insert.
-- The current policy is safer if user_id on routine_steps isn't always guaranteed
-- to be the routine owner's ID (though it should be).
-- For routine_steps, an explicit user_id column was added to the table definition
-- for direct RLS and easier querying if needed. The policy uses it.

-- Note on TaskBreakerTasks:
-- 'task_order' field added to allow ordering of sibling tasks.
-- 'depth' field can be maintained by the application or a trigger if desired.
-- For simplicity, application-maintained 'depth' is assumed.

-- RLS policies ensure that all operations are scoped to the authenticated user.
-- The WITH CHECK clause applies to INSERT and UPDATE operations, ensuring that
-- any new or modified rows also satisfy the policy condition.
