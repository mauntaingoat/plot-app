# Reelst Blog — FireCMS admin

This folder holds the FireCMS configuration for the Reelst blog. It is **not**
imported by the public Reelst React app — the public site reads `posts` and
`authors` directly from Firestore via `src/lib/blog.ts`.

You have two ways to run the admin:

## Option A — FireCMS Cloud (recommended to start)

Zero setup, free tier covers small-to-medium blogs.

1. Go to <https://app.firecms.co> and sign in with the same Google account
   that owns the Reelst Firebase project.
2. Click **New project**, point it at the `luna-baby-tracker` Firebase
   project (or whatever this project's Firebase ID is — check
   `src/config/firebase.ts`).
3. In the FireCMS UI, **Schema → Code mode → paste** the contents of
   `firecms.config.tsx`. (FireCMS Cloud lets you edit schemas in the UI
   too, but keeping the config in this repo is the source of truth.)
4. Add the `posts` and `authors` collections. Save.
5. Restrict access: in **Settings → Roles**, add yourself (and any future
   team editors) by email. Anyone not on the list can't open the admin.
6. Bookmark the admin URL — typically
   `https://app.firecms.co/p/<your-project-id>`.

## Option B — Self-hosted

Use this if you want the admin on `cms.reelst.co` with full branding control.

```bash
npx create-firecms-app reelst-cms
cd reelst-cms
# replace the generated src/collections.tsx with our config:
cp ../Reelst/cms/firecms.config.tsx src/collections.tsx
# wire your Firebase config (same project as Reelst):
#   - copy src/config/firebase.ts values into firebase_config.ts
pnpm i
pnpm dev   # local
pnpm build && firebase deploy --only hosting:cms-reelst   # prod
```

Point a CNAME at `cms.reelst.co` from your DNS provider to the deployed
hosting target.

## Firestore rules

Public site reads need to be allowed. Append to `firestore.rules`:

```
match /posts/{postId} {
  allow read: if resource.data.status == "published";
  allow write: if request.auth != null
    && request.auth.token.email in [
      "mauriiromano123@gmail.com",
      // add additional editor emails here
    ];
}
match /authors/{authorId} {
  allow read: if true;
  allow write: if request.auth != null
    && request.auth.token.email in [
      "mauriiromano123@gmail.com",
    ];
}
```

For stricter access control, switch to a `roles` collection or custom
claims (set via the Firebase admin SDK).

## Schema fields

`posts` documents (mirror of `BlogPost` in `src/lib/blog.ts`):

| Field            | Type        | Notes                                     |
|------------------|-------------|-------------------------------------------|
| `slug`           | string      | URL segment — lowercase + hyphens         |
| `title`          | string      | shown everywhere                          |
| `excerpt`        | string      | ≤240 chars, used in cards and post header |
| `body`           | string      | markdown (GFM)                            |
| `coverImage`     | string url  | uploaded to `blog/covers/`                |
| `authorId`       | reference   | → `authors/{id}`                          |
| `authorName`     | string      | denormalized — saves a list-page read     |
| `authorAvatar`   | string url  | denormalized                              |
| `category`       | enum        | one of 5 categories                       |
| `tags`           | string[]    | freeform                                  |
| `status`         | enum        | draft / published / scheduled             |
| `featured`       | boolean     | true → pin to /blog hero                  |
| `readTime`       | number      | minutes                                   |
| `publishedAt`    | timestamp   | controls feed order                       |
| `seoTitle`       | string?     | overrides title in `<title>` if set       |
| `seoDescription` | string?     | overrides excerpt in meta                 |
| `ogImage`        | string url? | overrides cover image for OG previews     |
| `createdAt`      | timestamp   | auto                                      |
| `updatedAt`      | timestamp   | auto                                      |

## Adding a new category

1. Edit `src/lib/blog.ts` — add it to `PostCategory`, `CATEGORY_LABELS`,
   and `CATEGORY_ORDER`.
2. Edit `cms/firecms.config.tsx` — add it to `category.enumValues`.
3. Re-deploy both.

## Indexes

Firestore needs composite indexes for the queries in `src/lib/blog.ts`:

```
(status, publishedAt desc)
(status, category, publishedAt desc)
(status, featured, publishedAt desc)
```

The first time these queries run in production, Firestore will surface a
console error with a one-click "create index" link. Easier than authoring
`firestore.indexes.json` by hand.
