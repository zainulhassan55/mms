import type { AppRole } from '@prisma/client'

export const roleLabels: Record<AppRole, string> = {
  author: 'Author',
  office: 'Editor', // legacy — migrated to editor
  editor: 'Editor',
  reviewer: 'Reviewer',
  production: 'Production Editor',
  admin: 'Editor in Chief',
  journal_manager: 'Journal Manager',
  copyeditor: 'Copyeditor',
}
