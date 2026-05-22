import { formatDurationMinutes, formatMiles } from '@/lib/mapbox/route-metrics';

interface RouteDayStatsProps {
  completed: number;
  total: number;
  pct: number;
  totalMiles: number;
  remainingMiles: number;
  totalMinutes: number;
  hasMapbox: boolean;
}

export function RouteDayStats({
  completed,
  total,
  pct,
  totalMiles,
  remainingMiles,
  totalMinutes,
  hasMapbox,
}: RouteDayStatsProps) {
  const milesLabel = hasMapbox
    ? remainingMiles > 0
      ? `-${formatMiles(remainingMiles).replace(' mi', '')} mi`
      : formatMiles(totalMiles)
    : '—';
  const barWidth = pct;

  return (
    <div className="flex gap-4 px-3 py-4 bg-white border-b">
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-slate-200" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            className="stroke-[#F97316]"
            strokeWidth="3"
            strokeDasharray={`${barWidth} 100`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-sm font-bold text-slate-800">
          {completed}/{total}
        </span>
      </div>
      <div className="flex-1 flex flex-col justify-center gap-3 min-w-0">
        <div>
          <div className="flex justify-between text-xs text-slate-600 mb-1">
            <span>Miles</span>
            <span className="font-medium">{milesLabel}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-[#F97316] rounded-full transition-all"
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-slate-600 mb-1">
            <span>Time</span>
            <span className="font-medium">{formatDurationMinutes(totalMinutes)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-[#F97316] rounded-full transition-all"
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
