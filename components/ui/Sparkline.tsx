'use client';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  positive?: boolean;
}

export default function Sparkline({ data, width = 55, height = 20, positive }: SparklineProps) {
  if (!data || data.length < 2) return <span style={{ width, height, display: 'inline-block' }} />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  const color = positive === undefined
    ? (data[data.length - 1] >= data[0] ? '#5aac4f' : '#c05050')
    : positive ? '#5aac4f' : '#c05050';

  return (
    <svg width={width} height={height} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}
