import { useState, useMemo } from 'react';
import type { useTimer } from '../hooks/useTimer';
import {
  formatTime,
  formatCost,
  isOvertime,
  HOURLY_RATE,
  TASK_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  TaskCategory,
  TaskItem,
  getSortedChildren,
  MAX_DEPTH,
} from '../models/TaskModel';
import { getEstimationHint, getPredictiveWarning } from '../models/storage';

type Timer = ReturnType<typeof useTimer>;

// ─── Sub-task inline add form ──────────────────────────────────────────────
function SubTaskAddForm({
  parentId,
  depth,
  timer,
  onClose,
}: {
  parentId: string;
  depth: number;
  timer: Timer;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [minutes, setMinutes] = useState('');
  const [category, setCategory] = useState<TaskCategory>('other');
  const hint = useMemo(() => getEstimationHint(category), [category]);
  const mins = parseInt(minutes, 10);
  const valid = name.trim() && !isNaN(mins) && mins > 0;

  const handleAdd = () => {
    if (!valid) return;
    timer.addSubTask(parentId, name.trim(), mins, category);
    onClose();
  };

  const indent = depth * 20;

  return (
    <div
      className="sub-add-form"
      style={{ marginLeft: indent + 20 }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleAdd();
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="category-selector sub-category-selector">
        {TASK_CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`cat-chip ${category === cat ? 'selected' : ''}`}
            style={{
              borderColor: category === cat ? CATEGORY_COLORS[cat] : undefined,
              color: category === cat ? CATEGORY_COLORS[cat] : undefined,
            }}
            onClick={() => setCategory(cat)}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>
      <div className="add-form-row">
        <input
          type="text"
          placeholder="サブタスク名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-name"
          autoFocus
        />
        <input
          type="number"
          placeholder="分"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="input-minutes"
          min="1"
        />
      </div>
      {hint && (
        <div className="estimation-hint">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
            <circle cx="6" cy="6" r="5" />
            <path d="M6 3.5V6.5M6 8v.5" />
          </svg>
          <span>
            過去{hint.count}件の「{CATEGORY_LABELS[category]}」: 平均{hint.avgMinutes}分
            {hint.accuracy > 1.15 && ` (見積もりの${Math.round(hint.accuracy * 100)}%かかる傾向)`}
            {hint.accuracy < 0.85 && ` (見積もりより早く終わる傾向)`}
          </span>
        </div>
      )}
      <div className="add-form-actions">
        {!isNaN(mins) && mins > 0 && (
          <span className="preview-cost">
            予定: {formatCost((mins / 60) * HOURLY_RATE)}
          </span>
        )}
        <span className="spacer" />
        <button className="btn-text" onClick={onClose}>キャンセル</button>
        <button className="btn-primary" onClick={handleAdd} disabled={!valid}>追加</button>
      </div>
    </div>
  );
}

// ─── Single task row + its children ───────────────────────────────────────
function TaskTreeItem({
  task,
  depth,
  timer,
  allTasks,
  draggedId,
  dragOverId,
  dragOverPos,
  editingEstimateId,
  editEstimateValue,
  addSubTaskForId,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onEditEstimateStart,
  onEditEstimateSave,
  setEditEstimateValue,
  setAddSubTaskForId,
}: {
  task: TaskItem;
  depth: number;
  timer: Timer;
  allTasks: TaskItem[];
  draggedId: string | null;
  dragOverId: string | null;
  dragOverPos: 'before' | 'after';
  editingEstimateId: string | null;
  editEstimateValue: string;
  addSubTaskForId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onEditEstimateStart: (id: string, current: number) => void;
  onEditEstimateSave: (id: string) => void;
  setEditEstimateValue: (v: string) => void;
  setAddSubTaskForId: (id: string | null) => void;
}) {
  const children = getSortedChildren(task.id, allTasks);
  const active = timer.activeTaskId === task.id;
  const overtime = isOvertime(task);
  const catColor = task.category ? CATEGORY_COLORS[task.category] : '#636366';
  const catLabel = task.category ? CATEGORY_LABELS[task.category] : '';
  const canAddSub = depth < MAX_DEPTH && !task.isCompleted;
  const indent = depth * 20;
  const isDragging = draggedId === task.id;
  const isDropTarget = dragOverId === task.id;

  return (
    <>
      {/* Drop indicator: before */}
      {isDropTarget && dragOverPos === 'before' && (
        <div className="drop-indicator" style={{ marginLeft: indent + 24 }} />
      )}

      <div
        className={`task-row depth-${depth} ${active ? 'active' : ''} ${task.isCarryover ? 'carryover' : ''} ${isDragging ? 'dragging' : ''}`}
        style={{ paddingLeft: indent + 12 }}
        onDragOver={(e) => onDragOver(e, task.id)}
        onDrop={(e) => onDrop(e, task.id)}
      >
        {/* Drag handle */}
        <span
          className="drag-handle"
          draggable
          onDragStart={() => onDragStart(task.id)}
          onDragEnd={onDragEnd}
          title="ドラッグして並び替え"
        >
          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" opacity="0.35">
            <circle cx="3" cy="2.5" r="1.2" />
            <circle cx="7" cy="2.5" r="1.2" />
            <circle cx="3" cy="7" r="1.2" />
            <circle cx="7" cy="7" r="1.2" />
            <circle cx="3" cy="11.5" r="1.2" />
            <circle cx="7" cy="11.5" r="1.2" />
          </svg>
        </span>

        {/* Check / complete */}
        <button className="check-btn" onClick={() => timer.completeTask(task.id)}>
          {task.isCompleted ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--primary)">
              <circle cx="8" cy="8" r="7" />
              <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#999" strokeWidth="1.2">
              <circle cx="8" cy="8" r="6.5" />
            </svg>
          )}
        </button>

        {/* Task info */}
        <div className="task-info">
          <span className={`task-name ${task.isCompleted ? 'completed' : ''} ${active ? 'active-name' : ''}`}>
            {catLabel && (
              <span className="task-cat-dot" style={{ background: catColor }} />
            )}
            {depth > 0 && <span className="subtask-arrow">└</span>}
            {task.name}
            {task.isCarryover && (
              <span className="carryover-badge">
                {task.carryoverDays && task.carryoverDays > 1
                  ? `${task.carryoverDays}日持越`
                  : '持越'}
              </span>
            )}
          </span>
          <span className="task-meta">
            {editingEstimateId === task.id ? (
              <span className="inline-edit">
                <input
                  type="number"
                  value={editEstimateValue}
                  onChange={(e) => setEditEstimateValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onEditEstimateSave(task.id);
                    if (e.key === 'Escape') onEditEstimateSave(task.id);
                  }}
                  onBlur={() => onEditEstimateSave(task.id)}
                  className="inline-edit-input"
                  autoFocus
                  min="1"
                />
                分
              </span>
            ) : (
              <span
                className={`estimate-clickable ${!task.isCompleted ? 'editable' : ''}`}
                onClick={() => {
                  if (!task.isCompleted) onEditEstimateStart(task.id, task.estimatedMinutes);
                }}
                title={!task.isCompleted ? 'クリックで見積もり修正' : ''}
              >
                {task.estimatedMinutes}分
              </span>
            )}
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

        {/* Cost */}
        {task.elapsedSeconds > 0 && (
          <span className="task-cost">
            {formatCost((task.elapsedSeconds / 3600) * HOURLY_RATE)}
          </span>
        )}

        {/* Add subtask button */}
        {canAddSub && (
          <button
            className="add-subtask-btn"
            onClick={() => setAddSubTaskForId(task.id)}
            title="サブタスクを追加"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 2v8M2 6h8" />
            </svg>
          </button>
        )}

        {/* Play / pause */}
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

        {/* Delete */}
        <button
          className="delete-btn"
          onClick={() => timer.deleteTask(task.id)}
          title={children.length > 0 ? 'タスクとサブタスクを削除' : 'タスクを削除'}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3l6 6M9 3l-6 6" />
          </svg>
        </button>

        {/* Quality stars */}
        {task.isCompleted && (
          <div className="quality-rating">
            {([1, 2, 3, 4, 5] as const).map((star) => (
              <button
                key={star}
                className="star-btn"
                onClick={() => timer.rateTask(task.id, star)}
                title={`クオリティ: ${star}`}
              >
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path
                    d="M6 1l1.5 3.1L11 4.5 8.5 7l.6 3.5L6 8.8 2.9 10.5l.6-3.5L1 4.5l3.5-.4z"
                    fill={task.qualityRating && star <= task.qualityRating ? '#ff9500' : 'none'}
                    stroke={task.qualityRating && star <= task.qualityRating ? '#ff9500' : '#999'}
                    strokeWidth="0.8"
                  />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Drop indicator: after */}
      {isDropTarget && dragOverPos === 'after' && (
        <div className="drop-indicator" style={{ marginLeft: indent + 24 }} />
      )}

      {/* Inline sub-task add form */}
      {addSubTaskForId === task.id && (
        <SubTaskAddForm
          parentId={task.id}
          depth={depth + 1}
          timer={timer}
          onClose={() => setAddSubTaskForId(null)}
        />
      )}

      {/* Render children recursively */}
      {children.map((child) => (
        <TaskTreeItem
          key={child.id}
          task={child}
          depth={depth + 1}
          timer={timer}
          allTasks={allTasks}
          draggedId={draggedId}
          dragOverId={dragOverId}
          dragOverPos={dragOverPos}
          editingEstimateId={editingEstimateId}
          editEstimateValue={editEstimateValue}
          addSubTaskForId={addSubTaskForId}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onEditEstimateStart={onEditEstimateStart}
          onEditEstimateSave={onEditEstimateSave}
          setEditEstimateValue={setEditEstimateValue}
          setAddSubTaskForId={setAddSubTaskForId}
        />
      ))}
    </>
  );
}

// ─── Main task list view ──────────────────────────────────────────────────
export function TaskListView({ timer }: { timer: Timer }) {
  // Root task add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskMinutes, setNewTaskMinutes] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('other');

  // Estimate inline edit
  const [editingEstimateId, setEditingEstimateId] = useState<string | null>(null);
  const [editEstimateValue, setEditEstimateValue] = useState('');

  // Sub-task add form
  const [addSubTaskForId, setAddSubTaskForId] = useState<string | null>(null);

  // Drag-and-drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPos, setDragOverPos] = useState<'before' | 'after'>('before');

  const hint = useMemo(() => getEstimationHint(newTaskCategory), [newTaskCategory]);
  const prediction = useMemo(() => getPredictiveWarning(timer.tasks), [timer.tasks]);

  // Root tasks in DFS order for rendering
  const rootTasks = useMemo(
    () => getSortedChildren(undefined, timer.tasks),
    [timer.tasks],
  );

  const handleAdd = () => {
    const minutes = parseInt(newTaskMinutes, 10);
    if (!newTaskName.trim() || isNaN(minutes) || minutes <= 0) return;
    timer.addTask(newTaskName.trim(), minutes, newTaskCategory);
    setNewTaskName('');
    setNewTaskMinutes('');
    setNewTaskCategory('other');
    setShowAddForm(false);
  };

  const handleRootKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') {
      setShowAddForm(false);
      setNewTaskName('');
      setNewTaskMinutes('');
    }
  };

  const handleEditEstimateStart = (id: string, current: number) => {
    setEditingEstimateId(id);
    setEditEstimateValue(String(current));
  };

  const handleEditEstimateSave = (id: string) => {
    const val = parseInt(editEstimateValue, 10);
    if (!isNaN(val) && val > 0) timer.updateEstimate(id, val);
    setEditingEstimateId(null);
    setEditEstimateValue('');
  };

  // DnD handlers
  const handleDragStart = (id: string) => setDraggedId(id);

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === id) return;
    // Ensure same parent
    const dragged = timer.tasks.find((t) => t.id === draggedId);
    const target = timer.tasks.find((t) => t.id === id);
    if (!dragged || !target || dragged.parentId !== target.parentId) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    setDragOverId(id);
    setDragOverPos(pos);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== targetId) {
      timer.reorderTasks(draggedId, targetId, dragOverPos);
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  const previewMinutes = parseInt(newTaskMinutes, 10);
  const showPreviewCost = !isNaN(previewMinutes) && previewMinutes > 0;

  return (
    <div className="task-list-section">
      {/* Predictive warning */}
      {prediction && (
        <div className={`prediction-banner ${prediction.type}`}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M7 1v6M7 10v1" />
            <circle cx="7" cy="7" r="6" />
          </svg>
          <span>{prediction.message}</span>
        </div>
      )}

      {timer.tasks.length === 0 ? (
        <div className="empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
          </svg>
          <p>タスクを追加して開始しましょう</p>
        </div>
      ) : (
        <div
          className="task-list"
          onDragOver={(e) => e.preventDefault()}
        >
          {rootTasks.map((task) => (
            <TaskTreeItem
              key={task.id}
              task={task}
              depth={0}
              timer={timer}
              allTasks={timer.tasks}
              draggedId={draggedId}
              dragOverId={dragOverId}
              dragOverPos={dragOverPos}
              editingEstimateId={editingEstimateId}
              editEstimateValue={editEstimateValue}
              addSubTaskForId={addSubTaskForId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onEditEstimateStart={handleEditEstimateStart}
              onEditEstimateSave={handleEditEstimateSave}
              setEditEstimateValue={setEditEstimateValue}
              setAddSubTaskForId={setAddSubTaskForId}
            />
          ))}
        </div>
      )}

      <div className="divider" />

      {/* Root task add form */}
      {showAddForm ? (
        <div className="add-form" onKeyDown={handleRootKeyDown}>
          <div className="category-selector">
            {TASK_CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`cat-chip ${newTaskCategory === cat ? 'selected' : ''}`}
                style={{
                  borderColor: newTaskCategory === cat ? CATEGORY_COLORS[cat] : undefined,
                  color: newTaskCategory === cat ? CATEGORY_COLORS[cat] : undefined,
                }}
                onClick={() => setNewTaskCategory(cat)}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

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

          {hint && (
            <div className="estimation-hint">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                <circle cx="6" cy="6" r="5" />
                <path d="M6 3.5V6.5M6 8v.5" />
              </svg>
              <span>
                過去{hint.count}件の「{CATEGORY_LABELS[newTaskCategory]}」: 平均{hint.avgMinutes}分
                {hint.accuracy > 1.15 && ` (見積もりの${Math.round(hint.accuracy * 100)}%かかる傾向)`}
                {hint.accuracy < 0.85 && ` (見積もりより早く終わる傾向)`}
              </span>
            </div>
          )}

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
