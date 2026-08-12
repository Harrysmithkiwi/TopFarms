-- 083_seeker_documents_employer_policy_to_authenticated.sql
--
-- Scopes the employer read policy on `seeker_documents` to the `authenticated` role.
--
-- WHY
-- The policy was created without a TO clause, which means TO PUBLIC — it is evaluated
-- for `anon` on every anonymous request against the table. Its four siblings on the same
-- table (seekers select/insert/update/delete own) are all TO authenticated. The hardening
-- regime says new policies are TO authenticated; this one predates it.
--
-- NOT A VULNERABILITY, AND THIS IS NOT A FIX PRESENTED AS ONE. The predicate opens with
-- `get_user_role((SELECT auth.uid())) = 'employer'`, and for an anonymous request
-- auth.uid() is NULL, so get_user_role returns NULL and the whole clause is NULL — never
-- true. Anonymous readers get nothing today and got nothing yesterday. What changes is
-- that Postgres stops evaluating a subquery-bearing predicate for a role that can never
-- satisfy it, and the table stops being the one place in the schema where the convention
-- does not hold.
--
-- VERIFIED BEFORE (pg_policy, prod, 2026-08-12)
--   employers select applicant visible documents   polroles = {-}              (PUBLIC)
--   seekers select own documents                   polroles = {authenticated}
--   seekers insert/update/delete own documents     polroles = {authenticated}
--
-- ALTER POLICY … TO changes only the role list. The USING expression is not restated
-- here on purpose: retyping a predicate that gates CVs and certificates is a chance to
-- get it subtly wrong, and this migration has no business touching it.

ALTER POLICY "employers select applicant visible documents"
  ON public.seeker_documents
  TO authenticated;
