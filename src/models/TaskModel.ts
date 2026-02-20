export const TASK_CATEGORIES = [
  'dev',      // 開発
  'review',   // レビュー
  'meeting',  // 会議
  'docs',     // 資料作成
  'research', // 調査
  'admin',    // 事務
  'other',    // その他
] as const;

export type TaskCategory = typeof TASK_CATEGORIES[number];

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  dev: '開発',
  review: 'レビュー',
  meeting: '会議',
  docs: '資料作成',
  research: '調査',
  admin: '事務',
  other: 'その他',
};

export const CATEGORY_COLORS: Record<TaskCategory, string> = {
  dev: '#007aff',
  review: '#5856d6',
  meeting: '#ff9500',
  docs: '#34c759',
  research: '#af52de',
  admin: '#8e8e93',
  other: '#636366',
};

export interface TaskItem {
  id: string;
  name: string;
  estimatedMinutes: number;
  elapsedSeconds: number;
  isCompleted: boolean;
  isCarryover?: boolean;
  carryoverFrom?: string; // YYYY-MM-DD
  carryoverDays?: number; // how many days carried over
  qualityRating?: 1 | 2 | 3 | 4 | 5;
  category?: TaskCategory;
  parentId?: string;   // undefined = root task
  order: number;       // sort order within siblings
}

export const HOURLY_RATE = 1200;
export const MAX_DEPTH = 2; // 3 levels: 0 (root), 1, 2

export function createTask(
  name: string,
  estimatedMinutes: number,
  category?: TaskCategory,
  parentId?: string,
  order = 0,
): TaskItem {
  return {
    id: crypto.randomUUID(),
    name,
    estimatedMinutes,
    elapsedSeconds: 0,
    isCompleted: false,
    category: category ?? 'other',
    parentId,
    order,
  };
}

// Return direct children of parentId sorted by order
export function getSortedChildren(parentId: string | undefined, tasks: TaskItem[]): TaskItem[] {
  return tasks
    .filter((t) => t.parentId === parentId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// DFS traversal: root tasks → their children recursively
export function flattenTasksDFS(tasks: TaskItem[]): TaskItem[] {
  const result: TaskItem[] = [];
  function traverse(parentId?: string) {
    for (const t of getSortedChildren(parentId, tasks)) {
      result.push(t);
      traverse(t.id);
    }
  }
  traverse(undefined);
  return result;
}

// Get nesting depth of a task (0=root, 1=child, 2=grandchild)
export function getTaskDepth(taskId: string, tasks: TaskItem[]): number {
  let depth = 0;
  let currentId: string | undefined = taskId;
  const visited = new Set<string>();
  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const task = tasks.find((t) => t.id === currentId);
    if (!task?.parentId) break;
    depth++;
    currentId = task.parentId;
    if (depth >= 3) break;
  }
  return depth;
}

// Normalize tasks from storage: assign order if missing
export function normalizeTasks(tasks: TaskItem[]): TaskItem[] {
  // Group by parentId to assign sequential order
  const counters = new Map<string | undefined, number>();
  return tasks.map((t) => {
    if (t.order != null) return t;
    const key = t.parentId;
    const n = counters.get(key) ?? 0;
    counters.set(key, n + 1);
    return { ...t, order: n };
  });
}

export function estimatedSeconds(task: TaskItem): number {
  return task.estimatedMinutes * 60;
}

export function remainingSeconds(task: TaskItem): number {
  return Math.max(0, estimatedSeconds(task) - task.elapsedSeconds);
}

export function isOvertime(task: TaskItem): boolean {
  return task.elapsedSeconds > estimatedSeconds(task);
}

export function overtimeSeconds(task: TaskItem): number {
  return Math.max(0, task.elapsedSeconds - estimatedSeconds(task));
}

export function taskCost(task: TaskItem): number {
  return (task.elapsedSeconds / 3600) * HOURLY_RATE;
}

export function estimatedCost(task: TaskItem): number {
  return (task.estimatedMinutes / 60) * HOURLY_RATE;
}

export function progress(task: TaskItem): number {
  const est = estimatedSeconds(task);
  if (est <= 0) return 0;
  return Math.min(task.elapsedSeconds / est, 1.0);
}

export function estimationAccuracy(task: TaskItem): number {
  if (task.estimatedMinutes <= 0 || task.elapsedSeconds <= 0) return 1;
  return task.elapsedSeconds / (task.estimatedMinutes * 60);
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatCost(cost: number): string {
  if (cost < 0) {
    return `-¥${Math.abs(Math.round(cost)).toLocaleString()}`;
  }
  return `¥${Math.round(cost).toLocaleString()}`;
}
