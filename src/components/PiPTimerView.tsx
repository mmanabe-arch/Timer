import { createPortal } from 'react-dom';
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

interface PiPTimerViewProps {
  timer: Timer;
  container: HTMLDivElement;
  onClose: () => void;
}

export function PiPTimerView({ timer, container, onClose }: PiPTimerViewProps) {
  const task = timer.activeTask;

  const content = (
    <div className="pip-timer">
      {task ? (
        <>
          {/* Task name + close */}
          <div className="pip-header">
            <span className="pip-task-name">{task.name}</span>
            <button className="pip-close-btn" onClick={onClose} title="閉じる">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 2l6 6M8 2l-6 6" />
              </svg>
            </button>
          </div>

          {/* Time + cost */}
          <div className="pip-body">
            <span className={`pip-time ${isOvertime(task) ? 'text-red' : ''}`}>
              {formatTime(isOvertime(task) ? overtimeSeconds(task) : remainingSeconds(task))}
            </span>
            <span className="pip-cost">{formatCost(taskCost(task))}</span>
            <span className="pip-spacer" />
            <button
              className="pip-ctrl-btn"
              onClick={() => (timer.isRunning ? timer.pauseTimer() : timer.startTimer())}
              title={timer.isRunning ? '一時停止' : '再開'}
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
            <button
              className="pip-ctrl-btn"
              onClick={() => timer.completeTask(task.id)}
              title="完了"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#34c759" strokeWidth="2">
                <path d="M3 7l3 3 5-6" />
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="pip-progress-track">
            <div
              className={`pip-progress-fill ${isOvertime(task) ? 'overtime' : ''}`}
              style={{ width: `${progress(task) * 100}%` }}
            />
          </div>
        </>
      ) : (
        <div className="pip-empty">
          <span>タスク未選択</span>
          <button className="pip-close-btn" onClick={onClose} title="閉じる">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 2l6 6M8 2l-6 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );

  return createPortal(content, container);
}
