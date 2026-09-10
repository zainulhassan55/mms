import { prisma } from '../db.js'
import {
  notifyAuthorRevisionReminder,
  notifyEditorReviewOverdue,
  notifyReviewerDeadlineReminder,
} from './workflowEmails.js'

export type ReminderRunResult = {
  reviewerUpcoming: number
  reviewerOverdue: number
  editorOverdueNotices: number
  authorUpcoming: number
  authorOverdue: number
  markedOverdue: number
}

function startOfDay(date: Date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function daysFromNow(days: number) {
  const value = startOfDay(new Date())
  value.setDate(value.getDate() + days)
  return value
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

function canSendReminder(
  lastReminderAt: Date | null | undefined,
  reminderCount = 0,
) {
  const maxReminders = Number(process.env.REMINDER_MAX_PER_ITEM || 5)
  if (reminderCount >= maxReminders) return false
  if (!lastReminderAt) return true
  const minHours = Number(process.env.REMINDER_MIN_HOURS || 24)
  return Date.now() - lastReminderAt.getTime() >= minHours * 60 * 60 * 1000
}

/**
 * Sends upcoming/overdue reminders for review invitations and author revisions.
 * Safe to run daily via cron (`npm run reminders`) or the in-process scheduler.
 */
export async function runDeadlineReminders(): Promise<ReminderRunResult> {
  const warnDays = Number(process.env.REMINDER_DAYS_BEFORE || 3)
  const today = startOfDay(new Date())
  const warnUntil = daysFromNow(warnDays)

  const result: ReminderRunResult = {
    reviewerUpcoming: 0,
    reviewerOverdue: 0,
    editorOverdueNotices: 0,
    authorUpcoming: 0,
    authorOverdue: 0,
    markedOverdue: 0,
  }

  const openInvitations = await prisma.reviewInvitation.findMany({
    where: {
      status: { in: ['sent', 'accepted', 'overdue'] },
      review: null,
      manuscript: {
        status: { in: ['under_review', 'revision_requested'] },
      },
    },
    include: {
      reviewer: { select: { name: true, email: true } },
      manuscript: {
        select: {
          id: true,
          number: true,
          title: true,
          journal: { select: { name: true } },
        },
      },
    },
  })

  for (const invitation of openInvitations) {
    const deadlineDay = startOfDay(invitation.deadline)
    const isOverdue = deadlineDay.getTime() < today.getTime()
    const isUpcoming =
      !isOverdue &&
      deadlineDay.getTime() <= warnUntil.getTime()

    // Only unanswered invitations become "overdue" so accepted reviewers can still submit.
    if (isOverdue && invitation.status === 'sent') {
      await prisma.reviewInvitation.update({
        where: { id: invitation.id },
        data: { status: 'overdue' },
      })
      result.markedOverdue += 1
      invitation.status = 'overdue'
    }

    if (!isOverdue && !isUpcoming) continue
    if (!canSendReminder(invitation.lastReminderAt, invitation.reminderCount)) {
      continue
    }

    const deadline = isoDate(invitation.deadline)
    const kind = isOverdue ? 'overdue' : 'upcoming'

    notifyReviewerDeadlineReminder({
      reviewerEmail: invitation.reviewer.email,
      reviewerName: invitation.reviewer.name,
      number: invitation.manuscript.number,
      title: invitation.manuscript.title,
      journalName: invitation.manuscript.journal.name,
      deadline,
      kind,
      status: invitation.status as 'sent' | 'accepted' | 'overdue',
    })

    if (isOverdue) {
      notifyEditorReviewOverdue({
        manuscriptId: invitation.manuscript.id,
        number: invitation.manuscript.number,
        title: invitation.manuscript.title,
        journalName: invitation.manuscript.journal.name,
        reviewerName: invitation.reviewer.name,
        deadline,
      })
      result.reviewerOverdue += 1
      result.editorOverdueNotices += 1
    } else {
      result.reviewerUpcoming += 1
    }

    await prisma.reviewInvitation.update({
      where: { id: invitation.id },
      data: {
        lastReminderAt: new Date(),
        reminderCount: { increment: 1 },
      },
    })

    await prisma.activityEvent.create({
      data: {
        manuscriptId: invitation.manuscriptId,
        label: isOverdue
          ? 'Review reminder (overdue)'
          : 'Review reminder (upcoming)',
        detail: `Reminder sent to ${invitation.reviewer.name} (due ${deadline}).`,
      },
    })
  }

  const revisionManuscripts = await prisma.manuscript.findMany({
    where: {
      status: { in: ['revision_requested', 'formatting_requested'] },
      revisionDueAt: { not: null },
    },
    select: {
      id: true,
      number: true,
      title: true,
      revisionDueAt: true,
      lastRevisionReminderAt: true,
      journal: { select: { name: true } },
    },
  })

  for (const manuscript of revisionManuscripts) {
    if (!manuscript.revisionDueAt) continue
    const dueDay = startOfDay(manuscript.revisionDueAt)
    const isOverdue = dueDay.getTime() < today.getTime()
    const isUpcoming = !isOverdue && dueDay.getTime() <= warnUntil.getTime()
    if (!isOverdue && !isUpcoming) continue
    if (!canSendReminder(manuscript.lastRevisionReminderAt, 0)) continue

    const revisionDueAt = isoDate(manuscript.revisionDueAt)
    notifyAuthorRevisionReminder({
      manuscriptId: manuscript.id,
      number: manuscript.number,
      title: manuscript.title,
      journalName: manuscript.journal.name,
      revisionDueAt,
      kind: isOverdue ? 'overdue' : 'upcoming',
    })

    if (isOverdue) result.authorOverdue += 1
    else result.authorUpcoming += 1

    await prisma.manuscript.update({
      where: { id: manuscript.id },
      data: { lastRevisionReminderAt: new Date() },
    })

    await prisma.activityEvent.create({
      data: {
        manuscriptId: manuscript.id,
        label: isOverdue
          ? 'Author revision reminder (overdue)'
          : 'Author revision reminder (upcoming)',
        detail: `Revision reminder sent (due ${revisionDueAt}).`,
      },
    })
  }

  return result
}
