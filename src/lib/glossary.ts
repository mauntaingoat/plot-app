/* ════════════════════════════════════════════════════════════════
   GLOSSARY, real estate + creator/social media terms
   ────────────────────────────────────────────────────────────────
   Static term catalog backing the Glossary index page (`/glossary`)
   and per-term pages (`/glossary/:slug`). Indexed by Google for
   long-tail capture; cross-linked internally so each term page
   compounds on its neighbors. Hub-page pattern modeled on beehiiv's
   newsletter glossary.

   Scope is intentionally agnostic of Reelst's product surface,
   these are terms agents and buyers run into in the wild,
   regardless of which tools they use.

   v1 is hardcoded here so we can ship the full hub on day one.
   When the catalog grows past ~150 terms or starts changing weekly
   we can mirror this into a `glossaryTerms` Firestore collection
   and load it the same way as posts.
   ──────────────────────────────────────────────────────────────── */

export type GlossaryCategory =
  | 'real-estate'
  | 'transactions'
  | 'financing'
  | 'property'
  | 'investing'
  | 'marketing'
  | 'content'

export interface GlossaryTerm {
  /** URL-safe identifier, also the route segment at `/glossary/:slug`. */
  slug: string
  /** Display title (preserves capitalization, abbreviations). */
  title: string
  /** Short tagline shown on the index card and in the term hero. */
  tagline: string
  /** Markdown body, full definition, examples, usage. */
  body: string
  /** Top-level grouping for the index page filter. */
  category: GlossaryCategory
  /** Slugs of related terms surfaced in the "See also" section. */
  related?: string[]
  /** Optional override for SEO meta title (else `title, Reelst Glossary`). */
  seoTitle?: string
  /** Optional override for SEO meta description (else `tagline`). */
  seoDescription?: string
}

export const GLOSSARY_CATEGORIES: { id: GlossaryCategory; label: string }[] = [
  { id: 'real-estate',   label: 'Real estate' },
  { id: 'transactions',  label: 'Transactions' },
  { id: 'financing',     label: 'Financing' },
  { id: 'property',      label: 'Property types' },
  { id: 'investing',     label: 'Investing' },
  { id: 'marketing',     label: 'Marketing' },
  { id: 'content',       label: 'Content' },
]

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  /* ─────────────────────── REAL ESTATE FUNDAMENTALS ─────────────────────── */
  {
    slug: 'mls',
    title: 'MLS',
    tagline: 'Multiple Listing Service, the database listing agents share with each other.',
    category: 'real-estate',
    related: ['idx', 'pocket-listing', 'listing-agent', 'days-on-market'],
    body: `**MLS** stands for **Multiple Listing Service**. It's the regional database (typically run by a local Realtor association) where listing agents post properties so other agents, buyers' agents specifically, can find them and bring qualified buyers.

Each MLS is local. There are over 500 of them in the U.S., and they don't all share data with each other. The portals you've heard of, Zillow, Realtor.com, Redfin, pull most of their feeds from local MLSs. When agents say *"it just hit the MLS,"* they mean the listing went live in that database and is now visible to every other agent in the region.

Anything you market publicly, reels, blog posts, your link in bio, generally drives attention to MLS-listed properties, not replaces the MLS itself.`,
  },
  {
    slug: 'idx',
    title: 'IDX',
    tagline: 'Internet Data Exchange, the feed that lets agents put MLS listings on their own websites.',
    category: 'real-estate',
    related: ['mls', 'pocket-listing'],
    body: `**IDX** (Internet Data Exchange) is the rule + tech that lets a licensed agent display *other agents' MLS listings* on their own website. Without IDX, a buyer browsing your site would only see your own listings, which, especially for newer agents, is a very short list.

Most agent websites that show "every home for sale in Miami" are powered by an IDX feed: the MLS pushes listing data to the site on a delay (often 15 minutes), and the site renders it for visitors.

IDX makes every agent site look the same, they all show the same listings. Differentiation has to come from elsewhere: your brand, your content, your point of view.`,
  },
  {
    slug: 'cma',
    title: 'CMA',
    tagline: 'Comparative Market Analysis, the report agents use to price a home.',
    category: 'real-estate',
    related: ['arv', 'days-on-market', 'appraisal'],
    body: `A **Comparative Market Analysis** is the document a listing agent prepares to recommend a list price for a home. It compares the subject property to recent sales of similar homes in the same area, the *comps*, and adjusts for differences (sqft, lot size, condition, view, etc.).

A solid CMA pulls **3–6 closed sales from the last 6 months**, ideally within a half-mile radius. Active listings and pending sales factor in too, but closed comps are the strongest signal because they reflect what buyers actually paid.

Don't confuse a CMA with an [appraisal](/glossary/appraisal), appraisals are formal valuations done by a licensed appraiser for the lender. CMAs are an agent's professional opinion, used to set list price and negotiate.`,
  },
  {
    slug: 'days-on-market',
    title: 'Days on Market (DOM)',
    tagline: 'How long a listing has been live on the MLS without going under contract.',
    category: 'real-estate',
    related: ['mls', 'cma', 'pending'],
    body: `**Days on Market**, abbreviated **DOM**, is the count of days from when a listing first hits the MLS to when it goes pending or expires. It's one of the most-watched health metrics for a market.

A short DOM (under 14 days) signals a hot market, buyers are competing. A long DOM (60+ days) suggests something's off: priced too high, presentation issues, or declining demand.

Buyers' agents pay close attention. If a listing has been sitting for 90+ days, a buyer's agent will often advise their client to come in below ask, on the assumption that the seller is fatigued.

**Watch out for relisting.** Some agents pull and relist to wipe DOM, but most MLSs flag this as "previously listed", buyers' agents see right through it.`,
  },
  {
    slug: 'pocket-listing',
    title: 'Pocket listing',
    tagline: 'A listing the agent markets privately, without putting it on the MLS.',
    category: 'real-estate',
    related: ['mls', 'idx', 'coming-soon'],
    body: `A **pocket listing** is a property an agent represents but markets only through their personal network, not the public MLS. The seller might want privacy (celebrities, divorces, estate sales) or the agent is testing the price before going wide.

Pocket listings have come under regulatory pressure in recent years; many MLSs now require listings to be made public within a fixed window (often 24 hours) once any marketing happens. This is the **Clear Cooperation Policy** in NAR-affiliated MLSs.

For agents working luxury or off-market deals, pocket listings can be a content goldmine, but be careful with the legal framing. "Coming soon" is fine; explicitly marketing an unlisted property publicly can violate Clear Cooperation rules.`,
  },
  {
    slug: 'listing-agent',
    title: 'Listing agent',
    tagline: 'The agent who represents the seller in a real estate transaction.',
    category: 'real-estate',
    related: ['buyers-agent', 'dual-agency', 'cma'],
    body: `The **listing agent** is the agent who represents the seller. They sign a listing agreement with the seller, run the [CMA](/glossary/cma), price the home, market it, manage showings, and negotiate offers on the seller's behalf.

The listing agent's commission is paid out of the sale proceeds at closing, traditionally split with the [buyer's agent](/glossary/buyers-agent). Post-NAR settlement (2024), the listing-side and buyer-side commissions are now negotiated separately on most deals.

Confusingly, "listing agent" is sometimes used interchangeably with "seller's agent." They mean the same thing.`,
  },
  {
    slug: 'buyers-agent',
    title: "Buyer's agent",
    tagline: "The agent who represents the buyer in a real estate transaction.",
    category: 'real-estate',
    related: ['listing-agent', 'dual-agency', 'showing'],
    body: `A **buyer's agent** represents the buyer. They help search for homes, schedule [showings](/glossary/showing), advise on offers, negotiate contracts, and shepherd the buyer through inspection and closing.

Historically, the buyer's agent was paid out of the seller's commission (offered through the MLS as a "cooperating commission"). Post-NAR settlement (2024), buyers now sign a written buyer-broker agreement spelling out exactly how their agent gets paid, sometimes still by the seller, sometimes directly by the buyer, sometimes split.

A great buyer's agent earns their fee at the negotiating table, not by unlocking doors.`,
  },
  {
    slug: 'dual-agency',
    title: 'Dual agency',
    tagline: 'When a single agent represents both the buyer and the seller in the same transaction.',
    category: 'real-estate',
    related: ['listing-agent', 'buyers-agent'],
    body: `**Dual agency** happens when one agent (or one brokerage) represents both sides of a transaction, the buyer *and* the seller. It's legal in most states with written disclosure and consent from both parties, and outright illegal in a handful (Alaska, Colorado, Florida among others, depending on the year).

The conflict is obvious: an agent's fiduciary duty includes negotiating the best possible price for their client, and you can't simultaneously argue for the highest price and the lowest price. In dual agency, the agent typically becomes more of a transaction facilitator than a fiduciary, and pricing/negotiation is left to the parties to figure out.

Some states allow **designated agency** as a workaround, different agents within the same brokerage represent each side, with internal information walls.`,
  },
  {
    slug: 'cooperating-commission',
    title: 'Cooperating commission',
    tagline: "The commission a listing agent offers to the buyer's agent who brings the deal.",
    category: 'real-estate',
    related: ['listing-agent', 'buyers-agent'],
    body: `**Cooperating commission** is the cut of the listing agent's commission that's offered to a [buyer's agent](/glossary/buyers-agent) who brings a successful buyer. Historically advertised in the MLS as "BAC" (Buyer Agent Commission) or "Coop", typically 2–3% of sale price.

Post the August 2024 NAR settlement, MLSs no longer carry cooperating-commission fields on listings. Instead, buyer's agents and their clients negotiate compensation upfront in a written buyer-broker agreement, and the buyer's side is requested directly during the offer.

This is one of the largest structural shifts in U.S. real estate in 50 years and is still settling out.`,
  },
  {
    slug: 'bpo',
    title: 'BPO',
    tagline: "Broker Price Opinion, a quick valuation done by an agent, lighter than an appraisal.",
    category: 'real-estate',
    related: ['cma', 'appraisal'],
    body: `A **Broker Price Opinion** is an agent's professional estimate of a property's value, ordered most often by lenders or asset managers (banks holding REOs, for example). It's faster and cheaper than a formal [appraisal](/glossary/appraisal), typically a 30-minute drive-by plus a written report, and it doesn't carry the legal weight of an appraisal.

Lenders often use BPOs in pre-foreclosure scenarios, REO management, or for portfolio valuation where a full appraisal isn't justified.

Not the same as a [CMA](/glossary/cma), a BPO is for an institutional client, a CMA is for an individual seller.`,
  },
  {
    slug: 'lot-size',
    title: 'Lot size',
    tagline: "The total land area a property sits on, typically in square feet or acres.",
    category: 'real-estate',
    related: ['square-footage', 'setback', 'zoning'],
    body: `**Lot size** is the total area of the parcel of land a property sits on, measured in square feet (sub-1 acre) or acres. The home itself, the yard, the driveway, and any outbuildings all sit within the lot.

Lot size matters more than buyers initially realize. Two homes with identical floor plans on different lots, one a 5,000 sqft urban lot, one a half-acre suburban lot, are very different products. Suburban buyers often weight lot heavily; urban buyers care more about [square footage](/glossary/square-footage).

Lot size also drives buildable area, future expansion potential, and tax assessment.`,
  },
  {
    slug: 'square-footage',
    title: 'Square footage',
    tagline: "The interior heated/cooled living area of a home.",
    category: 'real-estate',
    related: ['lot-size', 'price-per-square-foot'],
    body: `**Square footage** (often abbreviated **sqft**) is the interior conditioned living area of a home, heated and cooled space, measured wall-to-wall.

Definitions vary by region. In most markets, finished basements *don't* count toward sqft (they're "below grade"); garages don't count; covered porches don't count. ANSI Z765 is the closest to a national standard but is unevenly adopted.

Tax records, MLS, and appraisers can all report different sqft for the same home, which is fertile ground for buyer-side surprises. A great buyer's agent verifies sqft against tax records, the listing, and the appraisal.`,
  },
  {
    slug: 'zoning',
    title: 'Zoning',
    tagline: 'The local government rule for what can be built and used on a parcel of land.',
    category: 'real-estate',
    related: ['lot-size', 'setback'],
    body: `**Zoning** is the municipal rule for what's allowed on a particular parcel, residential, commercial, mixed-use, agricultural, etc. Most U.S. cities use a hierarchy:

- **R-1**: single-family residential
- **R-2 / R-3**: duplexes, townhouses, multi-family
- **C-1 / C-2**: commercial (retail, office)
- **M / I**: industrial / manufacturing
- **MU**: mixed-use

Zoning controls **density** (how many units per acre), **height** (how tall structures can go), **setbacks** (how far from property lines), and **use** (residential, commercial, both).

For investors, zoning is the difference between a property that can be subdivided or rebuilt as a duplex and one that's permanently single-family. For buyers, zoning of *neighbors* matters too, a residential lot next to commercial zoning faces noise, traffic, and resale-value risk.`,
  },
  {
    slug: 'setback',
    title: 'Setback',
    tagline: 'The minimum distance a structure must be from a property line.',
    category: 'real-estate',
    related: ['zoning', 'lot-size'],
    body: `A **setback** is the minimum distance, set by local [zoning](/glossary/zoning), that a building must be from a property line. Front, rear, and side setbacks each have separate requirements.

Typical residential setbacks are 20–30 ft front, 5–15 ft side, 20+ ft rear, but vary widely by city and zone. Setbacks effectively cap the buildable footprint, the area within the lot where you can place a structure.

For buyers planning additions, ADUs, or pools, setbacks dictate what's actually possible. A "huge backyard" loses some of its appeal once you realize you can't pour a pool 3 feet from the fence.`,
  },
  {
    slug: 'showing',
    title: 'Showing',
    tagline: 'A scheduled, private walkthrough of a listing for a specific buyer.',
    category: 'real-estate',
    related: ['open-house', 'buyers-agent'],
    body: `A **showing** is a private walkthrough of a listing, scheduled in advance for one specific buyer (and usually their [buyer's agent](/glossary/buyers-agent)). Distinct from an [open house](/glossary/open-house): showings are 1:1, by appointment, with a more focused conversation than an open house's rotating crowd.

Showings get booked agent-to-agent (a text or call between offices) or via showing platforms like ShowingTime or Aligned Showings, which most MLSs integrate with. Some buyer-facing tools now let buyers request showings directly from a listing page; the request lands in the listing agent's inbox.

Showing volume is a leading indicator of offer activity. A listing with 8 showings in week one usually has an offer by week two.`,
  },
  {
    slug: 'open-house',
    title: 'Open house',
    tagline: 'A scheduled time when a listing is open for any buyer to walk through, no appointment needed.',
    category: 'real-estate',
    related: ['showing'],
    body: `An **open house** is a scheduled window, typically a 2–4 hour block on a weekend, when a listing is open to the public. The listing agent (or a designee) is on-site; no appointment required.

The function is partly to sell *the* home and largely to capture leads. Most attendees aren't ready to buy that house, but they're shopping in that neighborhood. Smart agents use the open house to fill their pipeline.

**Marketing the open house:**
- Direct-mail postcards to surrounding 200–500 homes
- MLS + portal listings with the open house time stamped
- Reels + Stories the morning of and during
- Sign riders + arrows for drive-by traffic

The lead-capture form (name, email, phone) is the entire point. Close attendees politely; follow up Monday.`,
  },

  /* ─────────────────────── TRANSACTIONS ─────────────────────── */
  {
    slug: 'escrow',
    title: 'Escrow',
    tagline: 'A neutral third party that holds funds and documents until a deal closes.',
    category: 'transactions',
    related: ['earnest-money', 'closing-costs', 'closing-disclosure'],
    body: `**Escrow** is the neutral holding account (and the company that runs it) that sits between buyer and seller during a real estate transaction. The buyer wires funds in, the seller's transfer documents go in, and nothing moves until both sides have completed their obligations under the contract, *then* it all releases simultaneously.

It exists because real estate transactions involve large sums and complex contingencies, and neither party trusts the other to ship first.

In some states (CA, AZ, NV, WA) escrow companies handle the closing. In others (NY, MA, IL) attorneys do the same job and the term "escrow" is used more loosely to mean the whole process.`,
  },
  {
    slug: 'earnest-money',
    title: 'Earnest money',
    tagline: "The deposit a buyer puts up to show they're serious about a contract.",
    category: 'transactions',
    related: ['escrow', 'contingency'],
    body: `**Earnest money** is the deposit a buyer wires into escrow shortly after a purchase contract is signed. It's a credibility signal, *"I'm not just shopping, I'm committing"*, and it gives the seller something to keep if the buyer walks for non-contractual reasons.

Typical amount: **1–3% of the purchase price** in most U.S. markets. Higher in competitive bids, 5%+ in hot 2021–22 markets was routine.

**What happens to it:**
- **Deal closes:** Earnest money applies to the buyer's down payment.
- **Buyer cancels under [contingency](/glossary/contingency)** (financing, inspection, etc.): Earnest money is refunded.
- **Buyer walks for no contractual reason:** Seller keeps it.

A larger earnest deposit is a way for buyers to compete in multiple-offer situations without raising their actual price.`,
  },
  {
    slug: 'closing-costs',
    title: 'Closing costs',
    tagline: 'The fees and taxes both sides pay at the close of a real estate deal.',
    category: 'transactions',
    related: ['escrow', 'closing-disclosure', 'down-payment'],
    body: `**Closing costs** is the umbrella term for everything beyond the property price itself that gets paid at closing. Both sides have closing costs.

**Buyer-side (typically 2–5% of purchase price):**
- Loan origination, appraisal, credit report, lender title insurance
- Escrow fee, recording fee, transfer tax (state-dependent)
- Pre-paid property taxes and homeowner's insurance
- HOA setup fees if applicable

**Seller-side (typically 6–10% of sale price including commission):**
- Real estate commission (post-NAR settlement, listing-side and buyer-side now negotiated separately)
- Owner's title insurance
- Transfer tax (state-dependent, some states put it on the buyer)
- Attorney fees in attorney states

Buyers shopping listings often forget to budget for closing costs. A clear "what your $700k home actually costs at closing" reel is evergreen content.`,
  },
  {
    slug: 'down-payment',
    title: 'Down payment',
    tagline: 'The buyer\'s upfront cash contribution to the purchase price.',
    category: 'transactions',
    related: ['closing-costs', 'pmi', 'ltv'],
    body: `The **down payment** is the cash a buyer puts toward the purchase price, with the rest financed via mortgage. The percentage matters for several reasons.

- **Below 20% down on a conventional loan**: triggers [PMI](/glossary/pmi) (private mortgage insurance), an extra monthly cost.
- **3.5% down**: minimum for an FHA loan.
- **0% down**: possible on VA loans (military) and some USDA loans (rural).
- **20%+ down**: avoids PMI on conventional, and typically gets better interest rates.
- **All-cash**: no financing contingency, faster close, often a stronger offer than a financed buyer at the same price.

Down payment + closing costs are the buyer's at-closing cash needs. A 20% down payment on a $500k house plus 3% closing costs is $115,000 of cash needed at the table.`,
  },
  {
    slug: 'pre-approval',
    title: 'Pre-approval',
    tagline: "A lender's conditional commitment to fund a buyer's mortgage up to a specific amount.",
    category: 'transactions',
    related: ['pre-qualification', 'dti', 'ltv'],
    body: `A **pre-approval** is a written letter from a lender saying "we've reviewed this borrower's income, credit, and assets, and we're prepared to lend up to $X at roughly Y% rate, subject to a final underwriting on the specific property."

It's the credible signal sellers want to see attached to an offer. A pre-approval letter at offer time signals to the seller that the buyer can actually fund the deal, not that they're hoping to.

Don't confuse pre-approval with [pre-qualification](/glossary/pre-qualification), the latter is much weaker (a 5-minute self-reported chat with a loan officer, no documents pulled).

Pre-approvals usually expire in 60–120 days. The lender re-pulls credit and re-verifies income before issuing the actual loan commitment.`,
  },
  {
    slug: 'pre-qualification',
    title: 'Pre-qualification',
    tagline: "A lender's quick estimate of how much a buyer could borrow, based on self-reported info.",
    category: 'transactions',
    related: ['pre-approval'],
    body: `**Pre-qualification** is a casual, often verbal, conversation between a buyer and a lender where the buyer self-reports income, debts, and assets, and the lender gives a ballpark loan amount.

It's much weaker than a [pre-approval](/glossary/pre-approval), no documents, no credit pull, no underwriting review. A pre-qualification letter at offer time is barely above nothing.

Use it to estimate buying power *before* shopping. Convert to a pre-approval before making offers.`,
  },
  {
    slug: 'appraisal',
    title: 'Appraisal',
    tagline: "A licensed appraiser's independent valuation of a property, ordered by the lender.",
    category: 'transactions',
    related: ['cma', 'bpo', 'contingency'],
    body: `An **appraisal** is a formal, written valuation of a property performed by a state-licensed appraiser, ordered by (and paid for by the buyer to) the lender on a financed deal. The lender wants to confirm the home is worth at least the loan amount before funding.

If the appraisal comes in *below* the contract price, you have an **appraisal gap**, the lender will only loan against the appraised value, not the contract price, leaving the buyer to either:
1. Cover the gap with extra cash
2. Renegotiate the price down with the seller
3. Walk under the appraisal contingency
4. Order a second appraisal

In hot markets, buyers sometimes waive the appraisal contingency to be more competitive. That's a serious commitment, a $50,000 appraisal gap on a 3-bedroom is real money out of pocket.`,
  },
  {
    slug: 'home-inspection',
    title: 'Home inspection',
    tagline: 'A licensed inspector\'s top-to-bottom walkthrough of a property\'s condition.',
    category: 'transactions',
    related: ['contingency', 'closing-disclosure'],
    body: `A **home inspection** is a 2–4 hour walkthrough of the property by a licensed inspector, looking at structure, roof, electrical, plumbing, HVAC, appliances, attic, crawlspace, exterior, and produces a detailed written report.

In most markets the inspection happens during the **inspection period** (often 7–14 days after contract). It's the buyer's last clean off-ramp: if the inspection turns up serious issues, the buyer can request repairs, ask for credits, renegotiate, or terminate the contract under the inspection [contingency](/glossary/contingency) and get earnest money back.

Pre-listing inspections (paid by the seller, before going to market) are growing in popularity, they preempt buyer surprises and tend to make for cleaner deals.

In hot markets, "as-is" or waived-inspection offers are tempting but risky. Walk that line carefully.`,
  },
  {
    slug: 'title-insurance',
    title: 'Title insurance',
    tagline: 'A one-time policy that protects against defects in the property\'s ownership history.',
    category: 'transactions',
    related: ['title-search', 'deed', 'lien'],
    body: `**Title insurance** is a one-time premium policy paid at closing that protects against historical defects in the property's [deed](/glossary/deed) and ownership chain, undisclosed [liens](/glossary/lien), forged signatures, missing heirs, easement disputes, etc.

Two policies typically get bought at closing:

1. **Lender's title insurance** (paid by buyer), protects the lender's interest in the property up to the loan amount. Required by every mortgage lender.
2. **Owner's title insurance** (often paid by seller, but state-dependent), protects the buyer's equity in the property indefinitely.

It's surprisingly common to find that a 1947 quitclaim deed wasn't recorded properly, or that a deceased grandparent's name still appears on title. Title insurance is what makes those historical messes someone else's problem.`,
  },
  {
    slug: 'title-search',
    title: 'Title search',
    tagline: "An attorney or title company's review of public records to confirm clear ownership.",
    category: 'transactions',
    related: ['title-insurance', 'deed', 'lien'],
    body: `A **title search** is the public-records review (deeds, court records, tax records, etc.) that confirms the seller actually owns the property and that no [liens](/glossary/lien) or claims encumber it. Performed by a title company or real estate attorney before closing.

The search produces a **title commitment** (or *preliminary title report*) listing exactly what's recorded against the property, mortgages, easements, HOA dues, judgments, mechanics' liens, etc., that need to be cleared before the title can transfer cleanly.

If the search turns up a problem, it's the seller's responsibility to clear it before closing.`,
  },
  {
    slug: 'deed',
    title: 'Deed',
    tagline: 'The legal document that transfers ownership of a property from one party to another.',
    category: 'transactions',
    related: ['title-search', 'title-insurance'],
    body: `A **deed** is the formal legal document that transfers ownership of real property. The seller signs it; once recorded with the county, the buyer is the official owner.

**Common deed types:**
- **Warranty deed**, the seller guarantees clear title; buyer can sue if defects emerge later. Most common in residential sales.
- **Quitclaim deed**, the seller transfers whatever interest they have, with no guarantees. Common between family members or in divorces.
- **Special warranty deed**, covers only defects that arose during the seller's ownership, not before.
- **Trustee's deed**, used in foreclosure sales, conveys the property from the lender to the high bidder.

The deed is what gets recorded. The contract is what got the parties to closing.`,
  },
  {
    slug: 'lien',
    title: 'Lien',
    tagline: 'A legal claim against a property that secures a debt.',
    category: 'transactions',
    related: ['title-search', 'foreclosure'],
    body: `A **lien** is a legal claim someone has against a property to secure repayment of a debt. The lien doesn't transfer ownership, it just gives the lien holder the right to be paid out of any sale of the property.

Common liens:
- **Mortgage lien**, held by the lender for the loan
- **Property tax lien**, held by the county for unpaid property taxes
- **Mechanics' lien**, held by a contractor who wasn't paid for work done on the property
- **HOA lien**, held by the homeowners association for unpaid dues
- **Judgment lien**, court-ordered, when someone wins a lawsuit against the owner

Most liens have to be paid off (or otherwise resolved) at closing for the title to transfer cleanly. The [title search](/glossary/title-search) surfaces them; the closing settles them.`,
  },
  {
    slug: 'closing-disclosure',
    title: 'Closing Disclosure',
    tagline: 'The federally-mandated 5-page document showing the buyer\'s exact final loan terms and closing costs.',
    category: 'transactions',
    related: ['closing-costs', 'down-payment'],
    body: `The **Closing Disclosure** (often abbreviated **CD**) is the federally-mandated form that the lender provides to the buyer **at least 3 business days before closing** on every residential mortgage. It shows:

- The exact loan amount, interest rate, monthly payment
- All closing costs (line by line)
- The cash needed at closing
- Comparison to the original Loan Estimate

The 3-day rule (from the TRID regulation) means buyers have time to actually read it before signing. If anything material changes after the CD is issued, a new 3-day waiting period starts, which is why lenders try to lock the CD as early as possible.

This replaced the old HUD-1 form in 2015. It's the doc you sign and walk away with at the closing table.`,
  },
  {
    slug: 'contingency',
    title: 'Contingency',
    tagline: 'A condition in a purchase contract that must be met for the deal to proceed.',
    category: 'transactions',
    related: ['earnest-money', 'home-inspection', 'appraisal'],
    body: `A **contingency** is a condition written into a purchase contract that must be satisfied for the buyer (or seller) to be obligated to close. If the condition isn't met, that party can typically walk and get earnest money back.

**Common buyer contingencies:**
- **Financing**, buyer must secure a loan within X days
- **Inspection**, buyer can back out after the [home inspection](/glossary/home-inspection)
- **Appraisal**, property must appraise at or above contract price
- **Sale of current home**, buyer must sell their existing home first
- **Title**, title search must come back clean

In hot markets, buyers waive contingencies to make their offer more competitive. Each waived contingency is a removed off-ramp, and a real risk. A waived appraisal contingency on a $1M home means the buyer is on the hook for any appraisal gap, no matter how big.`,
  },
  {
    slug: 'multiple-offer',
    title: 'Multiple offer',
    tagline: 'When a single listing receives more than one offer at the same time.',
    category: 'transactions',
    related: ['bidding-war', 'counter-offer', 'backup-offer'],
    body: `A **multiple offer** situation is exactly what it sounds like, two or more buyers submit offers on the same listing, often within hours or days of each other. It's how listings sell above asking in hot markets.

The listing agent's job in a multiple offer is to:
1. Notify all interested parties that multiples have been received
2. Set a deadline for highest-and-best
3. Present all offers to the seller for a decision

Sellers can accept the strongest offer, counter one of them, counter several, or do nothing. Some sellers run "highest and best" rounds, asking each buyer for their final offer, a polite [bidding war](/glossary/bidding-war).

Buyers winning multiples typically don't win on price alone. Larger earnest deposits, fewer contingencies, faster close, and seller-friendly terms (like rent-back to seller post-close) all matter.`,
  },
  {
    slug: 'bidding-war',
    title: 'Bidding war',
    tagline: 'A multiple-offer situation where buyers progressively raise their offers to win the home.',
    category: 'transactions',
    related: ['multiple-offer', 'counter-offer'],
    body: `A **bidding war** is the active, escalating phase of a [multiple offer](/glossary/multiple-offer) situation, when buyers know they're competing and progressively raise their offers (or improve terms) to outbid each other.

In a hot market, a desirable listing can attract 10+ offers in 72 hours, ending 10–20% above asking. The seller's agent runs the process; buyers' agents have to advise their clients on how aggressive to get.

**Tactics that win bidding wars (besides higher price):**
- Larger earnest money deposit
- Waived contingencies (with eyes wide open)
- Cash offer or huge down payment
- Quick close (15-21 days)
- Escalation clause (auto-bid up to a cap, beating the highest other offer by $X)
- Personal letter to the seller (controversial, increasingly seen as a Fair Housing risk)

The buyers who walk away from a bidding war they shouldn't have won are the ones who adjusted their offer based on emotion, not their actual budget.`,
  },
  {
    slug: 'counter-offer',
    title: 'Counter offer',
    tagline: 'A response to an offer that proposes different terms.',
    category: 'transactions',
    related: ['multiple-offer'],
    body: `A **counter offer** is when one party (usually the seller) responds to the other party's offer with modified terms, different price, different close date, different contingencies, etc. The original offer is terminated; the counter is now the active proposal.

Counters can go back and forth multiple times. Each counter terminates the prior one. Either party can walk at any time before signing.

A common pattern in normal markets: buyer offers below ask → seller counters near ask → buyer counters slightly higher → both meet in the middle.

In hot markets, sellers often skip the counter and just say "we'll review all offers Sunday", running a [multiple offer](/glossary/multiple-offer) process instead.`,
  },
  {
    slug: 'backup-offer',
    title: 'Backup offer',
    tagline: 'A second-place offer that activates if the primary contract falls through.',
    category: 'transactions',
    related: ['multiple-offer', 'pending'],
    body: `A **backup offer** is an offer accepted by the seller that takes second-place position, ready to activate immediately if the primary contract falls through (financing fails, inspection kills the deal, buyer walks).

For the backup buyer, it's free optionality, they're committed only if the primary deal collapses, and they hold their preferred place in line.

For the seller, a backup offer is a safety net, they don't have to relist and start over if the primary deal dies. The listing typically goes to "Pending, Taking Backups" or similar status on the MLS.

Backup offers are most common in fast markets where listings get stale quickly if relisted. They're rare in slow markets.`,
  },
  {
    slug: 'pending',
    title: 'Pending',
    tagline: 'A listing status meaning a contract is signed and the deal is moving toward closing.',
    category: 'transactions',
    related: ['under-contract', 'contingency', 'days-on-market'],
    body: `**Pending** is the MLS listing status that means a purchase contract is signed and the deal is in the closing pipeline. The listing is no longer actively marketed; showings stop; [days on market](/glossary/days-on-market) stops accruing.

Pending status doesn't mean the deal is *done*. Roughly 5–15% of pending sales fall through (financing failures, inspection issues, buyer's-side complications). When that happens, the listing typically returns to "Active" or moves to "Active w/ Contingency" while the seller takes [backup offers](/glossary/backup-offer).

Some markets distinguish:
- **Pending**, under contract, contingencies waived or expired
- **Pending, Taking Backups**, under contract but seller still accepting backups
- **Active Under Contract**, under contract but contingencies still active`,
  },
  {
    slug: 'under-contract',
    title: 'Under contract',
    tagline: 'When a buyer and seller have signed a purchase agreement but haven\'t closed yet.',
    category: 'transactions',
    related: ['pending', 'contingency'],
    body: `**Under contract** is the umbrella term for the time between when a purchase agreement is signed and when the deal closes. It includes both the contingency period (inspection, appraisal, financing) and the post-contingency period when everyone is just waiting for closing.

Some MLSs split this into "Active Under Contract" (contingencies still in play) and "[Pending](/glossary/pending)" (contingencies cleared, just waiting for closing). Others lump it all under "Pending."

Either way, the listing is no longer actively marketed, but the deal isn't done until the deed is recorded.`,
  },

  /* ─────────────────────── FINANCING ─────────────────────── */
  {
    slug: 'mortgage',
    title: 'Mortgage',
    tagline: 'A loan secured by real property.',
    category: 'financing',
    related: ['fixed-rate', 'arm', 'pmi', 'dti'],
    body: `A **mortgage** is a loan where the borrower pledges real property as collateral. If the borrower defaults, the lender can [foreclose](/glossary/foreclosure) and sell the property to recover the loan.

Most U.S. residential mortgages are 15- or 30-year amortizing loans, with monthly payments covering principal, interest, taxes, and insurance (PITI). Two main flavors:

- **[Fixed-rate](/glossary/fixed-rate)**, interest rate locked for the life of the loan
- **[Adjustable-rate (ARM)](/glossary/arm)**, interest rate floats, typically after a fixed initial period

Loan types beyond conforming conventional include [FHA](/glossary/fha-loan), [VA](/glossary/va-loan), USDA, and jumbo (over the conforming loan limit).

A "mortgage broker" shops your loan across multiple lenders. A "loan officer" works for one lender.`,
  },
  {
    slug: 'fixed-rate',
    title: 'Fixed-rate mortgage',
    tagline: 'A mortgage where the interest rate stays the same for the entire loan term.',
    category: 'financing',
    related: ['mortgage', 'arm'],
    body: `A **fixed-rate mortgage** has the same interest rate from day one to the final payment, typically 15 or 30 years. Monthly principal-and-interest payment never changes (though taxes and insurance can).

Pros: predictability. You know your housing payment for decades.
Cons: typically a slightly higher initial rate than an ARM.

By far the dominant mortgage type in the U.S., over 90% of new originations in any given year. Other markets (UK, Canada, Australia) lean far more on adjustable products.`,
  },
  {
    slug: 'arm',
    title: 'ARM',
    tagline: 'Adjustable-Rate Mortgage, the rate floats based on a benchmark.',
    category: 'financing',
    related: ['mortgage', 'fixed-rate'],
    body: `**ARM** stands for **Adjustable-Rate Mortgage**. The interest rate is fixed for an initial period (commonly 5, 7, or 10 years) and then resets periodically based on a benchmark (SOFR, formerly LIBOR) plus a margin set by the lender.

Notation: a **5/1 ARM** is 5 years fixed, then resets every 1 year. A **7/6 ARM** is 7 years fixed, then resets every 6 months.

Pros: lower initial rate than a fixed-rate loan, attractive when buyers plan to sell or refinance before the reset.
Cons: real risk if rates rise during the reset period. ARMs played a starring role in the 2008 crisis when teaser rates expired into much higher payments borrowers couldn't afford.

In high-rate environments, ARMs come back into fashion. In low-rate environments, fixed dominates.`,
  },
  {
    slug: 'fha-loan',
    title: 'FHA loan',
    tagline: 'A mortgage insured by the Federal Housing Administration, designed for lower down payments.',
    category: 'financing',
    related: ['mortgage', 'down-payment', 'pmi'],
    body: `An **FHA loan** is a mortgage insured by the Federal Housing Administration, originated by private lenders but backed by the federal government. The big draw: lower down payment requirements (as low as 3.5%) and more flexible credit standards than conventional loans.

The trade-off is FHA mortgage insurance, both an upfront premium (1.75% of loan amount) and an annual premium (typically 0.55% of loan balance, paid monthly). Unlike PMI on conventional loans, FHA mortgage insurance often stays for the life of the loan.

FHA loans have property condition requirements (the appraisal includes a cursory health/safety check) that can be a sticking point on older or distressed properties. They cap loan amounts at the local FHA limit, which varies by county.

Popular with first-time buyers and lower-income buyers. Less popular with sellers in competitive markets, who may favor conventional offers as cleaner.`,
  },
  {
    slug: 'va-loan',
    title: 'VA loan',
    tagline: 'A mortgage backed by the Department of Veterans Affairs, available to military members and veterans.',
    category: 'financing',
    related: ['mortgage', 'down-payment'],
    body: `A **VA loan** is a mortgage backed by the U.S. Department of Veterans Affairs, available to active-duty military, veterans, reservists, and certain surviving spouses. Originated by private lenders, guaranteed by the VA.

The standout feature: **0% down payment**, with no [PMI](/glossary/pmi). Plus competitive interest rates, no minimum credit score (lenders set their own), and a one-time funding fee that can be rolled into the loan.

VA loans have property condition requirements (the VA appraisal is stricter than a conventional one) and limits on what closing costs the buyer can pay, sometimes seller concessions or lender credits cover the gap.

Sellers in hot markets sometimes (incorrectly) view VA offers as weaker. They're not, VA loans close at similar rates to conventional. Buyer's-agent education matters here.`,
  },
  {
    slug: 'jumbo-loan',
    title: 'Jumbo loan',
    tagline: 'A mortgage larger than the conforming loan limit set by Fannie Mae and Freddie Mac.',
    category: 'financing',
    related: ['mortgage'],
    body: `A **jumbo loan** is any residential mortgage that exceeds the conforming loan limit set annually by the Federal Housing Finance Agency (FHFA). For 2025, the limit is **$806,500** in most counties and up to **$1,209,750** in high-cost areas.

Because jumbos can't be sold to Fannie Mae or Freddie Mac, lenders hold them on balance sheet (or sell them to private investors). That means stricter underwriting:

- Higher credit score requirements (often 700+)
- Larger reserves (6–12 months of payments in cash)
- Lower allowed [DTI](/glossary/dti) ratios
- Larger down payments (often 20%+, sometimes 30%+)
- Tougher appraisal scrutiny

Jumbo rates are sometimes higher and sometimes *lower* than conforming, depending on bank balance-sheet appetite and how much business they're trying to win from high-net-worth borrowers.`,
  },
  {
    slug: 'pmi',
    title: 'PMI',
    tagline: 'Private Mortgage Insurance, required when a buyer puts less than 20% down on a conventional loan.',
    category: 'financing',
    related: ['mortgage', 'down-payment', 'ltv'],
    body: `**PMI** (Private Mortgage Insurance) is an insurance premium that conventional lenders require when a buyer's [down payment](/glossary/down-payment) is less than 20% (i.e., [LTV](/glossary/ltv) above 80%). It protects the lender, not the borrower, in case of default.

PMI is paid monthly, typically 0.3%–1.5% of the loan amount per year. On a $400k loan at 1%, that's $4,000/year, or $333/month. Real money.

The good news: PMI can be removed once the LTV drops to 80%, either by paying down principal or because the property has appreciated. Borrowers can request removal; lenders are required to auto-cancel at 78% LTV under the Homeowners Protection Act.

FHA loans have a separate insurance (MIP) that's harder to remove and usually stays for the life of the loan.`,
  },
  {
    slug: 'dti',
    title: 'DTI',
    tagline: 'Debt-to-Income ratio, total monthly debt payments divided by gross monthly income.',
    category: 'financing',
    related: ['ltv', 'pre-approval', 'mortgage'],
    body: `**DTI** stands for **Debt-to-Income ratio**, the percentage of a borrower's gross monthly income that goes toward total monthly debt payments. Lenders use it to gauge ability to repay.

Two flavors:
- **Front-end DTI**, just housing costs (PITI) divided by gross income. Lenders want under 28%.
- **Back-end DTI**, all debt (PITI + car loans, student loans, credit-card minimums, child support, etc.) divided by gross income. Lenders want under 43%, sometimes 50% on FHA/VA.

A buyer with $10,000/mo gross income and $4,000/mo total debt obligations has a 40% back-end DTI.

Lowering DTI before applying for a mortgage, paying off cards, holding off on a car loan, is the single biggest move buyers can make to improve their borrowing power.`,
  },
  {
    slug: 'ltv',
    title: 'LTV',
    tagline: 'Loan-to-Value ratio, the loan amount divided by the property value.',
    category: 'financing',
    related: ['dti', 'pmi', 'down-payment'],
    body: `**LTV** stands for **Loan-to-Value ratio**, the loan amount divided by the property's appraised value (or purchase price, whichever is lower). Lenders use it as a measure of risk: higher LTV = more skin from the lender, less from the borrower = more default risk.

A buyer putting 20% down has 80% LTV. 10% down = 90% LTV. 0% down (VA, USDA) = 100% LTV.

LTV drives a lot:
- Above 80% on conventional → [PMI](/glossary/pmi) required
- Above 95% → only certain loan products available
- Above 100% (rare) → only government-backed programs (VA, USDA)

LTV at the time of refinance also matters, falling property values can push LTV up, even if the borrower hasn't borrowed more, which can disqualify them from removing PMI or refinancing at favorable terms.`,
  },

  /* ─────────────────────── PROPERTY TYPES ─────────────────────── */
  {
    slug: 'condo',
    title: 'Condo',
    tagline: 'A residential unit in a building where the unit is individually owned and common areas are shared.',
    category: 'property',
    related: ['co-op', 'townhouse', 'hoa'],
    body: `A **condo** (condominium) is a residential unit where the buyer owns their individual unit (the airspace and interior walls) and shares ownership of the common areas, hallways, lobby, roof, amenities, with all other unit owners through an HOA.

Each condo unit has its own deed, can be financed individually, and can be sold independently of the rest of the building.

**Pros:** Often cheaper than single-family on a per-sqft basis, lower maintenance burden, amenities (pool, gym, doorman), urban locations.
**Cons:** HOA fees, special assessments, restrictive HOA rules (rentals, pets, renovations), potential financing issues if the building isn't FNMA-approved.

Don't confuse a condo with a [co-op](/glossary/co-op), co-op buyers own shares in a corporation that owns the building, not their unit directly. Co-ops have very different financing and approval mechanics.`,
  },
  {
    slug: 'co-op',
    title: 'Co-op',
    tagline: 'A residential unit where the buyer owns shares in a corporation that owns the building.',
    category: 'property',
    related: ['condo', 'townhouse'],
    body: `A **co-op** (cooperative) is a building owned by a corporation. Buying into a co-op means buying shares in the corporation, plus a proprietary lease for a specific unit. You don't get a deed.

Co-ops are concentrated in NYC (where they outnumber condos), with smaller pockets in Chicago, DC, and a few other cities.

**Pros:** Often significantly cheaper than condos in the same building. Strong financial scrutiny by the board means the building is usually well-run. Stable, long-term owner-resident communities.

**Cons:** Co-op boards approve buyers (and can reject them). Renting is often restricted or prohibited. Financing is harder, fewer lenders work with co-ops, and underwriting examines the *building's* financials too. Closing costs higher (no title insurance, but a "flip tax" and other fees).

Co-ops are an acquired taste. NYC veterans love them; everyone else finds them strange.`,
  },
  {
    slug: 'townhouse',
    title: 'Townhouse',
    tagline: 'A multi-floor home that shares walls with adjacent units, typically with a small yard.',
    category: 'property',
    related: ['condo', 'single-family', 'hoa'],
    body: `A **townhouse** is a multi-floor residential unit that shares one or more walls with adjacent units in a row. The buyer owns the structure (walls and roof) and the small lot (often a backyard or patio), distinct from a [condo](/glossary/condo) where common areas are shared.

Townhouses can be in HOAs (with shared exteriors and amenities) or fee-simple (you own everything, no HOA). The difference matters at closing for understanding your future obligations.

**Pros:** More space than a comparable condo, typically with a yard. Lower-maintenance than a single-family home (smaller lot). Often less expensive than a detached home in the same area.
**Cons:** Shared walls (noise). Limited yard. Sometimes HOA-bound.`,
  },
  {
    slug: 'single-family',
    title: 'Single-family home',
    tagline: 'A detached residential structure on its own lot, with no shared walls.',
    category: 'property',
    related: ['multi-family', 'townhouse', 'lot-size'],
    body: `A **single-family home** (sometimes **SFR** for "single-family residence") is a detached residential structure on its own [lot](/glossary/lot-size), built for one household, with no shared walls.

The default residential property type in most U.S. suburbs and rural areas. Comes with the most flexibility (no HOA in many cases, no shared walls), the most maintenance burden, and typically the highest price per home in the area.

Investors track SFR rentals as a category, it's the largest single segment of the U.S. residential rental market, much of it owned by individual landlords rather than institutional buyers.`,
  },
  {
    slug: 'multi-family',
    title: 'Multi-family',
    tagline: 'A residential property with two or more separate units in the same structure.',
    category: 'property',
    related: ['single-family', 'cap-rate'],
    body: `**Multi-family** real estate is any property with two or more separate residential units in the same structure. Categories:

- **Duplex**, 2 units
- **Triplex**, 3 units
- **Fourplex**, 4 units
- **Small multi-family**, 2-4 units (still residential financing, owner-occupant or investor)
- **Large multi-family**, 5+ units (commercial financing, investor only)

The 2-4 unit category is a unique sweet spot: a buyer can owner-occupy one unit and rent out the others, qualify for residential mortgage rates ([FHA](/glossary/fha-loan) or conventional), and have rental income offset their housing cost. House-hacking. Popular with first-time investors.

5+ unit properties price on [cap rate](/glossary/cap-rate), not comps. Different market entirely.`,
  },
  {
    slug: 'new-construction',
    title: 'New construction',
    tagline: 'A home that\'s being built or has just been completed, never previously occupied.',
    category: 'property',
    related: ['spec-home', 'custom-home'],
    body: `**New construction** is a home that hasn't been previously occupied, anything from "just completed and on the market" to "we'll build it for you over the next 14 months."

**Subtypes:**
- **[Spec home](/glossary/spec-home)**, built speculatively by a builder, then listed for sale. Buyer chooses from completed inventory.
- **[Custom home](/glossary/custom-home)**, built to the buyer's specifications on the buyer's lot.
- **Tract home**, built in a planned community to one of a few standard floor plans.

Buying new construction is its own process, the builder usually has their own contract (heavily favoring the builder), preferred lender, and design center for upgrades. Builders prefer offers from buyers using the builder's lender and rarely budge on base price (instead offering closing-cost credits or upgrade allowances).

Inspections still matter on new construction. New homes have new-home defects.`,
  },
  {
    slug: 'spec-home',
    title: 'Spec home',
    tagline: 'A new home built by a developer on speculation, listed for sale once complete.',
    category: 'property',
    related: ['new-construction', 'custom-home'],
    body: `A **spec home** is a new home built by a developer "on speculation", without a specific buyer lined up, and then listed for sale once complete. The developer takes on the carrying cost during construction in exchange for the chance to sell at a market-set price.

Spec homes are common in suburban tract developments, where the developer builds 5–10 spec homes on adjacent lots and rotates them through the sales process. Buyers see a finished product, can move in immediately, and don't have to make hundreds of design decisions.

Trade-off: less customization than a [custom home](/glossary/custom-home).`,
  },
  {
    slug: 'custom-home',
    title: 'Custom home',
    tagline: 'A new home built to the buyer\'s specifications, typically on the buyer\'s lot.',
    category: 'property',
    related: ['new-construction', 'spec-home'],
    body: `A **custom home** is built to the buyer's specifications, floor plan, finishes, lot, typically with a custom builder hired directly by the buyer. The buyer (and their architect) drive design decisions; the builder executes.

The build process can take 12–24 months for a typical custom home. Cost overruns are common. The buyer needs a construction loan (different mechanics from a traditional mortgage) that converts to permanent financing once the home is built.

Custom homes deliver maximum control and customization, but require maximum patience and budget tolerance.`,
  },
  {
    slug: 'fsbo',
    title: 'FSBO',
    tagline: 'For Sale By Owner, a property the seller is marketing without an agent.',
    category: 'property',
    related: ['mls', 'listing-agent'],
    body: `**FSBO** (pronounced *"fizz-bo"*) stands for **For Sale By Owner**. The owner markets and sells the property without engaging a [listing agent](/glossary/listing-agent), trying to save the seller-side commission.

In practice, FSBOs:
- Get less exposure than MLS listings (most don't make it into the MLS or onto the major portals)
- Take longer to sell
- Sell for less, on average, than agent-listed homes (NAR data; biased source, but still)
- Frequently end up paying a buyer's agent commission anyway

For-sale-by-owner can work well in hot, low-inventory markets where the property sells itself, or for off-market deals between people who already know each other (family transfers, for instance). It rarely beats a competent listing agent in normal conditions.

Some FSBO sellers will pay a buyer's agent commission if a buyer's agent brings a buyer; others won't. Always confirm before showing a FSBO to your clients.`,
  },
  {
    slug: 'foreclosure',
    title: 'Foreclosure',
    tagline: 'The legal process by which a lender takes ownership of a property when the borrower defaults.',
    category: 'property',
    related: ['short-sale', 'reo', 'lien'],
    body: `**Foreclosure** is the legal process where a lender takes ownership of a property because the borrower has defaulted on the [mortgage](/glossary/mortgage). It's the lender exercising the [lien](/glossary/lien) created when the loan was originated.

Two main types:
- **Judicial foreclosure**, court-supervised, slower, used in ~22 states (NY, FL, NJ among them). Can take 12–24+ months.
- **Non-judicial foreclosure**, out-of-court, faster, used in the rest. Can take 3–6 months once started.

The process ends with a public foreclosure sale (auction). If no one bids enough to cover the loan, the property becomes [REO](/glossary/reo), owned by the bank.

Buyers can buy at three stages:
1. **Pre-foreclosure** (working with the homeowner, often via [short sale](/glossary/short-sale))
2. **Auction** (cash, fast, no inspection, high risk, sometimes high reward)
3. **REO** (after the bank takes possession, most "normal" of the three)

Foreclosure inventory fluctuates with the macro cycle. 2010–12 was the historic spike; recent years have been near multi-decade lows.`,
  },
  {
    slug: 'short-sale',
    title: 'Short sale',
    tagline: 'A sale where the seller is in default and the lender agrees to accept less than the loan balance.',
    category: 'property',
    related: ['foreclosure', 'reo'],
    body: `A **short sale** is when a homeowner in default sells the property for less than they owe on the [mortgage](/glossary/mortgage), with the lender's approval. The lender accepts the loss as a workaround to avoid the cost and time of full [foreclosure](/glossary/foreclosure).

Short sales are slow. The buyer signs a contract with the seller, but then the lender has to approve the sale, the price, the terms, and any forgiveness of the deficiency balance. 60–120 days from contract to close is typical; six months isn't unusual. Many short sales fall through entirely.

For buyers, short sales can offer below-market prices on properties that would otherwise be off-limits. The trade-off is patience, uncertainty, and accepting properties as-is (lenders rarely allow repairs).`,
  },
  {
    slug: 'reo',
    title: 'REO',
    tagline: 'Real Estate Owned, a property the bank took back through foreclosure and is now selling.',
    category: 'property',
    related: ['foreclosure', 'short-sale', 'bpo'],
    body: `**REO** (Real Estate Owned) is a property a bank took back through [foreclosure](/glossary/foreclosure), typically because no one outbid the loan balance at the foreclosure auction. The bank now owns the asset and wants to sell it.

REO properties are listed on the MLS by an agent under contract with the bank's asset management group. Pricing is typically driven by a [BPO](/glossary/bpo) and reflects the bank's desire to clear the asset off its books.

For buyers, REO is the most "normal" way to buy distressed inventory:
- Standard MLS listing
- Standard inspection contingency (usually allowed)
- Standard closing process
- Bank seller, no emotion, no lowballing offended

The downside: properties are sold as-is, often vacant, sometimes in poor condition (winterized, deferred maintenance). Banks rarely make repairs but occasionally offer credits.`,
  },
  {
    slug: 'hoa',
    title: 'HOA',
    tagline: 'Homeowners Association, the entity that governs and maintains common areas in a community.',
    category: 'property',
    related: ['condo', 'townhouse'],
    body: `A **Homeowners Association** is a private entity that governs a community of homeowners. It owns and maintains common areas (streets, pool, gym, lobby, roof in a condo), collects monthly or quarterly dues from owners, and enforces rules (CC&Rs, Covenants, Conditions, and Restrictions).

Common HOA settings:
- **Single-family subdivision HOA**, light, often optional, primarily for shared amenities (pool, clubhouse, security gate)
- **Condo HOA**, heavy, mandatory, runs the building; dues are substantial
- **Townhouse HOA**, moderate, runs shared exteriors and roads

Buyers should review CC&Rs, financial statements, and meeting minutes before closing. Look for **special assessments** (one-time charges for major projects), large reserves (good sign), upcoming litigation (very bad sign), and rental restrictions (matters if you ever rent out the unit).

In condos, the HOA's financial health affects mortgage availability, Fannie Mae and Freddie Mac maintain "warrantable" lists; non-warrantable buildings are harder to finance.`,
  },
  {
    slug: 'flood-zone',
    title: 'Flood zone',
    tagline: 'A FEMA-designated area at risk of flooding, often requiring flood insurance.',
    category: 'property',
    related: [],
    body: `A **flood zone** is a FEMA-mapped area indicating flood risk based on historical data and topography. The big designations:

- **Zone X**, minimal risk, no insurance required
- **Zone B / C**, moderate risk
- **Zone A / AE**, high risk (1-in-100-year flood zone), flood insurance required for federally-backed mortgages
- **Zone V / VE**, high-risk coastal, with wave action, most expensive insurance

Flood insurance is sold via the **National Flood Insurance Program (NFIP)** or private insurers. Premiums vary wildly by elevation, structure type, and zone, from a few hundred dollars per year in low-risk areas to $10,000+ in high-risk coastal zones.

For Florida, Carolina coasts, Houston, and other flood-prone regions, the flood-zone determination is one of the most important due-diligence items in any deal. FEMA maps update periodically; new maps can dramatically change a property's insurance requirements.`,
  },
  {
    slug: 'coming-soon',
    title: 'Coming soon',
    tagline: 'A pre-listing status indicating a property will hit the market shortly.',
    category: 'property',
    related: ['pocket-listing', 'mls'],
    body: `**Coming soon** is a pre-listing status, the property isn't on the MLS *yet* but the agent is signaling that it will be soon (typically within 7–21 days). Buyers can express interest but typically can't tour the property during this window.

The function is to **build buyer-side anticipation** before the listing goes live, so the first few days on the MLS see strong showing volume and offer activity. Used heavily in fast markets to manufacture multiple-offer situations.

Coming-soon listings can be marketed via:
- MLS "Coming Soon" status (most MLSs allow this)
- Agent's social channels
- Direct emails to interested buyers from past relationships

Be careful: most MLSs have rules about how long a property can sit in coming-soon before either going active or being delisted. The Clear Cooperation Policy applies.`,
  },

  /* ─────────────────────── INVESTING ─────────────────────── */
  {
    slug: 'cap-rate',
    title: 'Cap rate',
    tagline: 'Capitalization rate, annual net operating income divided by property value.',
    category: 'investing',
    related: ['arv', 'multi-family'],
    body: `**Cap rate** (capitalization rate) is the most fundamental yardstick for valuing income-producing real estate. The math:

\`\`\`
Cap rate = Annual Net Operating Income (NOI) / Property Value
\`\`\`

A property generating $60,000 of NOI per year, valued at $1,000,000, has a 6% cap rate. NOI is gross rental income minus operating expenses (taxes, insurance, repairs, vacancy, management) but **before** debt service.

**How investors read cap rates:**
- Higher cap rate = higher yield = typically higher risk or worse location
- Lower cap rate = lower yield = typically lower risk or premier location

A Manhattan office building might trade at a 4% cap. A class-C apartment building in Cleveland might trade at 8%. The market sets cap rates based on perceived risk and growth.

Cap rate matters for [multi-family](/glossary/multi-family) of 5+ units, this is how those properties are valued. Smaller multi-family (2–4 units) prices more on comps than cap rate.`,
  },
  {
    slug: 'arv',
    title: 'ARV',
    tagline: 'After Repair Value, what a property will be worth once renovations are complete.',
    category: 'investing',
    related: ['cma', 'cap-rate'],
    body: `**ARV** stands for **After Repair Value**, the projected market value of a property once planned renovations are complete. It's the central number in flip and BRRRR-strategy investing.

The classic flipper formula:
\`\`\`
Maximum Purchase Price = (ARV × 70%) − Repair Costs
\`\`\`

The 70% accounts for transaction costs (10%) and the investor's profit margin (20%). On a property with an ARV of $400k and $50k in needed repairs:
\`\`\`
Max Purchase = ($400k × 0.70) − $50k = $230k
\`\`\`

ARV is part art, part science. It comes from:
- Recent sales of fully-renovated, comparable properties in the immediate area ([CMA](/glossary/cma) discipline)
- Conservative assumptions about market direction
- Honest assessment of the renovation scope

Newer flippers chronically overestimate ARV and underestimate repairs. Those two errors are why most first-time flips break even at best.`,
  },
  {
    slug: '1031-exchange',
    title: '1031 exchange',
    tagline: 'A tax-deferred swap of one investment property for another, named after IRS Section 1031.',
    category: 'investing',
    related: ['capital-gains'],
    body: `A **1031 exchange** (after IRS Section 1031) lets an investor sell one investment property and reinvest the proceeds into a "like-kind" property without paying [capital gains](/glossary/capital-gains) tax on the sale. The tax is deferred until the replacement property is eventually sold without another 1031.

Critical rules:
- **Like-kind** is broad, any U.S. real estate held for investment qualifies for any other (a duplex for a parking lot, a warehouse for an apartment building)
- **Personal residence does NOT qualify**, investment property only
- **45 days** to identify the replacement property after closing on the relinquished one
- **180 days** total to close on the replacement
- **Qualified Intermediary** required, the seller never touches the cash; it goes from sale to QI to purchase

Used aggressively, an investor can defer capital gains across decades, sell, exchange, sell, exchange, and at death, heirs get a stepped-up basis, wiping out the deferred tax. Hence the saying: *"swap till you drop."*`,
  },
  {
    slug: 'capital-gains',
    title: 'Capital gains',
    tagline: 'The tax owed on the profit from selling an asset, including real estate.',
    category: 'investing',
    related: ['1031-exchange'],
    body: `**Capital gains** is the profit from selling an asset for more than you paid for it. On real estate, capital gains tax kicks in on the sale of a property where the sale price exceeds your "basis" (purchase price plus capital improvements).

Two flavors:
- **Short-term capital gains**, held less than 1 year, taxed as ordinary income (up to 37% federal)
- **Long-term capital gains**, held over 1 year, taxed at preferential rates (0%, 15%, or 20% federal depending on income)

The big residential exemption: the **Section 121 exclusion** lets primary-residence sellers exclude up to **$250k of gain (single)** or **$500k (married filing jointly)** if they've owned and lived in the home as their primary residence for at least 2 of the last 5 years.

For investment properties, the [1031 exchange](/glossary/1031-exchange) is the main tool for deferring capital gains.

State capital gains rules vary widely. Florida, Texas, and a few others have no state income tax, making them favored markets for high-gain residential sellers.`,
  },
  {
    slug: 'cash-buyer',
    title: 'Cash buyer',
    tagline: 'A buyer purchasing a property without a mortgage, paying entirely in cash.',
    category: 'investing',
    related: ['multiple-offer', 'contingency'],
    body: `A **cash buyer** is a buyer purchasing a property without financing, paying the full price out of cash on hand (or liquidated investments). No mortgage means no [appraisal](/glossary/appraisal) requirement, no financing [contingency](/glossary/contingency), and a faster close (often 7–14 days vs. 30–45 for financed deals).

Cash offers are typically stronger than financed offers at the same price, because the seller's deal certainty is much higher. The buyer can't be torpedoed by an appraisal gap or a last-minute underwriting issue.

In hot markets, sellers often accept cash offers at slightly lower prices than financed offers, the certainty premium is real.

"Cash" doesn't always mean *literal* cash. Buyers will provide proof of funds (POF), a recent bank or brokerage statement showing the available balance.

Some "cash" buyers are flippers or institutional buyers (Opendoor, Offerpad) using credit lines that look like cash to the seller.`,
  },

  /* ─────────────────────── MARKETING ─────────────────────── */
  {
    slug: 'link-in-bio',
    title: 'Link in bio',
    tagline: 'The single clickable URL allowed in an Instagram or TikTok profile bio.',
    category: 'marketing',
    related: ['cta', 'funnel', 'conversion'],
    body: `**Link in bio** refers to the single URL that platforms like Instagram and TikTok let you put in your profile bio. Posts and reels themselves don't allow direct links, every CTA in your content has to point users back to that one bio link.

Because of that constraint, most creators don't link to a single page. They link to a *landing page* that fans out to multiple destinations: their newest reel, their email signup, their store, their booking link, etc.

Tools like Linktree, Stan, Beacons, and Reelst all serve this need. The right tool depends on what you're funneling traffic toward, a podcast, a Shopify store, a real estate practice. Generic link-in-bio tools work for most creators; vertical-specific ones (like Reelst for real estate) work better when the audience expects a category-specific UX (a map for real estate; a player for music).`,
  },
  {
    slug: 'cta',
    title: 'CTA',
    tagline: 'Call to Action, the explicit ask at the end of a marketing message.',
    category: 'marketing',
    related: ['link-in-bio', 'lead-magnet', 'conversion'],
    body: `**CTA** stands for **Call to Action**, the part of a marketing message that tells the audience exactly what to do next. *"Tap the link in bio."* *"DM me 'house' for the address."* *"Save this reel for later."* All CTAs.

Every piece of content should have one. Without a CTA, you're entertaining people, not converting them.

**CTAs that work:**
- Specific (*"Tap the link to see all 6 listings"* > *"Check out my page"*)
- Low-friction (one tap, one DM, one save)
- Mid-funnel (asks small first, big later)

**CTAs that don't:**
- Vague (*"Reach out!"*)
- Multiple in one post (forces a choice; reduces clicks on each)
- Mismatched to the audience's stage (*"Buy now"* on a top-of-funnel awareness reel)`,
  },
  {
    slug: 'lead-magnet',
    title: 'Lead magnet',
    tagline: 'A free piece of value (a guide, list, tool) given in exchange for an email or DM.',
    category: 'marketing',
    related: ['cta', 'subscriber', 'conversion'],
    body: `A **lead magnet** is a free, valuable thing you give away in exchange for someone's email or other contact info. The classic format is a downloadable PDF, *"The 12 Coral Gables neighborhoods most likely to appreciate in 2026"*, but it can be a tool, a checklist, a market report, or a video series.

The exchange has to feel fair. If you're asking for someone's email, the thing they get back has to feel worth that small commitment.

**Lead magnets that work for real estate:**
- Hyper-local market reports
- First-time buyer checklists
- Off-market opportunities ("3 Coral Gables homes about to come to market")
- Saved searches with auto-emailed updates`,
  },
  {
    slug: 'ctr',
    title: 'CTR',
    tagline: 'Click-Through Rate, the percentage of viewers who tap a link.',
    category: 'marketing',
    related: ['cta', 'conversion', 'engagement-rate'],
    body: `**CTR** stands for **Click-Through Rate**: the percentage of people who saw something and tapped through. If 100 people saw your link in bio post and 8 tapped, that's an 8% CTR.

It's the cleanest measure of how well your content matches your CTA. A reel with 50,000 views and 50 link clicks has a 0.1% CTR, the views are likely accidental scrolls, not interested buyers. A reel with 5,000 views and 200 link clicks (4%) is far more valuable, even though the view count is 10× lower.

CTR matters across the funnel:
- Bio link CTR (reel views → bio link tap)
- Email open → click CTR (subscribers tapping CTAs in your newsletter)
- Listing → showing request CTR (listing page → tour booking)

Optimize for CTR, not raw reach.`,
  },
  {
    slug: 'subscriber',
    title: 'Subscriber',
    tagline: 'Someone who gives you their email so they hear from you on a recurring basis.',
    category: 'marketing',
    related: ['lead-magnet', 'newsletter', 'conversion'],
    body: `A **subscriber** is someone who's opted into hearing from you on a regular cadence, usually email, sometimes SMS or push. They've crossed the threshold from "saw your content once" to "I want this in my inbox."

For agents, subscribers are the most valuable audience tier they own. Followers are rented from the platform, Instagram could change its algorithm tomorrow and your reach evaporates. Subscribers are yours.

A million Instagram followers is impressive. 200 buyer subscribers in your zip code is more valuable.`,
  },
  {
    slug: 'funnel',
    title: 'Funnel',
    tagline: 'The stages a prospect moves through, from first awareness to becoming a customer.',
    category: 'marketing',
    related: ['conversion', 'lead-magnet', 'subscriber'],
    body: `A **funnel** is the metaphor for the stages a prospect moves through on the way to becoming a customer. Wide at the top (lots of people see your content, only a few are buyers); narrow at the bottom (the few who close).

Common shorthand:
- **TOFU**, Top of funnel: awareness. People meet you for the first time. Reels, blog posts, podcasts.
- **MOFU**, Middle of funnel: consideration. People know you and are evaluating. Newsletter, lead magnets, longer-form content.
- **BOFU**, Bottom of funnel: conversion. People are ready to act. Product demos, free trials, "book a call."

Real estate funnel example:
1. **TOFU**, Reels about Coconut Grove
2. **MOFU**, Subscribers to your weekly market update
3. **BOFU**, Showing requests on your listings

Different content for different stages. A "tour my new listing" reel is BOFU; a "10 things to know about Wynwood" reel is TOFU. Posting only BOFU content means you're trying to close prospects who've never met you. Posting only TOFU content means you'll have a huge audience and no closings.`,
  },
  {
    slug: 'conversion',
    title: 'Conversion',
    tagline: 'When a prospect takes a desired action, buying, signing up, scheduling a call.',
    category: 'marketing',
    related: ['ctr', 'funnel', 'lead-magnet'],
    body: `A **conversion** is when a prospect takes the action you want them to take. The action varies by stage:

- TOFU conversion: a follow, a save, a profile visit
- MOFU conversion: an email signup, a lead-magnet download, an event RSVP
- BOFU conversion: a showing request, a buyer-broker agreement, a closed deal

**Conversion rate** is the percentage of people at one stage who progress to the next. If 1,000 people visit your link in bio and 30 sign up for your newsletter, that's a 3% conversion rate.

Improving conversion rate is almost always more leveraged than acquiring more traffic. A 1% → 2% improvement on existing traffic doubles your output for free.`,
  },
  {
    slug: 'newsletter',
    title: 'Newsletter',
    tagline: 'A regular email sent to subscribers, typically with curated content or commentary.',
    category: 'marketing',
    related: ['subscriber', 'drip-campaign'],
    body: `A **newsletter** is a recurring email sent to a list of subscribers. Frequency varies, daily (most aggressive, hardest to sustain), weekly (the sweet spot for most agents), monthly (easiest, also least sticky).

Real estate newsletters that work tend to share a few traits:
- **Hyper-local**, focused on a specific submarket, not generic real estate news
- **Personality-driven**, the agent's voice is present, not a generic listings dump
- **Useful even to non-buyers**, if a subscriber moved away tomorrow, would they still open it? If yes, it's good.

Tools: Mailchimp, ConvertKit, Substack, Beehiiv, Flodesk. Pick one and ship; tooling matters less than consistency.`,
  },
  {
    slug: 'drip-campaign',
    title: 'Drip campaign',
    tagline: 'A sequence of pre-written emails sent automatically over time, triggered by a subscriber action.',
    category: 'marketing',
    related: ['newsletter', 'subscriber', 'lead-magnet'],
    body: `A **drip campaign** is an automated email sequence triggered by a specific action, signing up for a newsletter, downloading a lead magnet, attending an open house. The emails are pre-written and "drip" out on a schedule (Day 0, Day 2, Day 5, Day 10, etc.).

A typical real estate drip:
- **Day 0**: Welcome email + the lead magnet they signed up for
- **Day 2**: A second piece of content (related, valuable)
- **Day 5**: Your story / why you do this
- **Day 10**: A soft CTA to schedule a call
- **Day 21**: A market-update with a stronger CTA

Drips work because they nurture leads who aren't ready to act yet. Most real estate leads aren't ready in week one. The drip keeps you in their inbox during the 3–18 months they take to make a decision.`,
  },
  {
    slug: 'a-b-test',
    title: 'A/B test',
    tagline: 'A controlled experiment comparing two versions of something to see which performs better.',
    category: 'marketing',
    related: ['conversion', 'ctr'],
    body: `An **A/B test** (sometimes split test) is an experiment where you show two versions of something, a subject line, a thumbnail, a CTA, a landing page, to comparable audiences and measure which performs better.

A real estate example: send the same newsletter to two halves of your subscriber list, with two different subject lines. Whichever has the higher open rate wins.

The discipline of A/B testing is more about the *habit* than the statistics. Marketers who test routinely improve faster than those who go on intuition. Tools (Mailchimp, ConvertKit, etc.) build A/B testing into the workflow.

Don't test trivial things. Test what matters: the subject line, the hook, the offer, the CTA. Don't test the button color.`,
  },
  {
    slug: 'geotag',
    title: 'Geotag',
    tagline: 'A location label attached to a piece of social content, marking where it was taken.',
    category: 'marketing',
    related: ['niche'],
    body: `A **geotag** is the location attached to a piece of social media content, a city, a neighborhood, a specific business. Instagram, TikTok, and Facebook all support them.

For real estate agents, geotags are an underrated discovery channel. Tagging "Coconut Grove" on a reel adds it to that location's tag feed, where users browsing the area can find it. Buyers shopping a neighborhood often search the location tag directly.

Best practices:
- Use the **most-used spelling** of the location ("Coral Gables, FL" vs. "Coral Gables")
- Tag the **smallest plausible area** ("Wynwood" beats "Miami" for niche reach)
- Be **honest** about location, don't tag downtown Miami on a Doral reel; users notice and disengage`,
  },
  {
    slug: 'niche',
    title: 'Niche',
    tagline: 'The specific audience or topic a creator focuses on, narrower is usually better.',
    category: 'marketing',
    related: ['funnel', 'subscriber'],
    body: `A **niche** is the specific audience or topic a creator focuses on. The narrower the niche, the easier it is to grow, and the more valuable each follower becomes.

Counterintuitively, "Coconut Grove agent" beats "Miami agent" beats "Florida agent" beats "real estate agent" for almost every metric that matters. The narrower niche has:
- Less competition
- Higher engagement rates (audience cares about this exact thing)
- More direct conversion (audience matches the agent's actual service area)
- Better organic discovery (Instagram, TikTok favor niche specificity)

Most agents fight this. They want to be "the Miami agent" or "the Florida agent" because they want to keep their options open. The agents who commit to a 6-zip-code niche grow faster.

It's hard to be famous to everyone. It's much easier to be the most well-known agent in three neighborhoods.`,
  },
  {
    slug: 'brand-kit',
    title: 'Brand kit',
    tagline: 'The defined set of colors, fonts, logos, and visual rules a creator uses across all their content.',
    category: 'marketing',
    related: ['tone-of-voice'],
    body: `A **brand kit** is the documented set of colors, fonts, logos, and visual rules that a creator uses consistently across all their content. The point: visual consistency makes the creator instantly recognizable.

Typical brand kit:
- **Primary color** + 2–3 supporting colors (with hex codes)
- **Display font** (used for headlines)
- **Body font** (used for paragraphs)
- **Logo** + variations (full, mark only, light, dark)
- **Photo treatment** rules (filters, color grading, framing)
- **Voice + tone** notes (see [tone of voice](/glossary/tone-of-voice))

For agents, a brand kit doesn't need to be a $5k branding project. A documented Notion page with 3 colors, 2 fonts, and a logo is plenty. The discipline of consistency matters more than the design polish.`,
  },
  {
    slug: 'tone-of-voice',
    title: 'Tone of voice',
    tagline: 'The personality and style of how a brand or creator speaks.',
    category: 'marketing',
    related: ['brand-kit', 'niche'],
    body: `**Tone of voice** is the consistent personality and style of how a brand or creator communicates, across captions, emails, listings, DMs, anywhere words go.

Some examples on the spectrum:
- *Authoritative + data-driven* ("In Q3, Coral Gables saw 11% YoY price growth")
- *Conversational + warm* ("Y'all are gonna love this Coconut Grove listing")
- *Witty + sharp* ("Yes, $4M for a teardown. Welcome to 33133.")
- *Aspirational + minimal* ("Brickell. 70th floor. Nothing else needed.")

The tone should match the agent's actual personality (so it's sustainable) and the audience's expectations (so it lands). Inconsistency between social, email, and in-person voice is a credibility problem, buyers notice when the warm-and-witty Instagram agent shows up to a meeting all-business.`,
  },

  /* ─────────────────────── CONTENT ─────────────────────── */
  {
    slug: 'reel',
    title: 'Reel',
    tagline: 'A short-form vertical video, originally an Instagram format, now also on TikTok and YouTube.',
    category: 'content',
    related: ['carousel', 'hook', 'aspect-ratio'],
    body: `A **reel** is short-form vertical video, typically 15–90 seconds, full-screen 9:16 [aspect ratio](/glossary/aspect-ratio), optimized for thumb-scrolling. Instagram introduced the term in 2020 to compete with TikTok; today the format dominates discovery on Instagram, YouTube (Shorts), and TikTok itself.

For real estate agents, reels are the workhorse format. A walkthrough that takes 25 minutes in person fits into 45 seconds of well-edited reel and reaches 50× more people.

**Reel formats that perform:**
- Day-in-the-life
- Listing tours
- Neighborhood tours
- Educational ("what's actually in your closing costs")
- Behind-the-scenes (staging day, photoshoot day, hard negotiation)

The first 1.5 seconds, the [hook](/glossary/hook), are everything. If the hook doesn't land, the rest doesn't get watched.`,
  },
  {
    slug: 'carousel',
    title: 'Carousel',
    tagline: 'A multi-image post on Instagram or LinkedIn that users swipe through.',
    category: 'content',
    related: ['reel', 'save-bait'],
    body: `A **carousel** is a post format with multiple images (or short videos) that users swipe through horizontally. Up to 20 slides on Instagram. The format rewards depth, *teach me something across 8 slides*, over the 1.5-second hook of a reel.

**Why carousels work:**
- They favor **information density**: a "10 things to check before your final walkthrough" carousel can pack real value across 10 cards
- The first slide acts as a hook; the last slide is your CTA. The middle slides earn the attention
- They have a longer engagement curve than reels, users *save* carousels for reference much more than reels`,
  },
  {
    slug: 'story',
    title: 'Story',
    tagline: 'A 24-hour ephemeral post format on Instagram, Facebook, and Snapchat.',
    category: 'content',
    related: ['reel', 'highlight'],
    body: `A **Story** is an ephemeral 24-hour post format. After 24 hours, the post disappears (unless you save it as a [Highlight](/glossary/highlight)). Stories appear at the top of the Instagram feed in a horizontal row of avatars; they're full-screen, swipe-through, and support stickers, polls, links, and music.

Stories serve a different function than reels:
- **Reels**, discovery; reach new audiences who don't follow you
- **Stories**, relationship; talk to the audience that already follows you

For agents, Stories are where the day-to-day workflow lives, pulling up to a showing, reactions to an open house, a quick reply to a DM that's relevant to many followers. Lower production, higher frequency, more intimate.`,
  },
  {
    slug: 'highlight',
    title: 'Highlight',
    tagline: 'A saved Instagram Story preserved on the profile beyond the 24-hour window.',
    category: 'content',
    related: ['story'],
    body: `A **Highlight** is a saved [Story](/glossary/story), pinned to the top of an Instagram profile beyond the normal 24-hour ephemeral window. Highlights appear as a row of round thumbnails just under the profile bio, organized into custom categories.

For agents, Highlights are the quickest way to create a self-serve experience for profile visitors. Common Highlight categories:
- **Listings** (sold + active)
- **Testimonials**
- **Behind the scenes**
- **Neighborhoods** (one Highlight per submarket)
- **Buying / Selling guides**

A profile with thoughtful Highlights converts visitor → follower at higher rates than one without, they signal that the account has substance, not just recent posts.`,
  },
  {
    slug: 'hook',
    title: 'Hook',
    tagline: 'The first 1–3 seconds of a reel, the part that decides whether the rest gets watched.',
    category: 'content',
    related: ['reel', 'pattern-interrupt', 'retention'],
    body: `A **hook** is the very beginning of a piece of short-form video, the first 1–3 seconds. It's the part that decides whether the viewer keeps watching or scrolls past.

The algorithm watches your hook closely. If users scroll past in the first second, the platform reads that as "this isn't for them" and stops showing it. If they watch through the hook, the platform keeps serving the rest.

**Hooks that work:**
- A pattern interrupt (something visually unexpected)
- A counterintuitive statement ("don't buy in Brickell")
- A specific number ("$4.95M for this Coconut Grove home")
- A character on camera saying something that demands clarification

**Hooks that don't:**
- A long establishing shot before any payoff
- A "watch till the end" promise without a hook
- A studio logo or branded intro
- Asking the viewer a question that doesn't intrigue

The second worst place to spend production time is the b-roll. The worst is the hook.`,
  },
  {
    slug: 'b-roll',
    title: 'B-roll',
    tagline: 'Supplementary footage that supports the main shot, interior shots, drone, ambient detail.',
    category: 'content',
    related: ['reel', 'voiceover'],
    body: `**B-roll** is the supporting footage that fills in around the main shot ("a-roll") in a video. For real estate, b-roll is the property visuals, wide drone shots, kitchen detail, the chef's-kiss bathroom, that support an agent's voiceover or talking head.

A typical 30-second listing reel:
- **A-roll**: agent on camera saying 1–2 sentences
- **B-roll**: 8–14 seconds of property interior + exterior cuts
- **A-roll**: agent on camera with the close

The b-roll is where the property gets sold. The a-roll is where the agent gets remembered. Both matter.

Shoot more b-roll than you think you need. Editing requires choices. Always cutting is easier than reshooting.`,
  },
  {
    slug: 'voiceover',
    title: 'Voiceover',
    tagline: 'Recorded narration laid over visuals, instead of (or alongside) on-camera dialogue.',
    category: 'content',
    related: ['reel', 'b-roll'],
    body: `A **voiceover** (often **VO**) is narration recorded separately from the visuals and laid over the video in editing. Common in real estate reels where the agent doesn't want to be on camera the entire time.

Voiceover advantages:
- Lets the visuals carry the emotional weight (the property sells itself)
- Lets the agent record clean audio without managing camera framing
- Allows for tighter, more polished delivery (multiple takes)

Voiceover risks:
- Detached feel, the agent feels less personally connected
- Quality bar is higher (audio defects are obvious in narration that doesn't have a face attached)

Best practice: mix VO with at least one on-camera shot per reel. The blend balances production polish with personal connection.`,
  },
  {
    slug: 'caption',
    title: 'Caption',
    tagline: 'The text that accompanies a social media post, beneath the visual.',
    category: 'content',
    related: ['hashtag', 'cta'],
    body: `A **caption** is the text that accompanies a social media post. On Instagram, captions can be up to 2,200 characters. On TikTok, much shorter, closer to a tagline. The optimal length depends on the platform and the format.

For real estate agents, the caption serves three jobs:
1. **Context**, what is this listing/neighborhood/topic?
2. **Hook**, first line that makes people tap "more"
3. **CTA**, what should the viewer do next?

The first line of an Instagram caption is critical. It shows up in the feed before "more"; if it's boring, the rest of the caption never gets read.

Long captions can outperform short ones for engagement (people who read fully tend to engage strongly). Short captions can outperform for reach (people don't bounce on the way through). Test both.`,
  },
  {
    slug: 'thumbnail',
    title: 'Thumbnail',
    tagline: 'The cover image for a video, what shows in the feed before someone taps to watch.',
    category: 'content',
    related: ['hook', 'reel'],
    body: `A **thumbnail** is the cover image of a video, what appears in the feed (or grid, on Instagram) before a viewer taps to play. On Instagram reels and TikTok, the thumbnail is also the in-grid representation of the post on the agent's profile.

A great thumbnail does two things:
1. **Stops the scroll** in the feed
2. **Communicates the topic** at a glance

For agents, the listing's exterior usually makes the best thumbnail. The kitchen is second. Avoid using the agent's face as a thumbnail unless the post is about the agent specifically, buyers want to see homes, not portraits, when scrolling.

Instagram lets you upload a custom thumbnail separate from a video frame. Use it. Default frames are usually a mid-cut blur.`,
  },
  {
    slug: 'aspect-ratio',
    title: 'Aspect ratio',
    tagline: 'The width-to-height proportion of a video or image.',
    category: 'content',
    related: ['reel', 'thumbnail'],
    body: `**Aspect ratio** is the proportion of width to height in a video or image. The dominant ratios in social media:

- **9:16** (vertical), reels, TikTok, Stories. Optimized for phones held in portrait.
- **1:1** (square), Instagram feed, X. Universal but increasingly suboptimal.
- **4:5** (portrait, slightly taller than square), Instagram feed; takes up the most vertical space without going full vertical.
- **16:9** (horizontal), YouTube, traditional TV. Bad fit for phones held vertically.

Real estate content in 2025: shoot vertical (9:16) for reels and Stories, optionally repurpose to 4:5 for the Instagram feed. Avoid 16:9 unless you're working in YouTube long-form.

Most modern phones default to 16:9 video. Switch to 9:16 in your camera app before shooting reels, fixing aspect ratio in editing means cropping, which loses quality.`,
  },
  {
    slug: 'trending-audio',
    title: 'Trending audio',
    tagline: 'A song or audio clip currently popular on a platform, using it can boost reach.',
    category: 'content',
    related: ['reel', 'algorithm'],
    body: `**Trending audio** is a song or audio clip that's currently being used heavily on a platform, Instagram, TikTok, YouTube Shorts. The algorithms tend to favor content using trending audio because it signals the creator is "in the conversation."

For agents, the trick is using trending audio in a way that fits the content. A walkthrough of a $5M Coral Gables home set to a hyper-trending dance audio reads as off-brand. Find audio that's both trending AND tonally appropriate.

Trends move fast, typically a 2–4 week window where an audio is fresh and amplified, then it dies. The agent who's in the platform daily catches trends; the agent who batches a month of content at once misses them.`,
  },
  {
    slug: 'save-bait',
    title: 'Save bait',
    tagline: 'Content designed to be saved, usually informational or list-format, not entertaining.',
    category: 'content',
    related: ['carousel', 'reel', 'engagement-rate'],
    body: `**Save bait** is content explicitly designed to be saved by viewers, not just watched and scrolled past. Saves are one of the strongest engagement signals to the algorithm, Instagram interprets a save as *"this is so valuable I want to find it later"* and pushes it to similar viewers.

**What gets saved:**
- Lists ("7 questions to ask before signing a lease")
- Reference content ("how to read a closing disclosure")
- Tools ("mortgage payment by income bracket")
- Local guides ("best 5 brunch spots in Coral Gables")

**What doesn't get saved:**
- Pure entertainment (gets liked, not saved)
- Time-sensitive content (an open house this weekend isn't worth saving Tuesday)
- Anything that requires you to be the agent

The best save bait is content that's useful to the viewer *whether or not they ever work with you*.`,
  },
  {
    slug: 'engagement-rate',
    title: 'Engagement rate',
    tagline: 'The percentage of viewers who interact with content, likes, comments, saves, shares.',
    category: 'content',
    related: ['reach', 'impressions', 'save-bait'],
    body: `**Engagement rate** is the ratio of total interactions (likes + comments + saves + shares) to total reach. A reel reaching 10,000 people that gets 500 interactions has a 5% engagement rate.

For real estate agents, engagement rate matters more than raw follower count when:
- Negotiating brand sponsorships
- Demonstrating influence (vs. a vanity follower count)
- Predicting whether a post will keep getting served

**Healthy engagement rates by account size (Instagram):**
- Under 5k followers: 6–8%+
- 5k–20k: 4–6%
- 20k–100k: 3–5%
- 100k+: 2–3%

Engagement rate decays with size, bigger accounts have more passive followers. Don't compare a 1k-follower agent's engagement rate to a 100k-follower agent's; they're playing different games.`,
  },
  {
    slug: 'reach',
    title: 'Reach',
    tagline: 'The number of unique accounts that saw a piece of content.',
    category: 'content',
    related: ['impressions', 'engagement-rate'],
    body: `**Reach** is the count of *unique* accounts that saw a piece of content. If 10,000 distinct people saw your reel, your reach is 10,000.

Reach differs from [impressions](/glossary/impressions), impressions count every view, including the same person seeing the post twice (once on the home feed, once via Explore).

**Reach is rented from the algorithm.** A great reel can reach 100× the creator's follower count. A weak one might reach 10% of it. The algorithm uses early engagement signals (within the first hour) to decide how broadly to distribute the post.

Optimizing for reach means optimizing for what the algorithm reads as quality: hook strength, completion rate, save rate, share rate, comment quality.`,
  },
  {
    slug: 'impressions',
    title: 'Impressions',
    tagline: 'The total count of times a piece of content was viewed, including repeat views.',
    category: 'content',
    related: ['reach', 'engagement-rate'],
    body: `**Impressions** count every view of a piece of content, including the same person viewing it multiple times. If 8,000 unique people saw your reel and the average person saw it 1.4 times, you have **8,000 reach** and **11,200 impressions**.

For most content marketing, [reach](/glossary/reach) matters more, you care how many distinct people the message touched, not how many total eyeball-impressions there were.

For paid advertising and brand-awareness work, impressions sometimes matter more, you're trying to drive frequency (a person seeing the same message 5 times will remember it; once won't stick).`,
  },
  {
    slug: 'algorithm',
    title: 'Algorithm',
    tagline: 'The platform\'s ranking and distribution system that decides whose content shows up where.',
    category: 'content',
    related: ['reach', 'engagement-rate', 'trending-audio'],
    body: `The **algorithm** is the platform's ranking and distribution system, the math that decides which content gets shown to which users, in what order, on what surfaces (home feed, Explore, Reels feed, etc.).

The exact algorithms are proprietary and constantly evolving, but a few signals are well-documented:

**Strong positive signals:**
- High completion rate (people watch all the way through)
- High save rate
- High share rate
- Comments (especially with replies that generate threads)
- "Sends" (DMs sharing the post)

**Neutral or negative signals:**
- Low completion rate (people scroll past quickly)
- Hidden by user
- Reported / flagged
- Long delay between post and engagement

For agents: stop trying to "beat the algorithm." Start trying to make content people genuinely want to watch and share. The algorithm rewards that automatically.`,
  },
  {
    slug: 'hashtag',
    title: 'Hashtag',
    tagline: 'A keyword preceded by # used to categorize and discover content on social platforms.',
    category: 'content',
    related: ['niche', 'geotag'],
    body: `A **hashtag** (#tag) is a keyword preceded by the # symbol, used to categorize content on social platforms. Originally a Twitter convention, now universal across Instagram, TikTok, YouTube, LinkedIn, and X.

For real estate agents, hashtags are a discovery channel. Buyers searching for "#coralgables" or "#miamirealestate" find content tagged with those keywords. The relevance is mid, hashtag-driven discovery has declined as the algorithm became smarter, but it still matters at the margin.

**Hashtag strategy:**
- Mix sizes (one big hashtag for reach, several niche ones for relevance)
- Keep it under 10 per post (too many looks spammy)
- Use location hashtags (#coralgables) more than generic ones (#realestate)
- Avoid banned hashtags (some innocuous tags are platform-banned and tank reach)`,
  },
  {
    slug: 'pattern-interrupt',
    title: 'Pattern interrupt',
    tagline: 'An unexpected visual or audio moment that breaks a viewer\'s scroll rhythm.',
    category: 'content',
    related: ['hook', 'reel'],
    body: `A **pattern interrupt** is something unexpected, a sudden cut, a counterintuitive visual, an unfamiliar sound, that breaks a viewer's scroll rhythm and grabs their attention. It's a hook technique.

Examples for real estate:
- A reel that opens with the agent saying *"don't buy this house"* (counterintuitive)
- A walkthrough that starts on the back patio looking *out*, not the front entry looking in (unexpected POV)
- A jump-cut from the front door to the master bath in 0.3 seconds (visual rhythm break)

The trick: the interrupt has to fit the content. A pattern interrupt that's just weird without payoff feels random and bounces viewers immediately.`,
  },
  {
    slug: 'retention',
    title: 'Retention',
    tagline: 'How long viewers watch a video before scrolling away, usually shown as a curve.',
    category: 'content',
    related: ['hook', 'algorithm'],
    body: `**Retention** is the percentage of viewers still watching at each second of a video. Platforms surface this as a graph in Insights, typically a curve that drops over the duration of the post.

A healthy retention curve:
- 90%+ at second 1 (the hook landed)
- 60–70% at the midpoint (people stayed engaged)
- 40%+ at the end (the post earned the full watch)

A bad retention curve:
- Drops to 50% in second 1 (weak hook)
- Cliff at 5–8 seconds (people left when the b-roll ran long)
- Falls off entirely before the CTA (your CTA reaches almost no one)

Retention is the most important quality signal to the algorithm. A 30-second reel watched all the way through will reach more people than a 30-second reel watched 40% through, even if both have the same number of likes.`,
  },
  {
    slug: 'watch-time',
    title: 'Watch time',
    tagline: 'The total time viewers spent watching a piece of content, summed across all viewers.',
    category: 'content',
    related: ['retention', 'algorithm'],
    body: `**Watch time** is the total accumulated time viewers spent watching a piece of content. If 1,000 people watched a 30-second reel for an average of 18 seconds each, the watch time is 18,000 seconds (5 hours).

For platforms, watch time is currency, it's literally what they sell to advertisers. So the algorithm aggressively rewards content that maximizes it.

For creators, the watch-time math suggests two strategies that can both work:
1. **Make content people watch all the way through** (high retention, full duration consumed)
2. **Make content people watch many times** (loops, rewatchable, dense)

The agents who do both, make a 25-second reel with a hook so good people watch it twice, break out fastest.`,
  },
  {
    slug: 'vanity-metric',
    title: 'Vanity metric',
    tagline: 'A metric that looks impressive but doesn\'t correlate with actual business outcomes.',
    category: 'content',
    related: ['engagement-rate', 'conversion'],
    body: `A **vanity metric** is a number that's easy to grow and looks good on a screenshot but doesn't actually predict business outcomes. Followers, likes, and view counts are the most common.

For real estate agents, the trap is optimizing for follower growth at the expense of pipeline. A 100k-follower agent in the wrong city gets fewer closings than a 3k-follower agent in the right neighborhood.

**Better metrics:**
- Subscribers (people who gave you their email)
- DMs from prospective buyers
- Showing requests
- Closed deals attributable to social

A useful test: would you trade your follower count for a 5x pipeline? Yes? Then your follower count is a vanity metric.`,
  },
]

/** Indexed lookup, used by the term page to resolve a slug. */
export const GLOSSARY_BY_SLUG: Record<string, GlossaryTerm> = Object.fromEntries(
  GLOSSARY_TERMS.map((t) => [t.slug, t]),
)

/** Pre-grouped by first letter, used by the index page's A–Z nav. */
export function groupTermsByLetter(): Map<string, GlossaryTerm[]> {
  const groups = new Map<string, GlossaryTerm[]>()
  for (const t of GLOSSARY_TERMS) {
    const letter = t.title[0].toUpperCase()
    const arr = groups.get(letter) || []
    arr.push(t)
    groups.set(letter, arr)
  }
  for (const arr of groups.values()) {
    arr.sort((a, b) => a.title.localeCompare(b.title))
  }
  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)))
}

/** Resolve a list of related-term slugs into full term objects.
 *  Silently skips slugs that don't exist (so the catalog can grow
 *  in either order without breaking links). */
export function resolveRelated(term: GlossaryTerm): GlossaryTerm[] {
  if (!term.related) return []
  return term.related
    .map((slug) => GLOSSARY_BY_SLUG[slug])
    .filter(Boolean) as GlossaryTerm[]
}
