import SwiftUI

struct DailySummaryView: View {
    @ObservedObject var viewModel: TimerViewModel

    private var timeDifference: Int {
        viewModel.totalElapsedSeconds - viewModel.totalEstimatedSeconds
    }

    private var costDifference: Double {
        viewModel.totalCost - viewModel.totalEstimatedCost
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Button(action: { viewModel.showDailySummary = false }) {
                    HStack(spacing: 4) {
                        Image(systemName: "chevron.left")
                        Text("戻る")
                    }
                    .font(.caption)
                }
                .buttonStyle(.plain)

                Spacer()

                Text("本日の業務サマリー")
                    .font(.headline)

                Spacer()
            }
            .padding()

            Divider()

            ScrollView {
                VStack(spacing: 16) {
                    // Overall statistics
                    overallStats

                    // Task breakdown
                    taskBreakdown

                    // Evaluation
                    evaluationSection
                }
                .padding()
            }
        }
    }

    // MARK: - Overall Stats

    private var overallStats: some View {
        HStack(spacing: 12) {
            StatCard(
                title: "実績時間",
                value: viewModel.formatTime(viewModel.totalElapsedSeconds),
                subtitle: "予定: \(viewModel.formatTime(viewModel.totalEstimatedSeconds))",
                color: .blue
            )

            StatCard(
                title: "合計コスト",
                value: viewModel.formatCost(viewModel.totalCost),
                subtitle: "予定: \(viewModel.formatCost(viewModel.totalEstimatedCost))",
                color: .orange
            )
        }
    }

    // MARK: - Task Breakdown

    private var taskBreakdown: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("タスク別詳細")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.secondary)

            if viewModel.tasks.isEmpty {
                Text("タスクがありません")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding()
            } else {
                ForEach(viewModel.tasks) { task in
                    TaskSummaryRow(task: task, viewModel: viewModel)
                }
            }
        }
    }

    // MARK: - Evaluation

    private var evaluationSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("本日の評価")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.secondary)

            VStack(alignment: .leading, spacing: 6) {
                // Completion rate
                HStack {
                    Text("タスク完了率:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    let total = viewModel.tasks.count
                    let completed = viewModel.completedTaskCount
                    Text("\(completed) / \(total)")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(completed == total && total > 0 ? .green : .orange)
                    if total > 0 {
                        Text("(\(Int(Double(completed) / Double(total) * 100))%)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                // Time difference
                HStack {
                    Text("時間差分:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    if timeDifference > 0 {
                        Text("+\(viewModel.formatTime(timeDifference)) 超過")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.red)
                    } else if timeDifference < 0 {
                        Text("-\(viewModel.formatTime(abs(timeDifference))) 短縮")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.green)
                    } else {
                        Text("予定通り")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                    }
                }

                // Cost difference
                HStack {
                    Text("コスト差分:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    if costDifference > 0 {
                        Text("+\(viewModel.formatCost(costDifference))")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.red)
                    } else if costDifference < 0 {
                        Text("\(viewModel.formatCost(costDifference))")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.green)
                    } else {
                        Text("±¥0")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                    }
                }

                // Efficiency message
                Divider()
                efficiencyMessage
            }
            .padding()
            .background(Color.gray.opacity(0.08))
            .cornerRadius(8)
        }
    }

    private var efficiencyMessage: some View {
        let total = viewModel.tasks.count
        let completed = viewModel.completedTaskCount
        let completionRate = total > 0 ? Double(completed) / Double(total) : 0

        return VStack(alignment: .leading, spacing: 4) {
            if total == 0 {
                Label("タスクが設定されていません。", systemImage: "info.circle")
                    .font(.caption)
                    .foregroundColor(.secondary)
            } else if completionRate == 1.0 && timeDifference <= 0 {
                Label("全タスク完了、時間内に収まりました。効率的な作業でした。", systemImage: "star.fill")
                    .font(.caption)
                    .foregroundColor(.green)
            } else if completionRate == 1.0 {
                Label("全タスク完了。ただし予定時間を超過しています。見積もりの精度を見直しましょう。", systemImage: "exclamationmark.triangle")
                    .font(.caption)
                    .foregroundColor(.orange)
            } else if timeDifference <= 0 {
                Label("時間に余裕がありますが、未完了タスクがあります。優先順位を確認しましょう。", systemImage: "clock.arrow.circlepath")
                    .font(.caption)
                    .foregroundColor(.blue)
            } else {
                Label("未完了タスクがあり、時間も超過しています。タスクの分割や見積もりを見直しましょう。", systemImage: "exclamationmark.triangle.fill")
                    .font(.caption)
                    .foregroundColor(.red)
            }
        }
    }
}

// MARK: - Supporting Views

struct StatCard: View {
    let title: String
    let value: String
    let subtitle: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.system(size: 10))
                .foregroundColor(.secondary)
            Text(value)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(color)
            Text(subtitle)
                .font(.system(size: 9))
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(10)
        .background(color.opacity(0.08))
        .cornerRadius(8)
    }
}

struct TaskSummaryRow: View {
    let task: TaskItem
    @ObservedObject var viewModel: TimerViewModel

    private var timeDiff: Int {
        task.elapsedSeconds - task.estimatedSeconds
    }

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")
                .foregroundColor(task.isCompleted ? .green : .secondary)
                .font(.caption)

            VStack(alignment: .leading, spacing: 2) {
                Text(task.name)
                    .font(.caption)
                    .fontWeight(.medium)
                    .strikethrough(task.isCompleted)

                HStack(spacing: 8) {
                    Text("予定: \(task.estimatedMinutes)分")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)

                    Text("実績: \(viewModel.formatTime(task.elapsedSeconds))")
                        .font(.system(size: 10))
                        .foregroundColor(task.isOvertime ? .red : .blue)

                    if timeDiff > 0 {
                        Text("+\(viewModel.formatTime(timeDiff))")
                            .font(.system(size: 10))
                            .fontWeight(.medium)
                            .foregroundColor(.red)
                    } else if timeDiff < 0 {
                        Text("-\(viewModel.formatTime(abs(timeDiff)))")
                            .font(.system(size: 10))
                            .fontWeight(.medium)
                            .foregroundColor(.green)
                    }
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text(viewModel.formatCost(task.cost))
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.orange)
                Text("予定: \(viewModel.formatCost(task.estimatedCost))")
                    .font(.system(size: 9))
                    .foregroundColor(.secondary)
            }
        }
        .padding(8)
        .background(Color.gray.opacity(0.04))
        .cornerRadius(6)
    }
}
