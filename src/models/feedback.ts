import type { DailySummary } from './storage';
import type { TaskItem } from './TaskModel';
import { formatTime, formatCost, HOURLY_RATE } from './TaskModel';

export interface FeedbackResult {
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  gradeColor: string;
  headline: string;
  points: FeedbackPoint[];
}

interface FeedbackPoint {
  type: 'critical' | 'warning' | 'info' | 'praise';
  text: string;
}

export function generateFeedback(summary: DailySummary): FeedbackResult {
  const {
    tasks,
    totalElapsedSeconds,
    totalEstimatedSeconds,
    completedCount,
    totalCount,
  } = summary;

  const completionRate = totalCount > 0 ? completedCount / totalCount : 0;
  const timeRatio = totalEstimatedSeconds > 0 ? totalElapsedSeconds / totalEstimatedSeconds : 0;
  const overtimeTasks = tasks.filter(
    (t) => t.elapsedSeconds > t.estimatedMinutes * 60
  );
  const carryoverTasks = tasks.filter((t: TaskItem) => t.isCarryover);
  const incompleteTasks = tasks.filter((t) => !t.isCompleted);
  const totalCost = (totalElapsedSeconds / 3600) * HOURLY_RATE;
  const estimatedCost = (totalEstimatedSeconds / 3600) * HOURLY_RATE;
  const costOverrun = totalCost - estimatedCost;

  const points: FeedbackPoint[] = [];

  // --- No tasks ---
  if (totalCount === 0) {
    return {
      grade: 'F',
      gradeColor: '#ff3b30',
      headline: 'タスクが1つも登録されていません。仕事をしていないのと同じです。',
      points: [
        { type: 'critical', text: 'タスクの登録すらできないなら、タイマーアプリを使う意味がありません。' },
        { type: 'critical', text: 'まず「今日何をやるか」を明確にする習慣をつけてください。' },
      ],
    };
  }

  // --- Completion rate ---
  if (completionRate === 0) {
    points.push({
      type: 'critical',
      text: `${totalCount}個のタスクがあって完了数がゼロ。これは致命的です。途中で投げ出す癖がついていませんか？`,
    });
  } else if (completionRate < 0.5) {
    points.push({
      type: 'critical',
      text: `完了率${Math.round(completionRate * 100)}%。半分も終わっていません。タスクを取捨選択する判断力が欠けています。`,
    });
  } else if (completionRate < 0.8) {
    points.push({
      type: 'warning',
      text: `完了率${Math.round(completionRate * 100)}%。悪くはないですが、${incompleteTasks.length}個のタスクが未完了のまま放置されています。`,
    });
  } else if (completionRate < 1) {
    points.push({
      type: 'info',
      text: `完了率${Math.round(completionRate * 100)}%。あと${incompleteTasks.length}個で全完了でした。詰めが甘い。`,
    });
  } else {
    points.push({
      type: 'praise',
      text: '全タスク完了。最低限の義務は果たしています。',
    });
  }

  // --- Time management ---
  if (timeRatio > 1.5) {
    points.push({
      type: 'critical',
      text: `見積もりの${Math.round(timeRatio * 100)}%の時間を消費。見積もり能力が壊滅的です。実績: ${formatTime(totalElapsedSeconds)} / 予定: ${formatTime(totalEstimatedSeconds)}`,
    });
  } else if (timeRatio > 1.2) {
    points.push({
      type: 'warning',
      text: `予定時間を${Math.round((timeRatio - 1) * 100)}%超過。「ちょっとオーバー」を毎回繰り返すのは見積もりが甘い証拠です。`,
    });
  } else if (timeRatio > 1.0) {
    points.push({
      type: 'info',
      text: `若干の時間超過(${Math.round((timeRatio - 1) * 100)}%)。許容範囲ですが、改善の余地があります。`,
    });
  } else if (timeRatio > 0 && timeRatio <= 0.5 && completionRate < 1) {
    points.push({
      type: 'warning',
      text: `予定時間の半分しか使っていないのにタスクが未完了。集中力が欠けているか、サボっていませんか？`,
    });
  } else if (timeRatio > 0 && timeRatio <= 1.0 && completionRate === 1) {
    points.push({
      type: 'praise',
      text: `時間内に収めました(使用率${Math.round(timeRatio * 100)}%)。見積もりの精度は許容範囲です。`,
    });
  }

  // --- Overtime tasks ---
  if (overtimeTasks.length > 0) {
    const worst = overtimeTasks.reduce((a, b) =>
      (b.elapsedSeconds - b.estimatedMinutes * 60) > (a.elapsedSeconds - a.estimatedMinutes * 60) ? b : a
    );
    const worstOvertime = worst.elapsedSeconds - worst.estimatedMinutes * 60;
    points.push({
      type: 'warning',
      text: `${overtimeTasks.length}個のタスクが時間超過。最悪は「${worst.name}」で${formatTime(worstOvertime)}の超過。1つのタスクの遅延が全体を崩壊させます。`,
    });
  }

  // --- Cost ---
  if (costOverrun > 0) {
    points.push({
      type: 'warning',
      text: `コスト超過 +${formatCost(costOverrun)}。あなたの非効率さがそのままコストに転嫁されています。`,
    });
  }

  // --- Carryover tasks ---
  if (carryoverTasks.length > 0) {
    const stillIncomplete = carryoverTasks.filter((t) => !t.isCompleted);
    if (stillIncomplete.length > 0) {
      points.push({
        type: 'critical',
        text: `前日からの持ち越しタスクが${carryoverTasks.length}個あり、そのうち${stillIncomplete.length}個がまだ未完了。同じタスクを何日も引きずるのは怠慢です。`,
      });
    } else {
      points.push({
        type: 'info',
        text: `前日からの持ち越し${carryoverTasks.length}個は全て消化。遅れを取り戻したのは評価します。ただし、そもそも持ち越さないのが理想です。`,
      });
    }
  }

  // --- Specific incomplete tasks ---
  if (incompleteTasks.length > 0 && incompleteTasks.length <= 3) {
    const names = incompleteTasks.map((t) => `「${t.name}」`).join('、');
    points.push({
      type: 'info',
      text: `未完了: ${names}。明日に持ち越すつもりですか？ それとも諦めるのですか？ 判断を先送りにしないでください。`,
    });
  }

  // --- Grade ---
  let score = 0;
  score += completionRate * 40; // max 40
  score += Math.max(0, 1 - Math.abs(timeRatio - 1)) * 30; // max 30 (closer to 1.0 is better)
  score += (overtimeTasks.length === 0 ? 15 : Math.max(0, 15 - overtimeTasks.length * 5)); // max 15
  score -= carryoverTasks.filter((t) => !t.isCompleted).length * 10;
  score += (completionRate === 1 ? 15 : 0); // bonus for 100%

  let grade: FeedbackResult['grade'];
  let gradeColor: string;
  let headline: string;

  if (score >= 90) {
    grade = 'S';
    gradeColor = '#34c759';
    headline = '極めて優秀な業務遂行。この水準を維持してください。';
  } else if (score >= 75) {
    grade = 'A';
    gradeColor = '#30d158';
    headline = '概ね良好。ただし「概ね」で満足するなら成長は止まります。';
  } else if (score >= 60) {
    grade = 'B';
    gradeColor = '#007aff';
    headline = '平凡。可もなく不可もなく、つまり何の印象も残らない一日です。';
  } else if (score >= 40) {
    grade = 'C';
    gradeColor = '#ff9500';
    headline = '問題あり。このペースでは信頼を失います。';
  } else if (score >= 20) {
    grade = 'D';
    gradeColor = '#ff6b35';
    headline = '深刻な改善が必要。自分の仕事に責任を持ってください。';
  } else {
    grade = 'F';
    gradeColor = '#ff3b30';
    headline = '論外。今日一日で何を成し遂げたのか、自分に問いかけてください。';
  }

  return { grade, gradeColor, headline, points };
}
