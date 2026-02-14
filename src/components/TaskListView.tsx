import { useState } from 'react';
import type { useTimer } from '../hooks/useTimer';
import {
  formatTime,
  formatCost,
  isOvertime,
  HOURLY_RATE,
} from '../models/TaskModel';

type Timer = ReturnType<typeof useTimer>;

export function TaskListView({ timer }: { timer: Timer }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskMinutes, setNewTaskMinutes] = useState('');

  const handleAdd = () => {
    const minutes = parseInt(newTaskMinutes, 10);
    if (!newTaskName.trim() || isNaN(minutes) || minutes <= 0) return;
    timer.addTask(newTaskName.trim(), minutes);
    setNewTaskName('');
    setNewTaskMinutes('');
    setShowAddForm(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') {
      setShowAddForm(false);
      setNewTaskName('');
      setNewTaskMinutes('');
    }
  };

  const previewMinutes = parseInt(newTaskMinutes, 10);
  const showPreviewCost = !isNaN(previewMinutes) && previewMinutes > 0;

  return (
    <div className="task-list-section">
      {timer.tasks.length === 0 ? (
        <div className="empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
          </svg>
          <p>タスクを追加して開始しましょう</p>
        </div>
      ) : (
        <div className="task-list">
          {timer.tasks.map((task) => {
            const active = timer.activeTaskId === task.id;
            const overtime = isOvertime(task);
            return (
              <div key={task.id} className={`task-row ${active ? 'active' : ''} ${task.isCarryover ? 'carryover' : ''}`}>
                <button
                  className="check-btn"
                  onClick={() => timer.completeTask(task.id)}
                >
                  {task.isCompleted ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="#34c759">
                      <circle cx="8" cy="8" r="7" />
                      <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#999" strokeWidth="1.2">
                      <circle cx="8" cy="8" r="6.5" />
                    </svg>
                  )}
                </button>

                <div className="task-info">
                  <span className={`task-name ${task.isCompleted ? 'completed' : ''} ${active ? 'active-name' : ''}`}>
                    {task.name}
                    {task.isCarryover && <span className="carryover-badge">持越</span>}
                  </span>
                  <span className="task-meta">
                    {task.estimatedMinutes}分
                    {task.elapsedSeconds > 0 && (
                      <>
                        {' → '}
                        <span className={overtime ? 'text-red' : 'text-blue'}>
                          {formatTime(task.elapsedSeconds)}
                        </span>
                      </>
                    )}
                  </span>
                </div>

                {task.elapsedSeconds > 0 && (
                  <span className="task-cost">
                    {formatCost((task.elapsedSeconds / 3600) * HOURLY_RATE)}
                  </span>
                )}

                {!task.isCompleted && (
                  <button className="play-btn" onClick={() => timer.selectTask(task.id)}>
                    {active && timer.isRunning ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                        <rect x="3" y="2" width="3" height="10" rx="0.5" />
                        <rect x="8" y="2" width="3" height="10" rx="0.5" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                        <path d="M3 1.5v11l9-5.5z" />
                      </svg>
                    )}
                  </button>
                )}

                <button className="delete-btn" onClick={() => timer.deleteTask(task.id)}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 3l6 6M9 3l-6 6" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="divider" />

      {showAddForm ? (
        <div className="add-form" onKeyDown={handleKeyDown}>
          <div className="add-form-row">
            <input
              type="text"
              placeholder="タスク名"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              className="input-name"
              autoFocus
            />
            <input
              type="number"
              placeholder="分"
              value={newTaskMinutes}
              onChange={(e) => setNewTaskMinutes(e.target.value)}
              className="input-minutes"
              min="1"
            />
          </div>
          <div className="add-form-actions">
            {showPreviewCost && (
              <span className="preview-cost">
                予定コスト: {formatCost((previewMinutes / 60) * HOURLY_RATE)}
              </span>
            )}
            <span className="spacer" />
            <button
              className="btn-text"
              onClick={() => {
                setShowAddForm(false);
                setNewTaskName('');
                setNewTaskMinutes('');
              }}
            >
              キャンセル
            </button>
            <button
              className="btn-primary"
              onClick={handleAdd}
              disabled={!newTaskName.trim() || isNaN(previewMinutes) || previewMinutes <= 0}
            >
              追加
            </button>
          </div>
        </div>
      ) : (
        <button className="add-btn" onClick={() => setShowAddForm(true)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <circle cx="7" cy="7" r="6.5" />
            <path d="M7 4v6M4 7h6" stroke="white" strokeWidth="1.5" />
          </svg>
          タスクを追加
        </button>
      )}
    </div>
  );
}
