import Foundation
import SwiftUI
import Combine

class TimerViewModel: ObservableObject {
    @Published var tasks: [TaskItem] = []
    @Published var activeTaskId: UUID? = nil
    @Published var isRunning: Bool = false
    @Published var isCompactMode: Bool = false
    @Published var showDailySummary: Bool = false

    let hourlyRate: Double = 1200.0

    private var timer: Timer?

    var activeTask: TaskItem? {
        tasks.first { $0.id == activeTaskId }
    }

    var totalElapsedSeconds: Int {
        tasks.reduce(0) { $0 + $1.elapsedSeconds }
    }

    var totalEstimatedSeconds: Int {
        tasks.reduce(0) { $0 + $1.estimatedSeconds }
    }

    var totalCost: Double {
        Double(totalElapsedSeconds) / 3600.0 * hourlyRate
    }

    var totalEstimatedCost: Double {
        Double(totalEstimatedSeconds) / 3600.0 * hourlyRate
    }

    var completedTaskCount: Int {
        tasks.filter { $0.isCompleted }.count
    }

    // MARK: - Task Management

    func addTask(name: String, estimatedMinutes: Int) {
        let task = TaskItem(name: name, estimatedMinutes: estimatedMinutes)
        tasks.append(task)
    }

    func deleteTask(id: UUID) {
        if activeTaskId == id {
            stopTimer()
        }
        tasks.removeAll { $0.id == id }
    }

    func selectTask(id: UUID) {
        if activeTaskId == id {
            if isRunning {
                pauseTimer()
            } else {
                startTimer()
            }
        } else {
            pauseTimer()
            activeTaskId = id
            startTimer()
        }
    }

    func completeTask(id: UUID) {
        if let index = tasks.firstIndex(where: { $0.id == id }) {
            tasks[index].isCompleted = true
            if activeTaskId == id {
                stopTimer()
            }
        }
    }

    // MARK: - Timer Control

    func startTimer() {
        guard activeTaskId != nil else { return }
        isRunning = true
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            DispatchQueue.main.async {
                self?.tick()
            }
        }
    }

    func pauseTimer() {
        isRunning = false
        timer?.invalidate()
        timer = nil
    }

    func stopTimer() {
        pauseTimer()
        activeTaskId = nil
    }

    private func tick() {
        guard let activeId = activeTaskId,
              let index = tasks.firstIndex(where: { $0.id == activeId }) else {
            return
        }
        tasks[index].elapsedSeconds += 1
    }

    // MARK: - Formatting

    func formatTime(_ seconds: Int) -> String {
        let h = seconds / 3600
        let m = (seconds % 3600) / 60
        let s = seconds % 60
        if h > 0 {
            return String(format: "%d:%02d:%02d", h, m, s)
        }
        return String(format: "%02d:%02d", m, s)
    }

    func formatCost(_ cost: Double) -> String {
        if cost < 0 {
            return String(format: "-¥%.0f", abs(cost))
        }
        return String(format: "¥%.0f", cost)
    }
}
