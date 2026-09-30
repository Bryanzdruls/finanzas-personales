export function ProgressBar({ percent }: { percent: number }) {
  const width = Math.min(Math.max(percent, 0), 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 rounded-full bg-background"
    >
      <div className="h-2 rounded-full bg-accent" style={{ width: `${Math.max(width, 2)}%` }} />
    </div>
  );
}
