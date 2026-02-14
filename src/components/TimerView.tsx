import type { useTimer } from '../hooks/useTimer';
import type { TaskItem } from '../models/TaskModel';
import {
  formatTime,
  formatCost,
  isOvertime,
  overtimeSeconds,
  remainingSeconds,
  taskCost,
  estimatedCost,
  progress,
} from '../models/TaskModel';

type Timer = ReturnType<typeof useTimer>;

export function TimerView({ timer, task }: { timer: Timer; task: TaskItem }) {
  const overtime = isOvertime(task);
  const displaySeconds = overtime ? overtimeSeconds(task) : remainingSeconds(task);
  const progressValue = progress(task);

  return (
    <div className="timer-section">
      <div className="timer-task-name">{task.name}</div>

      <div className="timer-display">
        <div className="timer-time-block">
          <span className="timer-label">{overtime ? '超過時間' : '残り時間'}</span>
          <span className={`timer-digits ${overtime ? 'text-red' : ''}`}>
            {formatTime(displaySeconds)}
          </span>
        </div>

        <div className="timer-cost-block">
          <span className="timer-label">現在コスト</span>
          <span className="timer-cost">{formatCost(taskCost(task))}</span>
          <span className="timer-estimated">予定: {formatCost(estimatedCost(task))}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar-track">
        <div
          className={`progress-bar-fill ${overtime ? 'overtime' : ''}`}
          style={{ width: `${progressValue * 100}%` }}
        />
      </div>

      {/* Controls */}
      <div className="timer-controls">
        <button
          className="control-btn primary"
          onClick={() => (timer.isRunning ? timer.pauseTimer() : timer.startTimer())}
          title={timer.isRunning ? '一時停止' : '再開'}
        >
          {timer.isRunning ? (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor">
              <circle cx="11" cy="11" r="11" opacity="0.15" />
              <rect x="7" y="6" width="3" height="10" rx="0.5" />
              <rect x="12" y="6" width="3" height="10" rx="0.5" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor">
              <circle cx="11" cy="11" r="11" opacity="0.15" />
              <path d="M8 5.5v11l9-5.5z" />
            </svg>
          )}
        </button>

        <button
          className="control-btn secondary"
          onClick={timer.stopTimer}
          title="停止"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor">
            <circle cx="11" cy="11" r="11" opacity="0.1" />
            <rect x="6" y="6" width="10" height="10" rx="1" />
          </svg>
        </button>

        <button
          className="control-btn success"
          onClick={() => timer.completeTask(task.id)}
          title="完了"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor">
            <circle cx="11" cy="11" r="11" opacity="0.15" />
            <path d="M6 11l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </button>
      </div>
    </div>
  );
}
