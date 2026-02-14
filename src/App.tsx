import { useTimer } from './hooks/useTimer';
import { usePiP } from './hooks/usePiP';
import { formatTime, formatCost } from './models/TaskModel';
import { TaskListView } from './components/TaskListView';
import { TimerView } from './components/TimerView';
import { CompactTimerView } from './components/CompactTimerView';
import { DailySummaryView } from './components/DailySummaryView';
import { PiPTimerView } from './components/PiPTimerView';

export default function App() {
  const timer = useTimer();
  const pip = usePiP();

  if (timer.viewMode === 'compact') {
    return <CompactTimerView timer={timer} />;
  }

  if (timer.viewMode === 'summary') {
    return <DailySummaryView timer={timer} />;
  }

  return (
    <div className="app">
      {/* PiP portal */}
      {pip.isOpen && pip.container.current && (
        <PiPTimerView timer={timer} container={pip.container.current} onClose={pip.close} />
      )}

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
            className={`icon-btn ${pip.isOpen ? 'icon-btn-active' : ''}`}
            onClick={() => (pip.isOpen ? pip.close() : pip.open())}
            title="フローティングタイマー"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
              <rect x="1" y="1" width="14" height="10" rx="1.5" />
              <rect x="8" y="7" width="7" height="5" rx="1" fill="currentColor" opacity="0.15" />
              <rect x="8" y="7" width="7" height="5" rx="1" />
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
