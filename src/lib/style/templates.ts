/**
 * Starter templates — bundles a palette + font + map shape into a
 * named "look" the agent can pick during onboarding. Choosing a
 * template just sets `paletteId`, `fontId`, `shapeId` on AgentStyle;
 * everything else (frames, sections, layout) inherits from
 * DEFAULT_STYLE so the agent gets a polished out-of-box profile.
 *
 * Agents can mix and match later via the Style tab — these are the
 * curated combos we surface during signup so they don't have to.
 */

export type StyleTemplateId = 'coastal' | 'espresso' | 'bloom' | 'obsidian'

export interface StyleTemplate {
  id: StyleTemplateId
  name: string
  /** One-line vibe / personality the template signals. */
  vibe: string
  paletteId: string
  fontId: string
  shapeId: string
}

export const STYLE_TEMPLATES: StyleTemplate[] = [
  {
    id: 'coastal',
    name: 'Coastal',
    vibe: 'Airy, modern, light',
    paletteId: 'coastal',
    fontId: 'humanist',
    shapeId: 'squircle',
  },
  {
    id: 'espresso',
    name: 'Espresso',
    vibe: 'Editorial, refined, dark',
    paletteId: 'espresso',
    fontId: 'editorial',
    shapeId: 'squircle',
  },
  {
    id: 'bloom',
    name: 'Bloom',
    vibe: 'Warm, classic, soft',
    paletteId: 'bloom',
    fontId: 'classic',
    shapeId: 'squircle',
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    vibe: 'Minimal, geometric, bold',
    paletteId: 'obsidian',
    fontId: 'geometric',
    shapeId: 'squircle',
  },
]

export const DEFAULT_TEMPLATE_ID: StyleTemplateId = 'coastal'

export function getTemplate(id: StyleTemplateId | string | null | undefined): StyleTemplate {
  return STYLE_TEMPLATES.find((t) => t.id === id) || STYLE_TEMPLATES[0]
}
