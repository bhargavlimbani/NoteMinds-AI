import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { truncate } from '../utils/text.js';
import { getProgressOverview } from './progress.service.js';
import { rankFocusAreas } from './recommendation.service.js';
import { getRecentActivities } from './activity.service.js';
import { getQuizHistory } from './quiz.service.js';

/** Aggregates everything the dashboard shows in a single request. */
export async function getDashboard(userId: string) {
  const [user, overview, totalNotes, activities, quizHistory, conversations] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, createdAt: true } }),
    getProgressOverview(userId),
    prisma.note.count({ where: { userId } }),
    getRecentActivities(userId, 8),
    getQuizHistory(userId, 5),
    prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true, role: true } } },
    }),
  ]);
  if (!user) throw AppError.unauthorized();

  const focusAreas = rankFocusAreas(overview, 3);

  const recentlyStudied = overview.subjects
    .flatMap((s) =>
      s.units.map((u) => ({
        subjectId: s.subjectId,
        subjectName: s.subjectName,
        subjectColor: s.color,
        unitId: u.unitId,
        unitName: u.unitName,
        completion: u.completion,
        lastStudiedAt: u.lastStudiedAt,
      })),
    )
    .filter((u) => u.lastStudiedAt)
    .sort((a, b) => Date.parse(b.lastStudiedAt as string) - Date.parse(a.lastStudiedAt as string))
    .slice(0, 5);

  // Activity per day for the last 7 days (for the activity chart).
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);
  const recentActivity = await prisma.activity.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { createdAt: true, type: true },
  });
  const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(since);
    day.setDate(since.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    const items = recentActivity.filter((a) => a.createdAt.toISOString().slice(0, 10) === key);
    return {
      date: key,
      label: day.toLocaleDateString('en-US', { weekday: 'short' }),
      total: items.length,
      quizzes: items.filter((a) => a.type === 'QUIZ_COMPLETED').length,
      chats: items.filter((a) => a.type === 'CHAT').length,
    };
  });

  return {
    user,
    stats: {
      totalSubjects: overview.totals.subjects,
      totalUnits: overview.totals.units,
      completedUnits: overview.totals.completedUnits,
      totalNotes,
      quizAttempts: overview.totals.quizAttempts,
      averageQuizScore: overview.totals.averageQuizScore,
      overallProgress: overview.overall,
      totalTopics: overview.totals.topics,
      completedTopics: overview.totals.completedTopics,
    },
    subjects: overview.subjects.map((s) => ({
      id: s.subjectId,
      name: s.subjectName,
      code: s.code,
      color: s.color,
      progress: s.progress,
      quizAverage: s.quizAverage,
      unitCount: s.units.length,
    })),
    recommendedNext: focusAreas[0] ?? null,
    focusAreas,
    recentlyStudied,
    recentActivities: activities,
    recentQuizzes: quizHistory,
    recentConversations: conversations.map((c) => ({
      id: c.id,
      title: c.title,
      updatedAt: c.updatedAt,
      preview: c.messages[0] ? truncate(c.messages[0].content, 100) : null,
    })),
    weeklyActivity,
  };
}
