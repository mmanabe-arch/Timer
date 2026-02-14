import type { useTimer } from '../hooks/useTimer';
import {
  formatTime,
  formatCost,
  isOvertime,
  overtimeSeconds,
  remainingSeconds,
  taskCost,
} from '../models/TaskModel';

type Timer = ReturnType<typeof useTimer>;

export function CompactTimerView({ timer }: { timer: Timer }) {
  const task = timer.activeTask;

  return (
    <div className="compact">
      {/* Top bar */}
      <div className="compact-header">
        <span className="compact-task-name">
          {task ? task.name : 'タスク未選択'}
        </span>
        <button
          className="icon-btn-sm"
          onClick={() => timer.setViewMode('normal')}
          title="通常モードに戻す"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 10L5 7M10 2L7 5" />
            <path d="M3 7H5V9M9 5H7V3" />
          </svg>
        </button>
      </div>

      {task ? (
        <div className="compact-body">
          <span className={`compact-time ${isOvertime(task) ? 'text-red' : ''}`}>
            {formatTime(isOvertime(task) ? overtimeSeconds(task) : remainingSeconds(task))}
          </span>
          <span className="compact-cost">
            {formatCost(taskCost(task))}
          </span>
          <span className="compact-spacer" />
          <button
            className="icon-btn-sm"
            onClick={() => (timer.isRunning ? timer.pauseTimer() : timer.startTimer())}
          >
            {timer.isRunning ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="var(--accent)">
                <rect x="2" y="1" width="3" height="10" rx="0.5" />
                <rect x="7" y="1" width="3" height="10" rx="0.5" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="var(--accent)">
                <path d="M2 1v10l9-5z" />
              </svg>
            )}
          </button>
          <button
            className="icon-btn-sm"
            onClick={() => timer.completeTask(task.id)}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#34c759" strokeWidth="2">
              <path d="M2 6l3 3 5-6" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="compact-empty">タスクを選択してください</div>
      )}

      {/* Total */}
      <div className="compact-footer">
        <span>合計: {formatCost(timer.totalCost)}</span>
        <span>{timer.completedTaskCount}/{timer.tasks.length} 完了</span>
      </div>
    </div>
  );
}
