# Abacus Dedicated Supabase Project and Storage Boundary

## Decision
The Abacus Beads Championship is an independent online competition application. It requires its own Supabase project, database, Auth users, Storage buckets, Edge Functions, secrets and access policies. It must not use VATTAMS Academia's Supabase project or storage.

## Proposed project
- Project: vattams-abacus-championship
- Organization: Vattams-admin's Org
- Region: ap-south-1 (Mumbai)
- Quoted project cost returned by Supabase: USD 0/month at time of quote. Usage limits and possible additional charges remain subject to plan and consumption.
- Project provisioning is pending the tool's explicit cost-confirmation step.

## Separate private Storage buckets
Create only inside the dedicated Abacus project:
- abacus-question-papers-private — approved and draft papers; private, no public reads.
- abacus-answer-keys-private — answer keys and scoring references; tightly restricted to server/admin reviewer workflows.
- abacus-submissions-private — attempt evidence and controlled submission exports; owner-scoped access where applicable.
- abacus-certificates — issued certificates; private by default, with a separate minimal public verification endpoint rather than public bucket listing.
- abacus-brand-assets — approved public logos and static marketing assets only; may be public if reviewed.

## Storage security
- Never copy Academia bucket policies or reuse its credentials.
- Deny public access to all assessment, answer-key and submission buckets.
- Use Storage policies tied to authenticated user identity and server-verified registration ownership; do not rely on user-editable metadata.
- Validate file type, size, extension, ownership and expected object path.
- Keep service-role/secret keys server-side only.
- For object replacement/upsert, ensure INSERT, SELECT and UPDATE permissions are all intentionally scoped.
- Signed URLs must be short-lived and issued only after server-side eligibility checks.
- Audit uploads, downloads, deletion and privileged review actions without logging secret tokens or sensitive payloads.

## Online competition flow
Student/guardian registration -> eligibility approval -> scheduled attempt -> server-authorised question delivery -> autosaved responses -> final submission -> server-side scoring -> moderation -> result approval -> certificate issuance.

Official question sets and answer keys must never be included in frontend bundles. The copied source bank is review-required and not approved for competition publication.

## Provisioning and release gates
1. Explicitly confirm the quoted project cost when requested by the Supabase provisioning workflow.
2. Create the dedicated project and wait for ACTIVE_HEALTHY.
3. Verify project ref, region and ownership.
4. Create schema, RLS, private buckets and least-privilege Storage policies only in the new project.
5. Test anonymous denial, cross-student denial, reviewer access and admin access.
6. Deploy server-side exam/scoring functions.
7. Do not connect production frontend or publish competition papers until security and content-review gates pass.

## Separation guarantee
No change to vattams-academy or the other existing Supabase project is authorised by this plan.