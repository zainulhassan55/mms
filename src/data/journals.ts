export const journals = [
  {
    id: 'jces',
    name: 'Journal of Computational Earth Systems',
    issn: '2789-1044',
    description: 'Computational methods for earth, climate, and environmental systems.',
  },
  {
    id: 'aiee',
    name: 'Advances in Intelligent Engineering',
    issn: '2666-2213',
    description: 'Applied AI, sensing, and engineering systems research.',
  },
] as const

export const articleTypes = [
  'Research',
  'Review',
  'Editorial',
  'Short Communication',
  'Data Paper',
] as const

export const specialIssues = [
  { id: 'none', label: 'No special issue (regular submission)' },
  { id: 'si-coastal', label: 'Special Issue: Coastal Risk & Resilience' },
  { id: 'si-open', label: 'Special Issue: Open Research Infrastructure' },
] as const
