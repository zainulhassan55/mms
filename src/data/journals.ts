export const journals = [
  {
    id: 'ijdh',
    name: 'International Journal of Digital Health',
    issn: 'Sample',
    description:
      'Connected care, health data, and trustworthy clinical technologies.',
  },
] as const

export const articleTypes = [
  'Research Article',
  'Review Article',
  'Editorial',
  'Communication',
  'Perspective',
  'Commentary',
  'Letter',
  'Report',
] as const

export const specialIssues = [
  { id: 'none', label: 'No special issue (regular submission)' },
] as const
