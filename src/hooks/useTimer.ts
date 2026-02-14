import { useState, useRef, useCallback } from 'react';
import { TaskItem, createTask, HOURLY_RATE } from '../models/TaskModel';

export type ViewMode = 'normal' | 'compact' | 'summary';

export function useTimer() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('normal');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeTask = tasks.find((t) => t.id === activeTaskId) ?? null;

  const totalElapsedSeconds = tasks.reduce((sum, t) => sum + t.elapsedSeconds, 0);
  const totalEstimatedSeconds = tasks.reduce((sum, t) => sum + t.estimatedMinutes * 60, 0);
  const totalCost = (totalElapsedSeconds / 3600) * HOURLY_RATE;
  const totalEstimatedCost = (totalEstimatedSeconds / 3600) * HOURLY_RATE;
  const completedTaskCount = tasks.filter((t) => t.isCompleted).length;

  const stopInterval = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startInterval = useCallback((taskId: string) => {
    stopInterval();
    timerRef.current = setInterval(() => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, elapsedSeconds: t.elapsedSeconds + 1 } : t
        )
      );
    }, 1000);
  }, [stopInterval]);

  const addTask = useCallback((name: string, estimatedMinutes: number) => {
    setTasks((prev) => [...prev, createTask(name, estimatedMinutes)]);
  }, []);

  const deleteTask = useCallback((id: string) => {
    setActiveTaskId((prev) => {
      if (prev === id) {
        stopInterval();
        setIsRunning(false);
        return null;
      }
      return prev;
    });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, [stopInterval]);

  const selectTask = useCallback((id: string) => {
    setActiveTaskId((currentActiveId) => {
      if (currentActiveId === id) {
        // Toggle pause/resume
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
        // Switch task
        stopInterval();
        startInterval(id);
        setIsRunning(true);
        return id;
      }
    });
  }, [stopInterval, startInterval]);

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

  const completeTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isCompleted: true } : t))
    );
    setActiveTaskId((prev) => {
      if (prev === id) {
        stopInterval();
        setIsRunning(false);
        return null;
      }
      return prev;
    });
  }, [stopInterval]);

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
    deleteTask,
    selectTask,
    startTimer,
    pauseTimer,
    stopTimer,
    completeTask,
  };
}
