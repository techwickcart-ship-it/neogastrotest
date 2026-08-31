-- Revoke execute on rls_auto_enable and secure search_path
ALTER FUNCTION public.rls_auto_enable() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
