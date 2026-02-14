import { useMemo, useState } from 'react';
import type { useTimer } from '../hooks/useTimer';
import type { DailySummary } from '../models/storage';
import {
  loadAllSummaries,
  formatDateJP,
  getWeekNumber,
  getMonthLabel,
} from '../models/storage';
import { formatTime, formatCost, HOURLY_RATE } from '../models/TaskModel';
import { generateFeedback } from '../models/feedback';

type Timer = ReturnType<typeof useTimer>;

interface MonthGroup {
  label: string;
  weeks: WeekGroup[];
}

interface WeekGroup {
  weekNum: number;
  summaries: DailySummary[];
}

function groupByMonthAndWeek(summaries: DailySummary[]): MonthGroup[] {
  const monthMap = new Map<string, Map<number, DailySummary[]>>();

  for (const s of summaries) {
    const mLabel = getMonthLabel(s.date);
    const wNum = getWeekNumber(s.date);
    if (!monthMap.has(mLabel)) monthMap.set(mLabel, new Map());
    const weekMap = monthMap.get(mLabel)!;
    if (!weekMap.has(wNum)) weekMap.set(wNum, []);
    weekMap.get(wNum)!.push(s);
  }

  const result: MonthGroup[] = [];
  // Reverse order: newest month first
  const monthEntries = [...monthMap.entries()].reverse();
  for (const [label, weekMap] of monthEntries) {
    const weeks: WeekGroup[] = [...weekMap.entries()]
      .sort((a, b) => b[0] - a[0]) // newest week first
      .map(([weekNum, summaries]) => ({
        weekNum,
        summaries: summaries.sort((a, b) => b.date.localeCompare(a.date)),
      }));
    result.push({ label, weeks });
  }

  return result;
}

export function SummaryHistoryView({ timer }: { timer: Timer }) {
  const allSummaries = useMemo(() => loadAllSummaries(), []);
  const grouped = useMemo(() => groupByMonthAndWeek(allSummaries), [allSummaries]);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  return (
    <div className="app summary-view">
      <header className="app-header">
        <button className="back-btn" onClick={() => timer.setViewMode('summary')}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 2L4 7l5 5" />
          </svg>
          戻る
        </button>
        <h1 className="app-title">履歴</h1>
        <span />
      </header>

      <div className="divider" />

      <div className="history-content">
        {grouped.length === 0 ? (
          <p className="no-data">まだ履歴がありません</p>
        ) : (
          grouped.map((month) => (
            <div key={month.label} className="history-month">
              <div className="history-month-label">{month.label}</div>
              {month.weeks.map((week) => (
                <div key={week.weekNum} className="history-week">
                  <div className="history-week-label">第{week.weekNum}週</div>
                  {week.summaries.map((s) => {
                    const feedback = generateFeedback(s);
                    const isExpanded = expandedDay === s.date;
                    const cost = (s.totalElapsedSeconds / 3600) * HOURLY_RATE;
                    const carryoverCount = s.tasks.filter((t) => t.isCarryover).length;
                    return (
                      <div key={s.date} className="history-day">
                        <button
                          className="history-day-header"
                          onClick={() => setExpandedDay(isExpanded ? null : s.date)}
                        >
                          <span className="history-date">{formatDateJP(s.date)}</span>
                          <span
                            className="history-grade"
                            style={{ color: feedback.gradeColor }}
                          >
                            {feedback.grade}
                          </span>
                          <span className="history-stats">
                            {s.completedCount}/{s.totalCount}完了
                          </span>
                          <span className="history-time">{formatTime(s.totalElapsedSeconds)}</span>
                          <span className="history-cost">{formatCost(cost)}</span>
                          <svg
                            className={`history-chevron ${isExpanded ? 'expanded' : ''}`}
                            width="10" height="10" viewBox="0 0 10 10"
                            fill="none" stroke="currentColor" strokeWidth="1.5"
                          >
                            <path d="M3 4l2 2 2-2" />
                          </svg>
                        </button>

                        {isExpanded && (
                          <div className="history-day-detail">
                            {/* Grade + headline */}
                            <div className="history-feedback-header">
                              <span
                                className="history-grade-large"
                                style={{ color: feedback.gradeColor }}
                              >
                                {feedback.grade}
                              </span>
                              <span className="history-headline">{feedback.headline}</span>
                            </div>

                            {/* Feedback points */}
                            <div className="history-feedback-points">
                              {feedback.points.map((p, i) => (
                                <div key={i} className={`feedback-point ${p.type}`}>
                                  <span className="feedback-icon">
                                    {p.type === 'critical' && '!!'}
                                    {p.type === 'warning' && '!'}
                                    {p.type === 'info' && '-'}
                                    {p.type === 'praise' && '+'}
                                  </span>
                                  <span>{p.text}</span>
                                </div>
                              ))}
                            </div>

                            {/* Task list */}
                            <div className="history-tasks">
                              {s.tasks.map((t, i) => (
                                <div
                                  key={i}
                                  className={`history-task-row ${t.isCarryover ? 'carryover' : ''}`}
                                >
                                  <span className={t.isCompleted ? 'text-green' : 'text-red'}>
                                    {t.isCompleted ? '✓' : '✗'}
                                  </span>
                                  <span className="history-task-name">
                                    {t.name}
                                    {t.isCarryover && (
                                      <span className="carryover-badge">持越</span>
                                    )}
                                  </span>
                                  <span className="history-task-time">
                                    {formatTime(t.elapsedSeconds)}/{t.estimatedMinutes}分
                                  </span>
                                </div>
                              ))}
                            </div>

                            {carryoverCount > 0 && (
                              <div className="history-carryover-note">
                                持ち越しタスク: {carryoverCount}個
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
