import type { TaskItem, TaskCategory } from './TaskModel';
import { CATEGORY_LABELS } from './TaskModel';

export interface DailySummary {
  date: string; // YYYY-MM-DD
  tasks: TaskItem[];
  totalElapsedSeconds: number;
  totalEstimatedSeconds: number;
  completedCount: number;
  totalCount: number;
}

export interface CategoryStats {
  category: TaskCategory;
  label: string;
  count: number;
  avgAccuracy: number; // actual / estimated ratio
  avgQuality: number;
  totalMinutesSpent: number;
}

export interface WeeklyTrend {
  weekLabel: string;
  completionRate: number;
  avgEstimationAccuracy: number;
  avgQuality: number;
  totalTasks: number;
  grade: string;
}

const TASKS_PREFIX = 'tt-tasks-';
const SUMMARY_PREFIX = 'tt-summary-';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// --- Tasks ---

export function saveTasks(tasks: TaskItem[]): void {
  localStorage.setItem(TASKS_PREFIX + todayKey(), JSON.stringify(tasks));
}

export function loadTodayTasks(): TaskItem[] {
  const raw = localStorage.getItem(TASKS_PREFIX + todayKey());
  if (!raw) return [];
  try {
    return JSON.parse(raw) as TaskItem[];
  } catch {
    return [];
  }
}

// Returns true if today's task key exists in localStorage
// (even when the stored array is empty, meaning the user deleted everything intentionally)
export function hasTodayTasksKey(): boolean {
  return localStorage.getItem(TASKS_PREFIX + todayKey()) !== null;
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + 'T00:00:00');
  const b = new Date(dateB + 'T00:00:00');
  return Math.round(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function loadCarryoverTasks(): TaskItem[] {
  const carryover: TaskItem[] = [];
  const today = todayKey();

  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const raw = localStorage.getItem(TASKS_PREFIX + key);
    if (!raw) continue;
    try {
      const tasks = JSON.parse(raw) as TaskItem[];
      const incomplete = tasks
        .filter((t) => !t.isCompleted)
        .map((t) => {
          const origDate = t.carryoverFrom ?? key;
          const days = daysBetween(origDate, today);
          return {
            ...t,
            id: crypto.randomUUID(),
            elapsedSeconds: 0,
            isCarryover: true,
            carryoverFrom: origDate,
            carryoverDays: days,
          };
        });
      carryover.push(...incomplete);
    } catch {
      // skip
    }
  }

  return carryover;
}

// --- Summaries ---

export function saveDailySummary(summary: DailySummary): void {
  localStorage.setItem(SUMMARY_PREFIX + summary.date, JSON.stringify(summary));
  const index = getSummaryIndex();
  if (!index.includes(summary.date)) {
    index.push(summary.date);
    index.sort();
    localStorage.setItem('tt-summary-index', JSON.stringify(index));
  }
}

export function getSummaryIndex(): string[] {
  const raw = localStorage.getItem('tt-summary-index');
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function loadSummary(date: string): DailySummary | null {
  const raw = localStorage.getItem(SUMMARY_PREFIX + date);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DailySummary;
  } catch {
    return null;
  }
}

export function loadAllSummaries(): DailySummary[] {
  return getSummaryIndex()
    .map(loadSummary)
    .filter((s): s is DailySummary => s !== null);
}

export function autoSaveYesterdaySummary(): void {
  const yKey = yesterdayKey();
  if (localStorage.getItem(SUMMARY_PREFIX + yKey)) return;

  const raw = localStorage.getItem(TASKS_PREFIX + yKey);
  if (!raw) return;
  try {
    const tasks = JSON.parse(raw) as TaskItem[];
    if (tasks.length === 0) return;
    const summary: DailySummary = {
      date: yKey,
      tasks,
      totalElapsedSeconds: tasks.reduce((s, t) => s + t.elapsedSeconds, 0),
      totalEstimatedSeconds: tasks.reduce((s, t) => s + t.estimatedMinutes * 60, 0),
      completedCount: tasks.filter((t) => t.isCompleted).length,
      totalCount: tasks.length,
    };
    saveDailySummary(summary);
  } catch {
    // skip
  }
}

// --- Estimation History by Category ---

export function getEstimationHint(category: TaskCategory): { avgMinutes: number; accuracy: number; count: number } | null {
  const summaries = loadAllSummaries();
  const matchingTasks: TaskItem[] = [];

  for (const s of summaries) {
    for (const t of s.tasks) {
      if (t.category === category && t.isCompleted && t.elapsedSeconds > 0) {
        matchingTasks.push(t);
      }
    }
  }

  // Also check today's saved tasks
  const todayTasks = loadTodayTasks();
  for (const t of todayTasks) {
    if (t.category === category && t.isCompleted && t.elapsedSeconds > 0) {
      matchingTasks.push(t);
    }
  }

  if (matchingTasks.length < 2) return null;

  const avgMinutes = matchingTasks.reduce((s, t) => s + t.elapsedSeconds / 60, 0) / matchingTasks.length;
  const accuracy = matchingTasks.reduce((s, t) => s + (t.elapsedSeconds / (t.estimatedMinutes * 60)), 0) / matchingTasks.length;

  return { avgMinutes: Math.round(avgMinutes), accuracy: Math.round(accuracy * 100) / 100, count: matchingTasks.length };
}

// --- Category Stats from all history ---

export function getCategoryStats(): CategoryStats[] {
  const summaries = loadAllSummaries();
  const byCategory = new Map<TaskCategory, TaskItem[]>();

  for (const s of summaries) {
    for (const t of s.tasks) {
      const cat = t.category ?? 'other';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(t);
    }
  }

  const stats: CategoryStats[] = [];
  for (const [cat, tasks] of byCategory) {
    const completed = tasks.filter((t) => t.isCompleted && t.elapsedSeconds > 0);
    const rated = tasks.filter((t) => t.qualityRating);
    stats.push({
      category: cat,
      label: CATEGORY_LABELS[cat],
      count: tasks.length,
      avgAccuracy: completed.length > 0
        ? completed.reduce((s, t) => s + t.elapsedSeconds / (t.estimatedMinutes * 60), 0) / completed.length
        : 1,
      avgQuality: rated.length > 0
        ? rated.reduce((s, t) => s + (t.qualityRating ?? 0), 0) / rated.length
        : 0,
      totalMinutesSpent: Math.round(tasks.reduce((s, t) => s + t.elapsedSeconds / 60, 0)),
    });
  }

  return stats.sort((a, b) => b.count - a.count);
}

// --- Weekly Trend Analysis ---

export function getWeeklyTrends(weeksBack: number = 4): WeeklyTrend[] {
  const summaries = loadAllSummaries();
  if (summaries.length === 0) return [];

  // Group summaries by ISO week
  const weekMap = new Map<string, DailySummary[]>();
  for (const s of summaries) {
    const d = new Date(s.date + 'T00:00:00');
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay() + 1); // Monday
    const key = weekStart.toISOString().slice(0, 10);
    if (!weekMap.has(key)) weekMap.set(key, []);
    weekMap.get(key)!.push(s);
  }

  const weeks = [...weekMap.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, weeksBack);

  return weeks.map(([weekKey, days]) => {
    const allTasks = days.flatMap((d) => d.tasks);
    const completed = allTasks.filter((t) => t.isCompleted);
    const completionRate = allTasks.length > 0 ? completed.length / allTasks.length : 0;

    const withTime = completed.filter((t) => t.elapsedSeconds > 0);
    const avgAcc = withTime.length > 0
      ? withTime.reduce((s, t) => s + t.elapsedSeconds / (t.estimatedMinutes * 60), 0) / withTime.length
      : 1;

    const rated = allTasks.filter((t) => t.qualityRating);
    const avgQ = rated.length > 0
      ? rated.reduce((s, t) => s + (t.qualityRating ?? 0), 0) / rated.length
      : 0;

    const d = new Date(weekKey + 'T00:00:00');
    const weekLabel = `${d.getMonth() + 1}/${d.getDate()}〜`;

    // Simple grade
    let score = completionRate * 40 + Math.max(0, 1 - Math.abs(avgAcc - 1)) * 30 + (avgQ / 5) * 30;
    let grade = 'F';
    if (score >= 85) grade = 'S';
    else if (score >= 70) grade = 'A';
    else if (score >= 55) grade = 'B';
    else if (score >= 40) grade = 'C';
    else if (score >= 25) grade = 'D';

    return {
      weekLabel,
      completionRate,
      avgEstimationAccuracy: avgAcc,
      avgQuality: avgQ,
      totalTasks: allTasks.length,
      grade,
    };
  });
}

// --- Predictive Warning ---

export interface PredictiveWarning {
  type: 'danger' | 'warning' | 'ok';
  message: string;
  predictedCompletion: number; // expected tasks to finish
}

export function getPredictiveWarning(tasks: TaskItem[]): PredictiveWarning | null {
  if (tasks.length === 0) return null;

  const completed = tasks.filter((t) => t.isCompleted);
  const remaining = tasks.filter((t) => !t.isCompleted);
  if (remaining.length === 0) return null;

  const totalElapsed = tasks.reduce((s, t) => s + t.elapsedSeconds, 0);
  if (totalElapsed < 300) return null; // wait at least 5 min of activity

  // Time-based prediction: if all remaining tasks took avg time, how much more?
  const avgSecsPerTask = completed.length > 0
    ? completed.reduce((s, t) => s + t.elapsedSeconds, 0) / completed.length
    : totalElapsed / Math.max(1, tasks.length - remaining.length + 1);

  const completionRate = tasks.length > 0 ? completed.length / tasks.length : 0;

  // Check pace: how many tasks can reasonably finish in remaining work hours (~8hr day)
  const WORK_DAY_SECS = 8 * 3600;
  const secsLeft = Math.max(0, WORK_DAY_SECS - totalElapsed);
  const tasksCanFinish = avgSecsPerTask > 0 ? Math.floor(secsLeft / avgSecsPerTask) : remaining.length;
  const predictedTotal = completed.length + Math.min(tasksCanFinish, remaining.length);

  if (completionRate >= 0.8) {
    return null; // mostly done, no warning needed
  }

  if (predictedTotal < tasks.length * 0.5) {
    return {
      type: 'danger',
      message: `このペースでは${predictedTotal}/${tasks.length}タスクしか完了できません。優先順位を見直してください。`,
      predictedCompletion: predictedTotal,
    };
  }

  if (predictedTotal < tasks.length * 0.8) {
    return {
      type: 'warning',
      message: `現在のペースだと${predictedTotal}/${tasks.length}タスク完了の見込み。ペースアップが必要です。`,
      predictedCompletion: predictedTotal,
    };
  }

  return null;
}

// --- Date Utilities ---

export function formatDateJP(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
}

export function getWeekNumber(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00');
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
  return Math.ceil((d.getDate() + firstDay.getDay()) / 7);
}

export function getMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}
