import type { DailySummary } from './storage';
import { getCategoryStats, getWeeklyTrends } from './storage';
import type { TaskItem } from './TaskModel';
import { formatTime, formatCost, HOURLY_RATE, CATEGORY_LABELS } from './TaskModel';

export interface FeedbackResult {
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  gradeColor: string;
  headline: string;
  points: FeedbackPoint[];
  actionItems: string[]; // concrete next-step suggestions
}

export interface FeedbackPoint {
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
  const actionItems: string[] = [];

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
      actionItems: ['明日は朝一番にタスクを3つ以上登録してから作業を開始してください。'],
    };
  }

  // --- Completion rate ---
  if (completionRate === 0) {
    points.push({
      type: 'critical',
      text: `${totalCount}個のタスクがあって完了数がゼロ。これは致命的です。途中で投げ出す癖がついていませんか？`,
    });
    actionItems.push('明日は最も簡単なタスクから着手し、まず1つ完了させることを最優先にしてください。');
  } else if (completionRate < 0.5) {
    points.push({
      type: 'critical',
      text: `完了率${Math.round(completionRate * 100)}%。半分も終わっていません。タスクを取捨選択する判断力が欠けています。`,
    });
    actionItems.push('タスク数を減らすか、見積もり時間を現実的に設定し直してください。');
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

  // --- Estimation accuracy ---
  const completedWithTime = tasks.filter((t) => t.isCompleted && t.elapsedSeconds > 0);
  if (completedWithTime.length > 0) {
    const accuracies = completedWithTime.map((t) => t.elapsedSeconds / (t.estimatedMinutes * 60));
    const avgAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
    const worstTask = completedWithTime.reduce((a, b) => {
      const aRatio = a.elapsedSeconds / (a.estimatedMinutes * 60);
      const bRatio = b.elapsedSeconds / (b.estimatedMinutes * 60);
      return Math.abs(bRatio - 1) > Math.abs(aRatio - 1) ? b : a;
    });
    const worstRatio = worstTask.elapsedSeconds / (worstTask.estimatedMinutes * 60);

    if (avgAccuracy > 1.5) {
      points.push({
        type: 'critical',
        text: `見積もり精度: 平均${Math.round(avgAccuracy * 100)}%消費。見積もりが全く機能していません。数字を適当に入れていませんか？`,
      });
      actionItems.push(`見積もりを立てる前に、類似タスクの過去実績を確認する習慣をつけてください。カテゴリ別のヒント機能を活用してください。`);
    } else if (avgAccuracy > 1.2) {
      points.push({
        type: 'warning',
        text: `見積もり精度: 平均${Math.round(avgAccuracy * 100)}%。系統的に過小見積もりしています。`,
      });
      actionItems.push(`見積もりに${Math.round((avgAccuracy - 1) * 100)}%のバッファを加えることを推奨します。`);
    } else if (avgAccuracy >= 0.8 && avgAccuracy <= 1.2) {
      points.push({
        type: 'praise',
        text: `見積もり精度: 平均${Math.round(avgAccuracy * 100)}%。見積もりは妥当な範囲です。`,
      });
    } else if (avgAccuracy < 0.5) {
      points.push({
        type: 'warning',
        text: `見積もり精度: 平均${Math.round(avgAccuracy * 100)}%。過大見積もりです。余裕を持ちすぎて緊張感がなくなっていませんか？`,
      });
    }

    if (worstRatio > 2.0) {
      const cat = worstTask.category ? CATEGORY_LABELS[worstTask.category] : '';
      points.push({
        type: 'warning',
        text: `最も乖離したタスク: 「${worstTask.name}」${cat ? `(${cat})` : ''} — 見積もりの${Math.round(worstRatio * 100)}%。${worstRatio > 3 ? 'このレベルの乖離は見積もりではなく願望です。' : ''}`,
      });
    }
  }

  // --- Time management ---
  if (timeRatio > 1.5) {
    points.push({
      type: 'critical',
      text: `全体で見積もりの${Math.round(timeRatio * 100)}%の時間を消費。実績: ${formatTime(totalElapsedSeconds)} / 予定: ${formatTime(totalEstimatedSeconds)}`,
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
      text: `時間内に収めました(使用率${Math.round(timeRatio * 100)}%)。`,
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
      text: `${overtimeTasks.length}個のタスクが時間超過。最悪は「${worst.name}」で${formatTime(worstOvertime)}の超過。`,
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
    const longCarryover = carryoverTasks.filter((t) => (t.carryoverDays ?? 0) >= 3);

    if (stillIncomplete.length > 0) {
      points.push({
        type: 'critical',
        text: `持ち越し${carryoverTasks.length}個のうち${stillIncomplete.length}個がまだ未完了。同じタスクを何日も引きずるのは怠慢です。`,
      });
    } else {
      points.push({
        type: 'info',
        text: `前日からの持ち越し${carryoverTasks.length}個は全て消化。ただし、そもそも持ち越さないのが理想です。`,
      });
    }

    if (longCarryover.length > 0) {
      const names = longCarryover.map((t) => `「${t.name}」(${t.carryoverDays}日)`).join('、');
      points.push({
        type: 'critical',
        text: `長期持ち越し: ${names}。3日以上放置しているタスクは、やる気がないか、タスク分割が必要です。`,
      });
      actionItems.push('3日以上持ち越しているタスクは、完了可能な小タスクに分割するか、削除を検討してください。');
    }
  }

  // --- Category-based insights (from history) ---
  const catStats = getCategoryStats();
  const worstCategory = catStats.find((c) => c.avgAccuracy > 1.5 && c.count >= 3);
  if (worstCategory) {
    points.push({
      type: 'info',
      text: `カテゴリ分析: 「${worstCategory.label}」の見積もり精度が${Math.round(worstCategory.avgAccuracy * 100)}%と悪い傾向（${worstCategory.count}件の実績）。このカテゴリは見積もりを${Math.round((worstCategory.avgAccuracy - 1) * 100)}%増しにすることを推奨します。`,
    });
  }

  const lowQualityCat = catStats.find((c) => c.avgQuality > 0 && c.avgQuality < 3 && c.count >= 3);
  if (lowQualityCat) {
    points.push({
      type: 'warning',
      text: `「${lowQualityCat.label}」の平均品質が${lowQualityCat.avgQuality.toFixed(1)}/5.0と低水準。このカテゴリの作業方法を根本的に見直すべきです。`,
    });
    actionItems.push(`「${lowQualityCat.label}」タスクの品質改善に集中してください。テンプレート化やチェックリスト導入を検討してください。`);
  }

  // --- Weekly trend comparison ---
  const trends = getWeeklyTrends(2);
  if (trends.length >= 2) {
    const thisWeek = trends[0];
    const lastWeek = trends[1];
    const completionDiff = thisWeek.completionRate - lastWeek.completionRate;
    const accuracyDiff = thisWeek.avgEstimationAccuracy - lastWeek.avgEstimationAccuracy;

    if (completionDiff < -0.15) {
      points.push({
        type: 'warning',
        text: `週次トレンド: 完了率が先週比${Math.round(Math.abs(completionDiff) * 100)}%低下。パフォーマンスが落ちています。`,
      });
    } else if (completionDiff > 0.15) {
      points.push({
        type: 'praise',
        text: `週次トレンド: 完了率が先週比+${Math.round(completionDiff * 100)}%改善。良い傾向です。`,
      });
    }

    if (Math.abs(accuracyDiff) > 0.2) {
      const better = accuracyDiff < 0; // closer to 1.0 is better if was > 1
      if (better && lastWeek.avgEstimationAccuracy > 1) {
        points.push({
          type: 'praise',
          text: `見積もり精度が改善傾向(${Math.round(lastWeek.avgEstimationAccuracy * 100)}%→${Math.round(thisWeek.avgEstimationAccuracy * 100)}%)。`,
        });
      }
    }
  }

  // --- Quality self-assessment ---
  const ratedTasks = tasks.filter((t) => t.qualityRating);
  const unratedCompleted = tasks.filter((t) => t.isCompleted && !t.qualityRating);
  const avgQuality = ratedTasks.length > 0
    ? ratedTasks.reduce((s, t) => s + (t.qualityRating ?? 0), 0) / ratedTasks.length
    : 0;

  if (unratedCompleted.length > 0) {
    points.push({
      type: 'warning',
      text: `${unratedCompleted.length}個の完了タスクが未評価。自分の仕事の質を振り返る習慣がない人は成長しません。`,
    });
    actionItems.push('完了タスクには必ず星評価をつけてください。振り返りが成長の第一歩です。');
  }

  if (ratedTasks.length > 0) {
    if (avgQuality <= 2.0) {
      points.push({
        type: 'critical',
        text: `平均クオリティ${avgQuality.toFixed(1)}/5.0。自分でも質が低いと認識しているなら、なぜ改善しないのですか？`,
      });
      actionItems.push('低品質タスクの共通点（カテゴリ、時間帯、見積もり乖離）を分析し、パターンを特定してください。');
    } else if (avgQuality <= 3.0) {
      points.push({
        type: 'warning',
        text: `平均クオリティ${avgQuality.toFixed(1)}/5.0。「普通」で満足していませんか？ 普通の仕事は誰にでもできます。`,
      });
    } else if (avgQuality <= 4.0) {
      points.push({
        type: 'info',
        text: `平均クオリティ${avgQuality.toFixed(1)}/5.0。自己評価は高めですが、客観的ですか？`,
      });
    } else {
      points.push({
        type: 'warning',
        text: `平均クオリティ${avgQuality.toFixed(1)}/5.0。全て最高評価？ 自分に甘すぎます。`,
      });
    }

    const lowQualityOvertime = ratedTasks.filter(
      (t) => (t.qualityRating ?? 0) <= 2 && t.elapsedSeconds > t.estimatedMinutes * 60
    );
    if (lowQualityOvertime.length > 0) {
      const names = lowQualityOvertime.map((t) => `「${t.name}」`).join('、');
      points.push({
        type: 'critical',
        text: `${names}は時間超過かつ低品質。時間をかけた上に質も低いのは最悪の結果です。`,
      });
    }

    const highRatingOvertime = ratedTasks.filter(
      (t) => (t.qualityRating ?? 0) >= 4 && t.elapsedSeconds > t.estimatedMinutes * 60 * 1.3
    );
    if (highRatingOvertime.length > 0) {
      points.push({
        type: 'warning',
        text: `高品質を自称するタスクが${highRatingOvertime.length}個ありますが、いずれも時間超過。品質と効率の両立ができていません。`,
      });
    }
  }

  // --- Specific incomplete tasks ---
  if (incompleteTasks.length > 0 && incompleteTasks.length <= 3) {
    const names = incompleteTasks.map((t) => `「${t.name}」`).join('、');
    points.push({
      type: 'info',
      text: `未完了: ${names}。明日に持ち越すつもりですか？ 判断を先送りにしないでください。`,
    });
  }

  // --- Grade ---
  let score = 0;
  score += completionRate * 30;
  score += Math.max(0, 1 - Math.abs(timeRatio - 1)) * 20;
  score += (overtimeTasks.length === 0 ? 10 : Math.max(0, 10 - overtimeTasks.length * 3));
  score -= carryoverTasks.filter((t) => !t.isCompleted).length * 10;
  score += (completionRate === 1 ? 10 : 0);

  // Estimation accuracy bonus (max 15)
  if (completedWithTime.length > 0) {
    const avgAcc = completedWithTime.reduce((s, t) => s + t.elapsedSeconds / (t.estimatedMinutes * 60), 0) / completedWithTime.length;
    score += Math.max(0, 1 - Math.abs(avgAcc - 1)) * 15;
  }

  // Quality contribution: max 10
  if (ratedTasks.length > 0) {
    score += (avgQuality / 5) * 10;
  } else if (completedCount > 0) {
    score -= 5;
  }
  if (ratedTasks.length >= 3 && avgQuality >= 4.8) {
    score -= 5;
  }

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

  return { grade, gradeColor, headline, points, actionItems };
}
