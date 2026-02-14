import type { TaskItem } from './TaskModel';

export interface DailySummary {
  date: string; // YYYY-MM-DD
  tasks: TaskItem[];
  totalElapsedSeconds: number;
  totalEstimatedSeconds: number;
  completedCount: number;
  totalCount: number;
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

export function loadCarryoverTasks(): TaskItem[] {
  // Check all past dates for incomplete tasks (up to 7 days back)
  const carryover: TaskItem[] = [];

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
        .map((t) => ({
          ...t,
          id: crypto.randomUUID(), // new ID to avoid conflicts
          elapsedSeconds: 0, // reset timer
          isCarryover: true,
          carryoverFrom: key,
        }));
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
  // Also update the index
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

// Auto-save yesterday's summary if not already saved
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
