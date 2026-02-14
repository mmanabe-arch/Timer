import SwiftUI

struct CompactTimerView: View {
    @ObservedObject var viewModel: TimerViewModel

    var body: some View {
        VStack(spacing: 6) {
            // Top bar: task name + expand button
            HStack {
                if let task = viewModel.activeTask {
                    Text(task.name)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                } else {
                    Text("タスク未選択")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Expand button
                Button(action: {
                    viewModel.isCompactMode = false
                }) {
                    Image(systemName: "arrow.up.left.and.arrow.down.right")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                }
                .buttonStyle(.plain)
                .help("通常モードに戻す")
            }

            if let task = viewModel.activeTask {
                // Timer + Cost + Controls
                HStack(spacing: 12) {
                    // Time
                    Text(viewModel.formatTime(task.isOvertime ? task.overtimeSeconds : task.remainingSeconds))
                        .font(.system(size: 24, weight: .light, design: .monospaced))
                        .foregroundColor(task.isOvertime ? .red : .primary)

                    // Cost
                    Text(viewModel.formatCost(task.cost))
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.orange)

                    Spacer()

                    // Play / Pause
                    Button(action: {
                        if viewModel.isRunning {
                            viewModel.pauseTimer()
                        } else {
                            viewModel.startTimer()
                        }
                    }) {
                        Image(systemName: viewModel.isRunning ? "pause.fill" : "play.fill")
                            .font(.caption)
                            .foregroundColor(.accentColor)
                    }
                    .buttonStyle(.plain)

                    // Complete
                    Button(action: { viewModel.completeTask(id: task.id) }) {
                        Image(systemName: "checkmark")
                            .font(.caption)
                            .foregroundColor(.green)
                    }
                    .buttonStyle(.plain)
                }
            } else {
                Text("タスクを選択してください")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
            }

            // Total cost
            HStack {
                Text("合計: \(viewModel.formatCost(viewModel.totalCost))")
                    .font(.system(size: 10))
                    .foregroundColor(.orange.opacity(0.8))

                Spacer()

                Text("\(viewModel.completedTaskCount)/\(viewModel.tasks.count) 完了")
                    .font(.system(size: 10))
                    .foregroundColor(.secondary)
            }
        }
        .padding(10)
    }
}
