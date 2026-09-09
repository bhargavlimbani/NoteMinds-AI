import { prisma } from '../config/prisma.js';
import { createLogger } from '../config/logger.js';
import { mcpClient } from '../mcp/client/client.js';
import { generateText, isAIConfigured } from '../ai/gemini.js';
import { RECOMMENDATION_SYSTEM_PROMPT, buildRecommendationPrompt } from '../ai/prompts.js';
import { getProgressOverview, type ProgressOverview } from './progress.service.js';

const log = createLogger('recommendation');

export interface FocusArea {
  priority: number;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  unitId: string;
  unitName: string;
  completion: number;
  quizAverage: number | null;
  quizAttempts: number;
  lastStudiedAt: string | null;
  pendingTopics: string[];
  reasons: string[];
  action: string;
  score: number;
}

/**
 * Rule-based analysis: ranks units by how much attention they need.
 * Lower completion, weaker/missing quiz results, pending topics and units
 * not studied recently all increase the score.
 */
export function rankFocusAreas(overview: ProgressOverview, limit = 4): FocusArea[] {
  const now = Date.now();
  const areas: FocusArea[] = [];

  for (const subject of overview.subjects) {
    for (const unit of subject.units) {
      const reasons: string[] = [];
      let score = 100 - unit.completion;

      if (unit.completion === 0) reasons.push('Not started yet (0% complete)');
      else if (unit.completion < 50) reasons.push(`Only ${unit.completion}% complete`);
      else if (unit.completion < 100) reasons.push(`${unit.completion}% complete`);

      if (unit.quiz.averagePercentage === null) {
        score += 15;
        reasons.push('No quiz attempted yet');
      } else {
        score += (100 - unit.quiz.averagePercentage) * 0.6;
        if (unit.quiz.averagePercentage < 60) reasons.push(`Quiz average is low (${unit.quiz.averagePercentage}%)`);
        else if (unit.quiz.averagePercentage < 80) reasons.push(`Quiz average is ${unit.quiz.averagePercentage}%`);
      }

      const days = unit.lastStudiedAt ? (now - Date.parse(unit.lastStudiedAt)) / 86_400_000 : null;
      if (days !== null && days > 7 && unit.completion < 100) {
        score += Math.min(20, days);
        reasons.push(`Last studied ${Math.round(days)} days ago`);
      }

      const pending = unit.topics.incompleteTopics;
      if (pending.length) reasons.push(`Pending topics: ${pending.slice(0, 3).join(', ')}${pending.length > 3 ? '…' : ''}`);

      const mastered = unit.completion >= 100 && (unit.quiz.averagePercentage ?? 100) >= 80;
      if (mastered) score -= 60;

      let action: string;
      if (pending.length) action = `Study "${pending[0]}" in ${unit.unitName}`;
      else if (unit.quiz.averagePercentage === null) action = `Take a quiz on ${unit.unitName} to check your understanding`;
      else if (unit.quiz.averagePercentage < 70) action = `Revise ${unit.unitName} and retake the quiz`;
      else if (unit.completion < 100) action = `Finish the remaining parts of ${unit.unitName}`;
      else action = `Quick revision of ${unit.unitName}`;

      areas.push({
        priority: 0,
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        subjectColor: subject.color,
        unitId: unit.unitId,
        unitName: unit.unitName,
        completion: unit.completion,
        quizAverage: unit.quiz.averagePercentage,
        quizAttempts: unit.quiz.attempts,
        lastStudiedAt: unit.lastStudiedAt,
        pendingTopics: pending,
        reasons,
        action,
        score: Math.round(score),
      });
    }
  }

  return areas
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((area, index) => ({ ...area, priority: index + 1 }));
}

/** Progress is fetched through the MCP server (same path Gemini uses) to demonstrate the MCP flow. */
export async function fetchProgressViaMcp(userId: string) {
  const started = Date.now();
  try {
    const outcome = await mcpClient.callTool('get_progress', { userId });
    if (outcome.isError) throw new Error(outcome.text);
    return { overview: outcome.data as ProgressOverview, source: 'mcp' as const, durationMs: Date.now() - started };
  } catch (error) {
    log.warn('MCP get_progress failed, reading progress directly', error instanceof Error ? error.message : error);
    return { overview: await getProgressOverview(userId), source: 'direct' as const, durationMs: Date.now() - started };
  }
}

export interface RecommendationResult {
  generatedBy: 'gemini' | 'rules';
  summary: string;
  focusAreas: FocusArea[];
  overall: number;
  totals: ProgressOverview['totals'];
  dataSource: 'mcp' | 'direct';
  mcpTool: { name: string; durationMs: number };
  generatedAt: string;
}

function buildRuleSummary(areas: FocusArea[], overview: ProgressOverview): string {
  if (areas.length === 0) {
    return 'You have no units yet. Create a subject, add its units and topics, upload your notes and I will recommend what to study next.';
  }
  const [top, ...rest] = areas;
  const lines = [
    `**Study ${top.subjectName} → ${top.unitName} first.** ${top.reasons.join('. ')}.`,
    '',
    `- ${top.action}`,
    ...rest.slice(0, 2).map((a) => `- Next: ${a.subjectName} → ${a.unitName} (${a.reasons[0] ?? 'needs attention'})`),
    '',
    `Your overall progress is ${overview.overall}%${overview.totals.averageQuizScore !== null ? ` with an average quiz score of ${overview.totals.averageQuizScore}%` : ''}. Keep going!`,
  ];
  return lines.join('\n');
}

/** Personalised recommendation: MCP progress data -> rule ranking -> Gemini narrative (optional). */
export async function getRecommendations(userId: string, options: { useAI?: boolean } = {}): Promise<RecommendationResult> {
  const { overview, source, durationMs } = await fetchProgressViaMcp(userId);
  const focusAreas = rankFocusAreas(overview, 4);
  let summary = buildRuleSummary(focusAreas, overview);
  let generatedBy: RecommendationResult['generatedBy'] = 'rules';

  if (options.useAI !== false && isAIConfigured() && focusAreas.length > 0) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      const analysis = {
        overallProgress: overview.overall,
        totals: overview.totals,
        focusAreas: focusAreas.map((a) => ({
          priority: a.priority,
          subject: a.subjectName,
          unit: a.unitName,
          completion: a.completion,
          quizAverage: a.quizAverage,
          quizAttempts: a.quizAttempts,
          lastStudiedAt: a.lastStudiedAt,
          pendingTopics: a.pendingTopics.slice(0, 5),
          reasons: a.reasons,
        })),
        subjects: overview.subjects.map((s) => ({ name: s.subjectName, progress: s.progress, quizAverage: s.quizAverage })),
      };
      const text = await generateText({
        systemInstruction: RECOMMENDATION_SYSTEM_PROMPT,
        prompt: buildRecommendationPrompt({ studentName: user?.name ?? 'Student', analysis }),
        temperature: 0.5,
      });
      if (text) {
        summary = text;
        generatedBy = 'gemini';
      }
    } catch (error) {
      log.warn('Gemini recommendation failed, using rule-based summary', error instanceof Error ? error.message : error);
    }
  }

  return {
    generatedBy,
    summary,
    focusAreas,
    overall: overview.overall,
    totals: overview.totals,
    dataSource: source,
    mcpTool: { name: 'get_progress', durationMs },
    generatedAt: new Date().toISOString(),
  };
}
