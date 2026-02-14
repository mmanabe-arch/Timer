import type { useTimer } from '../hooks/useTimer';
import {
  formatTime,
  formatCost,
  isOvertime,
  taskCost,
  estimatedCost,
  estimatedSeconds,
} from '../models/TaskModel';

type Timer = ReturnType<typeof useTimer>;

export function DailySummaryView({ timer }: { timer: Timer }) {
  const timeDiff = timer.totalElapsedSeconds - timer.totalEstimatedSeconds;
  const costDiff = timer.totalCost - timer.totalEstimatedCost;
  const completionRate =
    timer.tasks.length > 0
      ? timer.completedTaskCount / timer.tasks.length
      : 0;

  return (
    <div className="app summary-view">
      {/* Header */}
      <header className="app-header">
        <button className="back-btn" onClick={() => timer.setViewMode('normal')}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 2L4 7l5 5" />
          </svg>
          戻る
        </button>
        <h1 className="app-title">本日の業務サマリー</h1>
        <span />
      </header>

      <div className="divider" />

      <div className="summary-content">
        {/* Stat cards */}
        <div className="stat-cards">
          <div className="stat-card blue">
            <span className="stat-title">実績時間</span>
            <span className="stat-value">{formatTime(timer.totalElapsedSeconds)}</span>
            <span className="stat-sub">予定: {formatTime(timer.totalEstimatedSeconds)}</span>
          </div>
          <div className="stat-card orange">
            <span className="stat-title">合計コスト</span>
            <span className="stat-value">{formatCost(timer.totalCost)}</span>
            <span className="stat-sub">予定: {formatCost(timer.totalEstimatedCost)}</span>
          </div>
        </div>

        {/* Task breakdown */}
        <section className="summary-section">
          <h2 className="section-title">タスク別詳細</h2>
          {timer.tasks.length === 0 ? (
            <p className="no-data">タスクがありません</p>
          ) : (
            <div className="task-summary-list">
              {timer.tasks.map((task) => {
                const diff = task.elapsedSeconds - estimatedSeconds(task);
                const overtime = isOvertime(task);
                return (
                  <div key={task.id} className="task-summary-row">
                    <span className={`summary-check ${task.isCompleted ? 'done' : ''}`}>
                      {task.isCompleted ? '✓' : '○'}
                    </span>
                    <div className="summary-task-info">
                      <span className={`summary-task-name ${task.isCompleted ? 'completed' : ''}`}>
                        {task.name}
                      </span>
                      <span className="summary-task-meta">
                        予定: {task.estimatedMinutes}分
                        {' / '}
                        実績: <span className={overtime ? 'text-red' : 'text-blue'}>
                          {formatTime(task.elapsedSeconds)}
                        </span>
                        {diff !== 0 && (
                          <span className={diff > 0 ? 'text-red' : 'text-green'}>
                            {' '}({diff > 0 ? '+' : '-'}{formatTime(Math.abs(diff))})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="summary-task-cost">
                      <span className="cost-actual">{formatCost(taskCost(task))}</span>
                      <span className="cost-estimated">予定: {formatCost(estimatedCost(task))}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Evaluation */}
        <section className="summary-section">
          <h2 className="section-title">本日の評価</h2>
          <div className="eval-box">
            <div className="eval-row">
              <span className="eval-label">タスク完了率:</span>
              <span className={`eval-value ${completionRate === 1 && timer.tasks.length > 0 ? 'text-green' : 'text-orange'}`}>
                {timer.completedTaskCount} / {timer.tasks.length}
                {timer.tasks.length > 0 && ` (${Math.round(completionRate * 100)}%)`}
              </span>
            </div>
            <div className="eval-row">
              <span className="eval-label">時間差分:</span>
              {timeDiff > 0 ? (
                <span className="eval-value text-red">+{formatTime(timeDiff)} 超過</span>
              ) : timeDiff < 0 ? (
                <span className="eval-value text-green">-{formatTime(Math.abs(timeDiff))} 短縮</span>
              ) : (
                <span className="eval-value text-blue">予定通り</span>
              )}
            </div>
            <div className="eval-row">
              <span className="eval-label">コスト差分:</span>
              {costDiff > 0 ? (
                <span className="eval-value text-red">+{formatCost(costDiff)}</span>
              ) : costDiff < 0 ? (
                <span className="eval-value text-green">{formatCost(costDiff)}</span>
              ) : (
                <span className="eval-value text-blue">±¥0</span>
              )}
            </div>

            <div className="eval-divider" />

            <div className="eval-message">
              <EvalMessage
                completionRate={completionRate}
                timeDiff={timeDiff}
                hasTask={timer.tasks.length > 0}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function EvalMessage({
  completionRate,
  timeDiff,
  hasTask,
}: {
  completionRate: number;
  timeDiff: number;
  hasTask: boolean;
}) {
  if (!hasTask) {
    return <p className="text-secondary">タスクが設定されていません。</p>;
  }
  if (completionRate === 1 && timeDiff <= 0) {
    return (
      <p className="text-green">
        全タスク完了、時間内に収まりました。効率的な作業でした。
      </p>
    );
  }
  if (completionRate === 1) {
    return (
      <p className="text-orange">
        全タスク完了。ただし予定時間を超過しています。見積もりの精度を見直しましょう。
      </p>
    );
  }
  if (timeDiff <= 0) {
    return (
      <p className="text-blue">
        時間に余裕がありますが、未完了タスクがあります。優先順位を確認しましょう。
      </p>
    );
  }
  return (
    <p className="text-red">
      未完了タスクがあり、時間も超過しています。タスクの分割や見積もりを見直しましょう。
    </p>
  );
}
