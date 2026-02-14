import { useRef, useCallback, useState } from 'react';
import type { useTimer } from '../hooks/useTimer';
import {
  formatTime,
  formatCost,
  isOvertime,
  overtimeSeconds,
  remainingSeconds,
  taskCost,
  progress,
} from '../models/TaskModel';

type Timer = ReturnType<typeof useTimer>;

export function OverlayTimerView({ timer, onClose }: { timer: Timer; onClose: () => void }) {
  const task = timer.activeTask;
  const overlayRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 16, y: 16 });
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    overlayRef.current?.setPointerCapture(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPos({ x: dragState.current.origX + dx, y: dragState.current.origY + dy });
  }, []);

  const onPointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  return (
    <div
      ref={overlayRef}
      className="overlay-timer"
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {task ? (
        <>
          <div className="overlay-header">
            <span className="overlay-task-name">{task.name}</span>
            <button className="overlay-close-btn" onClick={onClose}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 2l6 6M8 2l-6 6" />
              </svg>
            </button>
          </div>

          <div className="overlay-body">
            <span className={`overlay-time ${isOvertime(task) ? 'text-red' : ''}`}>
              {formatTime(isOvertime(task) ? overtimeSeconds(task) : remainingSeconds(task))}
            </span>
            <span className="overlay-cost">{formatCost(taskCost(task))}</span>
            <span className="overlay-spacer" />
            <button
              className="overlay-ctrl-btn"
              onClick={() => (timer.isRunning ? timer.pauseTimer() : timer.startTimer())}
            >
              {timer.isRunning ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="var(--accent)">
                  <rect x="3" y="2" width="3" height="10" rx="0.5" />
                  <rect x="8" y="2" width="3" height="10" rx="0.5" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="var(--accent)">
                  <path d="M3 1.5v11l9-5.5z" />
                </svg>
              )}
            </button>
            <button className="overlay-ctrl-btn" onClick={() => timer.completeTask(task.id)}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#34c759" strokeWidth="2">
                <path d="M3 7l3 3 5-6" />
              </svg>
            </button>
          </div>

          <div className="overlay-progress-track">
            <div
              className={`overlay-progress-fill ${isOvertime(task) ? 'overtime' : ''}`}
              style={{ width: `${progress(task) * 100}%` }}
            />
          </div>
        </>
      ) : (
        <div className="overlay-empty">
          <span>タスク未選択</span>
          <button className="overlay-close-btn" onClick={onClose}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 2l6 6M8 2l-6 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
