import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = TimerViewModel()

    var body: some View {
        Group {
            if viewModel.isCompactMode {
                CompactTimerView(viewModel: viewModel)
            } else if viewModel.showDailySummary {
                DailySummaryView(viewModel: viewModel)
            } else {
                normalView
            }
        }
        .onChange(of: viewModel.isCompactMode) { _, isCompact in
            updateWindowSize(compact: isCompact)
        }
    }

    // MARK: - Normal Mode

    private var normalView: some View {
        VStack(spacing: 0) {
            headerView
            Divider()

            if let task = viewModel.activeTask {
                TimerView(viewModel: viewModel, task: task)
                Divider()
            }

            TaskListView(viewModel: viewModel)

            Divider()
            footerView
        }
    }

    // MARK: - Header

    private var headerView: some View {
        HStack {
            Text("Task Timer")
                .font(.headline)
            Spacer()

            Button(action: { viewModel.showDailySummary = true }) {
                Image(systemName: "chart.bar.fill")
                    .foregroundColor(.secondary)
            }
            .buttonStyle(.plain)
            .help("本日のサマリー")

            Button(action: { viewModel.isCompactMode = true }) {
                Image(systemName: "rectangle.compress.vertical")
                    .foregroundColor(.secondary)
            }
            .buttonStyle(.plain)
            .help("コンパクトモード")
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
    }

    // MARK: - Footer

    private var footerView: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("本日の合計")
                    .font(.system(size: 10))
                    .foregroundColor(.secondary)
                Text(viewModel.formatTime(viewModel.totalElapsedSeconds))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text("合計コスト")
                    .font(.system(size: 10))
                    .foregroundColor(.secondary)
                Text(viewModel.formatCost(viewModel.totalCost))
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.orange)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
    }

    // MARK: - Window Management

    private func updateWindowSize(compact: Bool) {
        guard let window = NSApplication.shared.windows.first else { return }
        let newSize = compact ? NSSize(width: 280, height: 120) : NSSize(width: 320, height: 500)
        window.setContentSize(newSize)
    }
}
