import { useTimer } from './hooks/useTimer';
import { formatTime, formatCost } from './models/TaskModel';
import { TaskListView } from './components/TaskListView';
import { TimerView } from './components/TimerView';
import { CompactTimerView } from './components/CompactTimerView';
import { DailySummaryView } from './components/DailySummaryView';

export default function App() {
  const timer = useTimer();

  if (timer.viewMode === 'compact') {
    return <CompactTimerView timer={timer} />;
  }

  if (timer.viewMode === 'summary') {
    return <DailySummaryView timer={timer} />;
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">Task Timer</h1>
        <div className="header-actions">
          <button
            className="icon-btn"
            onClick={() => timer.setViewMode('summary')}
            title="本日のサマリー"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="8" width="3" height="6" rx="0.5" />
              <rect x="6" y="5" width="3" height="9" rx="0.5" />
              <rect x="11" y="2" width="3" height="12" rx="0.5" />
            </svg>
          </button>
          <button
            className="icon-btn"
            onClick={() => timer.setViewMode('compact')}
            title="コンパクトモード"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="5" width="12" height="6" rx="1.5" />
            </svg>
          </button>
        </div>
      </header>

      <div className="divider" />

      {/* Timer section */}
      {timer.activeTask && (
        <>
          <TimerView timer={timer} task={timer.activeTask} />
          <div className="divider" />
        </>
      )}

      {/* Task list */}
      <TaskListView timer={timer} />

      <div className="divider" />

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-left">
          <span className="footer-label">本日の合計</span>
          <span className="footer-time">{formatTime(timer.totalElapsedSeconds)}</span>
        </div>
        <div className="footer-right">
          <span className="footer-label">合計コスト</span>
          <span className="footer-cost">{formatCost(timer.totalCost)}</span>
        </div>
      </footer>
    </div>
  );
}
