# Reelst Blog — FireCMS config (PARKED, not in active use)

> **Status:** This folder is not wired up. The active blog publishing flow
> is `scripts/publish-blog-post.mjs` (admin SDK over `gcloud auth
> application-default login`). FireCMS was set up in April 2026 as a
> future option and never activated. The FireCMS Cloud web-app
> registration was removed from Firebase Console on 2026-05-12.

Keeping `firecms.config.tsx` here so the schema doesn't have to be
rewritten from scratch if the publishing volume ever justifies a hosted
admin UI. The config mirrors the `BlogPost` and `BlogAuthor` types in
`src/lib/blog.ts`.

## When it might make sense to revive this

- Catalog grows past ~50-100 posts (markdown-file-per-post stops scaling)
- Non-engineer team members need to publish without using a terminal
- Editorial workflow needs draft → review → publish states with a UI
- You want scheduled publishing without writing a cron yourself

## How to revive (rough sketch)

1. Re-authorize FireCMS Cloud at <https://app.firecms.co> against the
   `plot-fe990` Firebase project. This will register a fresh web app
   in Firebase Console.
2. In the FireCMS UI, **Schema → Code mode → paste** the contents of
   `firecms.config.tsx`.
3. Audit `firecms.config.tsx` against `src/lib/blog.ts` — the types may
   have drifted since this was last touched.
4. Update the App Check console for the new FireCMS app (register or
   dismiss; FireCMS Cloud's JS bundle isn't yours to control).
5. Tighten Firestore rules: `/posts` and `/authors` writes should be
   gated to admin emails (already are via custom claims) so the new
   FireCMS users can be added without opening writes site-wide.

If you take this path, replace this README so it documents the live
flow rather than the parked one.
