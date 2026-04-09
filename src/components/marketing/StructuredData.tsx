import { useEffect } from 'react'
import type { UserDoc, Pin } from '@/lib/types'

interface StructuredDataProps {
  agent: UserDoc
  pins?: Pin[]
}

const SITE_URL = 'https://reel.st'
const SCRIPT_ID = 'reelst-jsonld'

/**
 * Injects schema.org JSON-LD into <head> for an agent profile.
 * - Person schema for the agent
 * - RealEstateListing schema for each active for_sale pin
 *
 * Google uses this to render rich previews (agent name, ratings, listings).
 */
export function StructuredData({ agent, pins = [] }: StructuredDataProps) {
  useEffect(() => {
    const url = `${SITE_URL}/${agent.username || agent.uid}`

    const personSchema = {
      '@context': 'https://schema.org',
      '@type': 'RealEstateAgent',
      name: agent.displayName,
      url,
      image: agent.photoURL || `${SITE_URL}/icons/og-image.png`,
      description: agent.bio || `${agent.displayName} on Reelst`,
      jobTitle: 'Real Estate Agent',
      ...(agent.brokerage && {
        worksFor: { '@type': 'Organization', name: agent.brokerage },
      }),
      ...(agent.followerCount !== undefined && {
        interactionStatistic: {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/FollowAction',
          userInteractionCount: agent.followerCount,
        },
      }),
    }

    // Build RealEstateListing for each active for_sale pin
    const listings = pins
      .filter((p): p is Extract<Pin, { type: 'for_sale' }> =>
        p.type === 'for_sale' && p.enabled !== false
      )
      .slice(0, 50) // cap to keep payload reasonable
      .map((pin) => ({
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: pin.address,
        url: `${url}?pin=${pin.id}`,
        ...(pin.heroPhotoUrl && { image: pin.heroPhotoUrl }),
        ...(pin.description && { description: pin.description }),
        offers: {
          '@type': 'Offer',
          price: pin.price,
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
        },
        address: {
          '@type': 'PostalAddress',
          streetAddress: pin.address,
        },
        ...(pin.beds !== undefined && {
          numberOfBedrooms: pin.beds,
          numberOfBathroomsTotal: pin.baths,
          floorSize: { '@type': 'QuantitativeValue', value: pin.sqft, unitCode: 'FTK' },
        }),
        broker: { '@type': 'RealEstateAgent', name: agent.displayName, url },
      }))

    const schemas = [personSchema, ...listings]

    // Remove any prior injection then add fresh
    const existing = document.getElementById(SCRIPT_ID)
    if (existing) existing.remove()

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(schemas.length === 1 ? schemas[0] : schemas)
    document.head.appendChild(script)

    return () => {
      const el = document.getElementById(SCRIPT_ID)
      if (el) el.remove()
    }
  }, [agent, pins])

  return null
}
