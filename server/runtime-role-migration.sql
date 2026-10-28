GRANT USAGE ON SCHEMA public TO ege_app_runtime;

GRANT SELECT, INSERT ON TABLE public.users TO ege_app_runtime;
GRANT INSERT ON TABLE public.progress TO ege_app_runtime;
GRANT USAGE, SELECT ON SEQUENCE public.users_id_seq TO ege_app_runtime;
GRANT USAGE, SELECT ON SEQUENCE public.progress_id_seq TO ege_app_runtime;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY ege_app_runtime_users_select ON public.users
    FOR SELECT TO ege_app_runtime USING (true);
CREATE POLICY ege_app_runtime_users_insert ON public.users
    FOR INSERT TO ege_app_runtime WITH CHECK (true);
CREATE POLICY ege_app_runtime_progress_insert ON public.progress
    FOR INSERT TO ege_app_runtime WITH CHECK (true);

