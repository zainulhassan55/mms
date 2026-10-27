import type { AppRole, JournalMemberRole, Prisma } from '@prisma/client'
import { prisma } from '../db.js'

const STAFF_MEMBER_ROLES: JournalMemberRole[] = [
  'journal_manager',
  'editor',
  'section_editor',
  'copyeditor',
  'production',
]

export function isGlobalAdmin(role: AppRole): boolean {
  return role === 'admin'
}

export async function getUserJournalIds(
  userId: string,
  roles?: JournalMemberRole[],
): Promise<string[]> {
  const memberships = await prisma.journalMembership.findMany({
    where: {
      userId,
      ...(roles?.length ? { role: { in: roles } } : {}),
    },
    select: { journalId: true },
  })
  return [...new Set(memberships.map((m) => m.journalId))]
}

export async function userHasJournalRole(
  userId: string,
  journalId: string,
  roles: JournalMemberRole[],
): Promise<boolean> {
  const hit = await prisma.journalMembership.findFirst({
    where: { userId, journalId, role: { in: roles } },
    select: { id: true },
  })
  return Boolean(hit)
}

/** Scope manuscript list queries by journal membership (admins see all). */
export async function journalScopeWhere(
  userId: string,
  role: AppRole,
): Promise<Prisma.ManuscriptWhereInput | undefined> {
  if (isGlobalAdmin(role)) return undefined
  const journalIds = await getUserJournalIds(userId, STAFF_MEMBER_ROLES)
  if (journalIds.length === 0) {
    // Fall back: authors/reviewers without membership still see own work via other filters
    return { journalId: '__none__' }
  }
  return { journalId: { in: journalIds } }
}

export async function ensureMembership(
  userId: string,
  journalId: string,
  role: JournalMemberRole,
) {
  return prisma.journalMembership.upsert({
    where: {
      userId_journalId_role: { userId, journalId, role },
    },
    update: {},
    create: { userId, journalId, role },
  })
}

const EDITORIAL_MEMBER_ROLES: JournalMemberRole[] = [
  'journal_manager',
  'editor',
  'section_editor',
]

/**
 * OJS-style editorial access: site admin, journal manager, or assigned editor.
 * Screening queue also allows unassigned editors/office on screening statuses.
 */
export async function canManageEditorial(
  user: { id: string; role: AppRole },
  manuscript: {
    journalId: string
    assignedEditorId: string | null
    status: string
  },
  opts?: { allowScreeningQueue?: boolean },
): Promise<boolean> {
  if (isGlobalAdmin(user.role)) return true

  if (user.role === 'journal_manager') {
    return userHasJournalRole(user.id, manuscript.journalId, [
      'journal_manager',
    ])
  }

  if (
    (user.role === 'editor' || user.role === 'office') &&
    manuscript.assignedEditorId === user.id
  ) {
    return true
  }

  if (
    opts?.allowScreeningQueue &&
    (user.role === 'editor' || user.role === 'office') &&
    ['submitted', 'formatting_requested'].includes(manuscript.status)
  ) {
    const member = await userHasJournalRole(
      user.id,
      manuscript.journalId,
      EDITORIAL_MEMBER_ROLES,
    )
    // No memberships yet → allow (legacy demo queues)
    const anyMembership = await prisma.journalMembership.findFirst({
      where: { userId: user.id },
      select: { id: true },
    })
    return member || !anyMembership
  }

  // OJS-like: any editor / section editor with journal membership can
  // manage invitations and decisions (not only the assigned editor).
  if (user.role === 'editor' || user.role === 'office') {
    const member = await userHasJournalRole(
      user.id,
      manuscript.journalId,
      EDITORIAL_MEMBER_ROLES,
    )
    if (member) return true
    const anyMembership = await prisma.journalMembership.findFirst({
      where: { userId: user.id },
      select: { id: true },
    })
    // Legacy demo: editors with no memberships at all still manage
    if (!anyMembership) return true
  }

  // Membership-based JM/section editor without matching AppRole
  return userHasJournalRole(user.id, manuscript.journalId, [
    'journal_manager',
    'section_editor',
  ])
}
