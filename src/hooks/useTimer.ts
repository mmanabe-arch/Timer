import { useState, useRef, useCallback, useEffect } from 'react';
import {
  TaskItem,
  createTask,
  HOURLY_RATE,
  TaskCategory,
  flattenTasksDFS,
  getSortedChildren,
  normalizeTasks,
} from '../models/TaskModel';
import {
  saveTasks,
  loadTodayTasks,
  hasTodayTasksKey,
  loadCarryoverTasks,
  autoSaveYesterdaySummary,
  saveDailySummary,
} from '../models/storage';

export type ViewMode = 'normal' | 'compact' | 'summary' | 'history';

function initTasks(): TaskItem[] {
  autoSaveYesterdaySummary();

  // If today's localStorage key exists (even as empty array),
  // the user has intentionally set up today's tasks — do NOT fall back to carryover.
  if (hasTodayTasksKey()) {
    return normalizeTasks(loadTodayTasks());
  }

  return normalizeTasks(loadCarryoverTasks());
}

export function useTimer() {
  const [tasks, setTasks] = useState<TaskItem[]>(initTasks);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('normal');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ref so completeTask can read latest tasks without stale closure
  const tasksRef = useRef<TaskItem[]>(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const activeTask = tasks.find((t) => t.id === activeTaskId) ?? null;

  const totalElapsedSeconds = tasks.reduce((sum, t) => sum + t.elapsedSeconds, 0);
  const totalEstimatedSeconds = tasks.reduce((sum, t) => sum + t.estimatedMinutes * 60, 0);
  const totalCost = (totalElapsedSeconds / 3600) * HOURLY_RATE;
  const totalEstimatedCost = (totalEstimatedSeconds / 3600) * HOURLY_RATE;
  const completedTaskCount = tasks.filter((t) => t.isCompleted).length;

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    if (tasks.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    saveDailySummary({
      date: today,
      tasks,
      totalElapsedSeconds: tasks.reduce((s, t) => s + t.elapsedSeconds, 0),
      totalEstimatedSeconds: tasks.reduce((s, t) => s + t.estimatedMinutes * 60, 0),
      completedCount: tasks.filter((t) => t.isCompleted).length,
      totalCount: tasks.length,
    });
  }, [tasks]);

  const stopInterval = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startInterval = useCallback(
    (taskId: string) => {
      stopInterval();
      timerRef.current = setInterval(() => {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, elapsedSeconds: t.elapsedSeconds + 1 } : t,
          ),
        );
      }, 1000);
    },
    [stopInterval],
  );

  // ─── Add root task ───────────────────────────────────────────────────────
  const addTask = useCallback(
    (name: string, estimatedMinutes: number, category?: TaskCategory) => {
      setTasks((prev) => {
        const roots = prev.filter((t) => !t.parentId);
        const maxOrder = roots.reduce((m, t) => Math.max(m, t.order ?? 0), -1);
        return [...prev, createTask(name, estimatedMinutes, category, undefined, maxOrder + 1)];
      });
    },
    [],
  );

  // ─── Add sub-task ────────────────────────────────────────────────────────
  const addSubTask = useCallback(
    (parentId: string, name: string, estimatedMinutes: number, category?: TaskCategory) => {
      setTasks((prev) => {
        const siblings = getSortedChildren(parentId, prev);
        const maxOrder = siblings.reduce((m, t) => Math.max(m, t.order ?? 0), -1);
        return [
          ...prev,
          createTask(name, estimatedMinutes, category, parentId, maxOrder + 1),
        ];
      });
    },
    [],
  );

  // ─── Delete task (cascades to all descendants) ────────────────────────────
  const deleteTask = useCallback(
    (id: string) => {
      setTasks((prev) => {
        // Collect all descendant IDs using BFS
        const toDelete = new Set<string>();
        const queue = [id];
        while (queue.length > 0) {
          const cur = queue.pop()!;
          toDelete.add(cur);
          for (const t of prev) {
            if (t.parentId === cur) queue.push(t.id);
          }
        }

        setActiveTaskId((activeId) => {
          if (activeId && toDelete.has(activeId)) {
            stopInterval();
            setIsRunning(false);
            return null;
          }
          return activeId;
        });

        return prev.filter((t) => !toDelete.has(t.id));
      });
    },
    [stopInterval],
  );

  // ─── Select / toggle task ────────────────────────────────────────────────
  const selectTask = useCallback(
    (id: string) => {
      setActiveTaskId((currentActiveId) => {
        if (currentActiveId === id) {
          setIsRunning((running) => {
            if (running) {
              stopInterval();
              return false;
            } else {
              startInterval(id);
              return true;
            }
          });
          return currentActiveId;
        } else {
          stopInterval();
          startInterval(id);
          setIsRunning(true);
          return id;
        }
      });
    },
    [stopInterval, startInterval],
  );

  const pauseTimer = useCallback(() => {
    stopInterval();
    setIsRunning(false);
  }, [stopInterval]);

  const startTimer = useCallback(() => {
    if (activeTaskId) {
      startInterval(activeTaskId);
      setIsRunning(true);
    }
  }, [activeTaskId, startInterval]);

  const stopTimer = useCallback(() => {
    stopInterval();
    setIsRunning(false);
    setActiveTaskId(null);
  }, [stopInterval]);

  // ─── Complete task → auto-advance to next in DFS order ───────────────────
  const completeTask = useCallback(
    (id: string) => {
      let nextTaskId: string | null = null;

      setTasks((prev) => {
        const updated = prev.map((t) => (t.id === id ? { ...t, isCompleted: true } : t));
        const flat = flattenTasksDFS(updated);
        const idx = flat.findIndex((t) => t.id === id);
        const next = flat.slice(idx + 1).find((t) => !t.isCompleted);
        nextTaskId = next?.id ?? null;
        return updated;
      });

      // Schedule auto-start after state is committed
      setTimeout(() => {
        if (nextTaskId) {
          startInterval(nextTaskId);
          setActiveTaskId(nextTaskId);
          setIsRunning(true);
        } else {
          stopInterval();
          setIsRunning(false);
          setActiveTaskId(null);
        }
      }, 0);
    },
    [stopInterval, startInterval],
  );

  // ─── Reorder tasks within the same parent group ──────────────────────────
  const reorderTasks = useCallback(
    (draggedId: string, targetId: string, position: 'before' | 'after') => {
      setTasks((prev) => {
        const dragged = prev.find((t) => t.id === draggedId);
        const target = prev.find((t) => t.id === targetId);
        if (!dragged || !target || dragged.id === target.id) return prev;
        if (dragged.parentId !== target.parentId) return prev;

        const siblings = getSortedChildren(dragged.parentId, prev);
        const withoutDragged = siblings.filter((t) => t.id !== draggedId);
        const targetIdx = withoutDragged.findIndex((t) => t.id === targetId);
        const insertIdx = position === 'before' ? targetIdx : targetIdx + 1;

        const newSiblings = [
          ...withoutDragged.slice(0, insertIdx),
          dragged,
          ...withoutDragged.slice(insertIdx),
        ];

        const orderMap = new Map(newSiblings.map((t, i) => [t.id, i]));
        return prev.map((t) =>
          orderMap.has(t.id) ? { ...t, order: orderMap.get(t.id)! } : t,
        );
      });
    },
    [],
  );

  const rateTask = useCallback((id: string, rating: 1 | 2 | 3 | 4 | 5) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, qualityRating: rating } : t)));
  }, []);

  const updateEstimate = useCallback((id: string, newMinutes: number) => {
    if (newMinutes <= 0) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, estimatedMinutes: newMinutes } : t)),
    );
  }, []);

  return {
    tasks,
    activeTask,
    activeTaskId,
    isRunning,
    viewMode,
    totalElapsedSeconds,
    totalEstimatedSeconds,
    totalCost,
    totalEstimatedCost,
    completedTaskCount,
    setViewMode,
    addTask,
    addSubTask,
    deleteTask,
    selectTask,
    startTimer,
    pauseTimer,
    stopTimer,
    completeTask,
    rateTask,
    updateEstimate,
    reorderTasks,
  };
}
