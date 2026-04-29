export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}

/**
 * Compose a Rentcast-friendly address string by injecting the unit
 * number after the street and before the city. Mapbox returns
 * addresses like "123 Main St, Miami, Florida 33131" — for a unit "4B"
 * we want "123 Main St #4B, Miami, Florida 33131".
 *
 * Strips a leading '#' from the unit if the user typed one; we add
 * exactly one back. Returns the bare address unchanged when unit is
 * null/empty.
 */
export function composeAddressWithUnit(address: string, unit: string | null | undefined): string {
  if (!unit || !unit.trim()) return address
  const cleanUnit = unit.trim().replace(/^#/, '')
  // Find the first comma — that's typically the boundary between
  // "street" and "city, state, zip". Mapbox results follow this shape.
  const commaIdx = address.indexOf(',')
  if (commaIdx === -1) {
    // No comma — address is just a street. Append the unit at the end.
    return `${address.trim()} #${cleanUnit}`
  }
  const street = address.slice(0, commaIdx).trim()
  const rest = address.slice(commaIdx) // includes leading comma
  return `${street} #${cleanUnit}${rest}`
}

/**
 * Render an address for display, optionally with a unit. If a unit is
 * stored on the pin, we show "Street #unit, City, ST" — without
 * re-running through composeAddressWithUnit's parser logic. Falls
 * back to the bare address when unit is empty.
 */
export function displayAddressWithUnit(address: string, unit: string | null | undefined): string {
  return composeAddressWithUnit(address, unit)
}
