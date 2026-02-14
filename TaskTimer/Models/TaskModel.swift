import Foundation

struct TaskItem: Identifiable, Codable {
    let id: UUID
    var name: String
    var estimatedMinutes: Int
    var elapsedSeconds: Int
    var isCompleted: Bool

    init(id: UUID = UUID(), name: String, estimatedMinutes: Int, elapsedSeconds: Int = 0, isCompleted: Bool = false) {
        self.id = id
        self.name = name
        self.estimatedMinutes = estimatedMinutes
        self.elapsedSeconds = elapsedSeconds
        self.isCompleted = isCompleted
    }

    var estimatedSeconds: Int {
        estimatedMinutes * 60
    }

    var remainingSeconds: Int {
        max(0, estimatedSeconds - elapsedSeconds)
    }

    var isOvertime: Bool {
        elapsedSeconds > estimatedSeconds
    }

    var overtimeSeconds: Int {
        max(0, elapsedSeconds - estimatedSeconds)
    }

    var cost: Double {
        Double(elapsedSeconds) / 3600.0 * 1200.0
    }

    var estimatedCost: Double {
        Double(estimatedMinutes) / 60.0 * 1200.0
    }

    var progress: Double {
        guard estimatedSeconds > 0 else { return 0 }
        return min(Double(elapsedSeconds) / Double(estimatedSeconds), 1.0)
    }
}
