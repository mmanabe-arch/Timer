import SwiftUI

struct TimerView: View {
    @ObservedObject var viewModel: TimerViewModel
    let task: TaskItem

    var body: some View {
        VStack(spacing: 8) {
            // Task name
            Text(task.name)
                .font(.caption)
                .foregroundColor(.secondary)

            // Timer and cost display
            HStack(alignment: .firstTextBaseline, spacing: 20) {
                // Time display
                VStack(spacing: 2) {
                    Text(task.isOvertime ? "超過時間" : "残り時間")
                        .font(.system(size: 9))
                        .foregroundColor(.secondary)
                    Text(viewModel.formatTime(task.isOvertime ? task.overtimeSeconds : task.remainingSeconds))
                        .font(.system(size: 28, weight: .light, design: .monospaced))
                        .foregroundColor(task.isOvertime ? .red : .primary)
                }

                // Cost display
                VStack(spacing: 2) {
                    Text("現在コスト")
                        .font(.system(size: 9))
                        .foregroundColor(.secondary)
                    Text(viewModel.formatCost(task.cost))
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(.orange)
                    Text("予定: \(viewModel.formatCost(task.estimatedCost))")
                        .font(.system(size: 9))
                        .foregroundColor(.secondary)
                }
            }

            // Progress bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.gray.opacity(0.2))
                        .frame(height: 4)

                    // Progress
                    RoundedRectangle(cornerRadius: 2)
                        .fill(task.isOvertime ? Color.red : Color.accentColor)
                        .frame(width: geometry.size.width * CGFloat(task.progress), height: 4)
                }
            }
            .frame(height: 4)
            .padding(.horizontal)

            // Controls
            HStack(spacing: 20) {
                // Play / Pause
                Button(action: {
                    if viewModel.isRunning {
                        viewModel.pauseTimer()
                    } else {
                        viewModel.startTimer()
                    }
                }) {
                    Image(systemName: viewModel.isRunning ? "pause.circle.fill" : "play.circle.fill")
                        .font(.system(size: 26))
                        .foregroundColor(.accentColor)
                }
                .buttonStyle(.plain)

                // Stop
                Button(action: { viewModel.stopTimer() }) {
                    Image(systemName: "stop.circle.fill")
                        .font(.system(size: 26))
                        .foregroundColor(.secondary)
                }
                .buttonStyle(.plain)

                // Complete
                Button(action: { viewModel.completeTask(id: task.id) }) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 26))
                        .foregroundColor(.green)
                }
                .buttonStyle(.plain)
            }
        }
        .padding()
    }
}
