/**
 * One-off publisher for the South Florida content draft.
 *
 * Reads docs/blog-drafts/south-florida-content-rise.md, strips the
 * frontmatter, and writes:
 *   - /authors/{AUTHOR_ID}   (upsert — safe to re-run)
 *   - /posts/{POST_ID}       (status: published)
 *
 * Auth — pick one before running:
 *   A) gcloud auth application-default login
 *   B) Download a service account key from Firebase Console
 *      → Project Settings → Service accounts → Generate new private key
 *      Save as ./service-account.json (gitignored), then:
 *        GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/service-account.json \
 *        node scripts/publish-blog-post.mjs
 */

import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Pull firebase-admin from functions/node_modules so the script doesn't
// require a separate install at the repo root.
const require = createRequire(import.meta.url)
const admin = require('../functions/node_modules/firebase-admin')

const __dirname = dirname(fileURLToPath(import.meta.url))
const draftPath = join(__dirname, '..', 'docs', 'blog-drafts', 'south-florida-content-rise.md')

// Strip the YAML frontmatter — body starts after the second `---` line.
const raw = readFileSync(draftPath, 'utf8')
const firstFence = raw.indexOf('---')
const secondFence = raw.indexOf('---', firstFence + 3)
if (firstFence === -1 || secondFence === -1) {
  throw new Error('Draft is missing the expected `---` frontmatter fences.')
}
const body = raw.slice(secondFence + 3).trim()

admin.initializeApp({ projectId: 'plot-fe990' })
const db = admin.firestore()
const FieldValue = admin.firestore.FieldValue

const AUTHOR_ID = 'mauricio-romano'
const POST_ID = 'south-florida-real-estate-content'

async function main() {
  await db.collection('authors').doc(AUTHOR_ID).set(
    {
      name: 'Mauricio Romano',
      avatar: null,
      bio: 'Founder of Reelst. Writing about the creator-economy shift in real estate.',
      twitter: null,
    },
    { merge: true },
  )
  console.log(`Author /authors/${AUTHOR_ID} upserted`)

  await db.collection('posts').doc(POST_ID).set({
    slug: 'south-florida-real-estate-content',
    title: 'The Rise of Real Estate Content in South Florida',
    excerpt:
      'How Miami, Brickell, and Coral Gables became the most-watched real estate market on social media, and what it tells us about where the rest of the country is headed.',
    body,
    coverImage: null,
    category: 'state-of-reel-estate',
    tags: [
      'south-florida',
      'miami',
      'real-estate-content',
      'creator-realtor',
      'state-of-reel-estate',
    ],
    status: 'published',
    featured: true,
    readTime: 9,
    publishedAt: FieldValue.serverTimestamp(),
    authorId: AUTHOR_ID,
    authorName: 'Mauricio Romano',
    authorAvatar: null,
    seoTitle: 'The Rise of Real Estate Content in South Florida | Reelst',
    seoDescription:
      'Miami, Brickell, and Coral Gables agents now dominate real estate content on Instagram and TikTok. The data, the playbook, and what it signals for every other US market.',
    ogImage: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
  console.log(`Post /posts/${POST_ID} published`)
  console.log('\nVerify at: https://reel.st/blog/south-florida-real-estate-content')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed:', err?.message || err)
    if (
      String(err?.message || '').includes('Could not load the default credentials') ||
      String(err?.errorInfo?.code || '').includes('app/invalid-credential')
    ) {
      console.error('\nAuth not set up. Pick one:')
      console.error('  A) gcloud auth application-default login')
      console.error('  B) Service account key — Firebase Console → ⚙️ Project Settings →')
      console.error('     Service accounts → Generate new private key. Save as')
      console.error('     ./service-account.json, then run with:')
      console.error(
        '       GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/service-account.json node scripts/publish-blog-post.mjs',
      )
    }
    process.exit(1)
  })
