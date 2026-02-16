import { useMemo } from 'react';
import type { useTimer } from '../hooks/useTimer';
import {
  formatTime,
  formatCost,
  isOvertime,
  taskCost,
  estimatedCost,
  estimatedSeconds,
} from '../models/TaskModel';
import { generateFeedback } from '../models/feedback';

type Timer = ReturnType<typeof useTimer>;

export function DailySummaryView({ timer }: { timer: Timer }) {
  const timeDiff = timer.totalElapsedSeconds - timer.totalEstimatedSeconds;
  const costDiff = timer.totalCost - timer.totalEstimatedCost;

  const todaySummary = useMemo(
    () => ({
      date: new Date().toISOString().slice(0, 10),
      tasks: timer.tasks,
      totalElapsedSeconds: timer.totalElapsedSeconds,
      totalEstimatedSeconds: timer.totalEstimatedSeconds,
      completedCount: timer.completedTaskCount,
      totalCount: timer.tasks.length,
    }),
    [timer.tasks, timer.totalElapsedSeconds, timer.totalEstimatedSeconds, timer.completedTaskCount]
  );

  const feedback = useMemo(() => generateFeedback(todaySummary), [todaySummary]);
  const carryoverTasks = timer.tasks.filter((t) => t.isCarryover);
  const ratedTasks = timer.tasks.filter((t) => t.qualityRating);
  const avgQuality = ratedTasks.length > 0
    ? ratedTasks.reduce((s, t) => s + (t.qualityRating ?? 0), 0) / ratedTasks.length
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
        <button
          className="icon-btn"
          onClick={() => timer.setViewMode('history')}
          title="過去の履歴"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 4.5V8l2.5 1.5" />
          </svg>
        </button>
      </header>

      <div className="divider" />

      <div className="summary-content">
        {/* Claude Grade */}
        <div className="claude-grade-card">
          <div className="claude-avatar">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
              <text x="10" y="14" textAnchor="middle" fontSize="10" fill="currentColor" fontWeight="700">C</text>
            </svg>
          </div>
          <div className="claude-grade-body">
            <div className="claude-grade-row">
              <span className="claude-label">Claudeの評価</span>
              <span
                className="claude-grade-value"
                style={{ color: feedback.gradeColor }}
              >
                {feedback.grade}
              </span>
            </div>
            <p className="claude-headline">{feedback.headline}</p>
          </div>
        </div>

        {/* Feedback Points */}
        <section className="summary-section">
          <h2 className="section-title">Claudeからのフィードバック</h2>
          <div className="feedback-list">
            {feedback.points.map((point, i) => (
              <div key={i} className={`feedback-point ${point.type}`}>
                <span className="feedback-icon">
                  {point.type === 'critical' && '!!'}
                  {point.type === 'warning' && '!'}
                  {point.type === 'info' && '-'}
                  {point.type === 'praise' && '+'}
                </span>
                <span className="feedback-text">{point.text}</span>
              </div>
            ))}
          </div>
        </section>

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

        {/* Carryover notice */}
        {carryoverTasks.length > 0 && (
          <div className="carryover-notice">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--orange)" strokeWidth="1.5">
              <path d="M7 1v6M7 10v1" />
              <circle cx="7" cy="7" r="6" />
            </svg>
            <span>前日からの持ち越しタスクが{carryoverTasks.length}個あります</span>
          </div>
        )}

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
                  <div
                    key={task.id}
                    className={`task-summary-row ${task.isCarryover ? 'carryover' : ''}`}
                  >
                    <span className={`summary-check ${task.isCompleted ? 'done' : ''}`}>
                      {task.isCompleted ? '✓' : '○'}
                    </span>
                    <div className="summary-task-info">
                      <span className={`summary-task-name ${task.isCompleted ? 'completed' : ''}`}>
                        {task.name}
                        {task.isCarryover && (
                          <span className="carryover-badge">持越</span>
                        )}
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
                    <div className="summary-task-right">
                      {task.qualityRating && (
                        <div className="summary-stars">
                          {([1, 2, 3, 4, 5] as const).map((s) => (
                            <svg key={s} width="10" height="10" viewBox="0 0 12 12">
                              <path
                                d="M6 1l1.5 3.1L11 4.5 8.5 7l.6 3.5L6 8.8 2.9 10.5l.6-3.5L1 4.5l3.5-.4z"
                                fill={s <= task.qualityRating! ? '#ff9500' : 'none'}
                                stroke={s <= task.qualityRating! ? '#ff9500' : '#ccc'}
                                strokeWidth="0.8"
                              />
                            </svg>
                          ))}
                        </div>
                      )}
                      <div className="summary-task-cost">
                        <span className="cost-actual">{formatCost(taskCost(task))}</span>
                        <span className="cost-estimated">予定: {formatCost(estimatedCost(task))}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Evaluation summary */}
        <section className="summary-section">
          <h2 className="section-title">数値サマリー</h2>
          <div className="eval-box">
            <div className="eval-row">
              <span className="eval-label">タスク完了率:</span>
              <span className={`eval-value ${timer.completedTaskCount === timer.tasks.length && timer.tasks.length > 0 ? 'text-green' : 'text-orange'}`}>
                {timer.completedTaskCount} / {timer.tasks.length}
                {timer.tasks.length > 0 && ` (${Math.round((timer.completedTaskCount / timer.tasks.length) * 100)}%)`}
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
            {ratedTasks.length > 0 && (
              <div className="eval-row">
                <span className="eval-label">平均クオリティ:</span>
                <span className={`eval-value ${avgQuality >= 4 ? 'text-green' : avgQuality >= 3 ? 'text-blue' : avgQuality >= 2 ? 'text-orange' : 'text-red'}`}>
                  {'★'.repeat(Math.round(avgQuality))}{'☆'.repeat(5 - Math.round(avgQuality))}
                  {' '}({avgQuality.toFixed(1)}/5.0)
                </span>
              </div>
            )}
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
          </div>
        </section>

        {/* History link */}
        <button
          className="history-link-btn"
          onClick={() => timer.setViewMode('history')}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
            <circle cx="7" cy="7" r="5.5" />
            <path d="M7 3.5V7l2 1.5" />
          </svg>
          過去の業務履歴を見る
        </button>
      </div>
    </div>
  );
}
