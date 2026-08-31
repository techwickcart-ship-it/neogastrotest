-- ==============================================================================
-- SUPABASE DATABASE LINTER WARNINGS REMEDIATION SCRIPT
-- ==============================================================================

-- 1. FIX: function_search_path_mutable (Lint 0011)
-- Problem: Function `public.update_ipd_eval_sheets_updated_at` has a mutable search_path.
-- Solution: Re-create function with explicit `SET search_path = public` and revoke public RPC execution.

CREATE OR REPLACE FUNCTION public.update_ipd_eval_sheets_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Revoke direct RPC execution on trigger function
REVOKE EXECUTE ON FUNCTION public.update_ipd_eval_sheets_updated_at() FROM PUBLIC, anon, authenticated;


-- 2. FIX: anon_security_definer_function_executable & authenticated_security_definer_function_executable (Lint 0028 & 0029)
-- Problem: Function `public.rls_auto_enable()` is callable by `anon` and `authenticated` roles as a `SECURITY DEFINER` function.
-- Solution: Revoke `EXECUTE` permission on `public.rls_auto_enable()` from `PUBLIC`, `anon`, and `authenticated` roles and set explicit search_path.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace 
        WHERE pg_namespace.nspname = 'public' AND pg_proc.proname = 'rls_auto_enable'
    ) THEN
        ALTER FUNCTION public.rls_auto_enable() SET search_path = public;
        REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
    END IF;
END $$;

-- Direct Revoke Command
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
