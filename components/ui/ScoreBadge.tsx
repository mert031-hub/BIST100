interface ScoreBadgeProps {
  score: number;
}

export default function ScoreBadge({ score }: ScoreBadgeProps) {
  const cls = score >= 80 ? 'score-badge score-high' : score >= 55 ? 'score-badge score-mid' : 'score-badge score-low';
  return <span className={cls}>{score}</span>;
}
