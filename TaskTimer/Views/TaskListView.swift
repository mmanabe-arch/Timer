import SwiftUI

struct TaskListView: View {
    @ObservedObject var viewModel: TimerViewModel
    @State private var newTaskName: String = ""
    @State private var newTaskMinutes: String = ""
    @State private var showAddForm: Bool = false

    var body: some View {
        VStack(spacing: 0) {
            if viewModel.tasks.isEmpty {
                emptyState
            } else {
                taskList
            }

            Divider()

            if showAddForm {
                addTaskForm
            } else {
                addButton
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 8) {
            Image(systemName: "list.bullet.clipboard")
                .font(.system(size: 28))
                .foregroundColor(.secondary.opacity(0.5))
            Text("タスクを追加して開始しましょう")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }

    // MARK: - Task List

    private var taskList: some View {
        ScrollView {
            LazyVStack(spacing: 2) {
                ForEach(viewModel.tasks) { task in
                    TaskRow(viewModel: viewModel, task: task)
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
        }
    }

    // MARK: - Add Task

    private var addButton: some View {
        Button(action: { showAddForm = true }) {
            HStack {
                Image(systemName: "plus.circle.fill")
                Text("タスクを追加")
            }
            .font(.caption)
            .foregroundColor(.accentColor)
        }
        .buttonStyle(.plain)
        .padding(8)
    }

    private var addTaskForm: some View {
        VStack(spacing: 6) {
            HStack(spacing: 8) {
                TextField("タスク名", text: $newTaskName)
                    .textFieldStyle(.roundedBorder)
                    .font(.caption)

                TextField("分", text: $newTaskMinutes)
                    .textFieldStyle(.roundedBorder)
                    .font(.caption)
                    .frame(width: 50)
            }

            HStack {
                if let minutes = Int(newTaskMinutes), minutes > 0 {
                    Text("予定コスト: \(viewModel.formatCost(Double(minutes) / 60.0 * viewModel.hourlyRate))")
                        .font(.system(size: 10))
                        .foregroundColor(.orange)
                }

                Spacer()

                Button("キャンセル") {
                    showAddForm = false
                    newTaskName = ""
                    newTaskMinutes = ""
                }
                .font(.caption)
                .buttonStyle(.plain)
                .foregroundColor(.secondary)

                Button("追加") {
                    addTask()
                }
                .font(.caption)
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
                .disabled(newTaskName.isEmpty || Int(newTaskMinutes) == nil || (Int(newTaskMinutes) ?? 0) <= 0)
            }
        }
        .padding(8)
    }

    private func addTask() {
        guard !newTaskName.isEmpty,
              let minutes = Int(newTaskMinutes),
              minutes > 0 else { return }
        viewModel.addTask(name: newTaskName, estimatedMinutes: minutes)
        newTaskName = ""
        newTaskMinutes = ""
        showAddForm = false
    }
}

// MARK: - Task Row

struct TaskRow: View {
    @ObservedObject var viewModel: TimerViewModel
    let task: TaskItem

    private var isActive: Bool {
        viewModel.activeTaskId == task.id
    }

    var body: some View {
        HStack(spacing: 8) {
            // Completion toggle
            Button(action: { viewModel.completeTask(id: task.id) }) {
                Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(task.isCompleted ? .green : .secondary)
                    .font(.system(size: 14))
            }
            .buttonStyle(.plain)

            // Task info
            VStack(alignment: .leading, spacing: 2) {
                Text(task.name)
                    .font(.caption)
                    .fontWeight(isActive ? .bold : .regular)
                    .strikethrough(task.isCompleted)
                    .foregroundColor(task.isCompleted ? .secondary : .primary)

                HStack(spacing: 4) {
                    Text("\(task.estimatedMinutes)分")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)

                    if task.elapsedSeconds > 0 {
                        Text("→")
                            .font(.system(size: 10))
                            .foregroundColor(.secondary)
                        Text(viewModel.formatTime(task.elapsedSeconds))
                            .font(.system(size: 10))
                            .foregroundColor(task.isOvertime ? .red : .blue)
                    }
                }
            }

            Spacer()

            // Cost display
            if task.elapsedSeconds > 0 {
                Text(viewModel.formatCost(task.cost))
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.orange)
            }

            // Play/Pause button
            if !task.isCompleted {
                Button(action: { viewModel.selectTask(id: task.id) }) {
                    Image(systemName: isActive && viewModel.isRunning ? "pause.fill" : "play.fill")
                        .foregroundColor(isActive ? .accentColor : .secondary)
                        .font(.caption)
                }
                .buttonStyle(.plain)
            }

            // Delete button
            Button(action: { viewModel.deleteTask(id: task.id) }) {
                Image(systemName: "xmark.circle")
                    .foregroundColor(.secondary.opacity(0.5))
                    .font(.system(size: 11))
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(
            RoundedRectangle(cornerRadius: 6)
                .fill(isActive ? Color.accentColor.opacity(0.08) : Color.clear)
        )
    }
}
