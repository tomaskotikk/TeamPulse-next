import type { CategoryTemplate } from './types'

const Y = new Date().getFullYear()

export const CATEGORY_TEMPLATES: CategoryTemplate[] = [
  {
    name: 'Rugby',
    sport: 'rugby',
    categories: [
      // Muži: born ≤ Y-20 (2006 and older in 2026)
      { name: 'Muži',  birth_year_from: null,  birth_year_to: Y - 20, color: '#ef4444' },
      // U19: born Y-19 to Y-17  (2007–2009 in 2026)
      { name: 'U19',   birth_year_from: Y - 19, birth_year_to: Y - 17, color: '#f97316' },
      // U16: born Y-16 to Y-15  (2010–2011 in 2026)
      { name: 'U16',   birth_year_from: Y - 16, birth_year_to: Y - 15, color: '#eab308' },
      // U14: born Y-14 to Y-13  (2012–2013 in 2026)
      { name: 'U14',   birth_year_from: Y - 14, birth_year_to: Y - 13, color: '#22c55e' },
      // U12: born Y-12 to Y-11  (2014–2015 in 2026)
      { name: 'U12',   birth_year_from: Y - 12, birth_year_to: Y - 11, color: '#06b6d4' },
      // U10: born Y-10 to Y-9   (2016–2017 in 2026)
      { name: 'U10',   birth_year_from: Y - 10, birth_year_to: Y - 9,  color: '#6366f1' },
    ],
  },
  {
    name: 'Fotbal',
    sport: 'football',
    categories: [
      { name: 'Dospělí', birth_year_from: null,  birth_year_to: Y - 20, color: '#ef4444' },
      { name: 'U19',     birth_year_from: Y - 19, birth_year_to: Y - 17, color: '#f97316' },
      { name: 'U17',     birth_year_from: Y - 16, birth_year_to: Y - 15, color: '#eab308' },
      { name: 'U15',     birth_year_from: Y - 14, birth_year_to: Y - 13, color: '#22c55e' },
      { name: 'U13',     birth_year_from: Y - 12, birth_year_to: Y - 11, color: '#06b6d4' },
      { name: 'U11',     birth_year_from: Y - 10, birth_year_to: Y - 9,  color: '#6366f1' },
    ],
  },
  {
    name: 'Basketbal',
    sport: 'basketball',
    categories: [
      { name: 'Dospělí', birth_year_from: null,  birth_year_to: Y - 20, color: '#ef4444' },
      { name: 'U20',     birth_year_from: Y - 19, birth_year_to: Y - 18, color: '#f97316' },
      { name: 'U18',     birth_year_from: Y - 17, birth_year_to: Y - 16, color: '#eab308' },
      { name: 'U16',     birth_year_from: Y - 15, birth_year_to: Y - 14, color: '#22c55e' },
      { name: 'U14',     birth_year_from: Y - 13, birth_year_to: Y - 12, color: '#06b6d4' },
      { name: 'U12',     birth_year_from: Y - 11, birth_year_to: Y - 10, color: '#6366f1' },
    ],
  },
  {
    name: 'Hokej',
    sport: 'hockey',
    categories: [
      { name: 'Dospělí', birth_year_from: null,  birth_year_to: Y - 20, color: '#ef4444' },
      { name: 'U20',     birth_year_from: Y - 19, birth_year_to: Y - 18, color: '#f97316' },
      { name: 'U18',     birth_year_from: Y - 17, birth_year_to: Y - 16, color: '#eab308' },
      { name: 'U16',     birth_year_from: Y - 15, birth_year_to: Y - 14, color: '#22c55e' },
      { name: 'U14',     birth_year_from: Y - 13, birth_year_to: Y - 12, color: '#06b6d4' },
      { name: 'U12',     birth_year_from: Y - 11, birth_year_to: Y - 10, color: '#a855f7' },
      { name: 'U10',     birth_year_from: Y - 9,  birth_year_to: Y - 8,  color: '#6366f1' },
    ],
  },
  {
    name: 'Volejbal',
    sport: 'volleyball',
    categories: [
      { name: 'Dospělí', birth_year_from: null,  birth_year_to: Y - 20, color: '#ef4444' },
      { name: 'U19',     birth_year_from: Y - 19, birth_year_to: Y - 17, color: '#f97316' },
      { name: 'U17',     birth_year_from: Y - 16, birth_year_to: Y - 15, color: '#eab308' },
      { name: 'U15',     birth_year_from: Y - 14, birth_year_to: Y - 13, color: '#22c55e' },
      { name: 'U13',     birth_year_from: Y - 12, birth_year_to: Y - 11, color: '#06b6d4' },
    ],
  },
  {
    name: 'Atletika',
    sport: 'athletics',
    categories: [
      { name: 'Senioři',      birth_year_from: null,  birth_year_to: Y - 20, color: '#ef4444' },
      { name: 'Junioři',      birth_year_from: Y - 19, birth_year_to: Y - 18, color: '#f97316' },
      { name: 'Dorost',       birth_year_from: Y - 17, birth_year_to: Y - 15, color: '#eab308' },
      { name: 'Starší žáci',  birth_year_from: Y - 14, birth_year_to: Y - 13, color: '#22c55e' },
      { name: 'Mladší žáci',  birth_year_from: Y - 12, birth_year_to: Y - 11, color: '#06b6d4' },
    ],
  },
]

export function getTemplateByName(name: string): CategoryTemplate | undefined {
  return CATEGORY_TEMPLATES.find((t) => t.name === name)
}
