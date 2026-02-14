export interface TaskItem {
  id: string;
  name: string;
  estimatedMinutes: number;
  elapsedSeconds: number;
  isCompleted: boolean;
  isCarryover?: boolean;
  carryoverFrom?: string; // YYYY-MM-DD
}

export const HOURLY_RATE = 1200;

export function createTask(name: string, estimatedMinutes: number): TaskItem {
  return {
    id: crypto.randomUUID(),
    name,
    estimatedMinutes,
    elapsedSeconds: 0,
    isCompleted: false,
  };
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
