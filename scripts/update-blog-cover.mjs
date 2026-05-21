/**
 * One-off: patch the South Florida blog post's coverImage + ogImage
 * fields to the newly generated Nano Banana cover. Uses Firestore
 * `update()` (not `set()`) so other fields — createdAt, publishedAt —
 * stay untouched.
 *
 * Run from the repo root (just like publish-blog-post.mjs):
 *   node scripts/update-blog-cover.mjs
 *
 * After running, do a hosting deploy so the asset is served:
 *   npm run build && firebase deploy --only hosting
 *
 * Auth — pick one before running:
 *   A) gcloud auth application-default login
 *   B) GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/service-account.json node scripts/update-blog-cover.mjs
 */

import { createRequire } from 'module'

// Pull firebase-admin from functions/node_modules so the script doesn't
// require a separate install at the repo root.
const require = createRequire(import.meta.url)
const admin = require('../functions/node_modules/firebase-admin')

const PROJECT_ID = 'plot-fe990'
const POST_ID = 'south-florida-real-estate-content'
const COVER_PATH = '/blog/south-florida-real-estate-content.png'
const COVER_URL = `https://reel.st${COVER_PATH}`

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: PROJECT_ID,
})

const db = admin.firestore()

await db.collection('posts').doc(POST_ID).update({
  coverImage: COVER_URL,
  ogImage: COVER_URL,
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
})

console.log(`Patched /posts/${POST_ID}`)
console.log(`coverImage + ogImage → ${COVER_URL}`)
console.log('\nReminder: deploy hosting so the asset is served:')
console.log('  npm run build && firebase deploy --only hosting')

process.exit(0)
