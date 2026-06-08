interface PanelHeaderProps {
  title: string;
  subtitle?: string;
  live?: boolean;
  right?: React.ReactNode;
}

export default function PanelHeader({ title, subtitle, live, right }: PanelHeaderProps) {
  return (
    <div className="panel-header">
      <span className={`dot ${live ? 'live' : ''}`} />
      <span className="title">{title}</span>
      {subtitle && <span style={{ color: 'var(--terminal-text-dim)' }}>{subtitle}</span>}
      {right && <span style={{ marginLeft: 'auto' }}>{right}</span>}
    </div>
  );
}
