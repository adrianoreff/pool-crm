import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useRouteDay } from '@/hooks/useRouteDay';
import { useReorderRouteStops } from '@/hooks/useRoutes';
import { RouteDayStats } from '@/components/technician/RouteDayStats';
import { RouteDayStopList } from '@/components/technician/RouteDayStopList';
import { parseLocalDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { RouteDayStop } from '@/hooks/useRouteDay';

function buildFullAddress(stop: RouteDayStop): string {
  return [stop.address, stop.city, stop.state, stop.zip_code].filter(Boolean).join(', ');
}

export default function RouteDay() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const routeDate = date ?? '';
  const {
    profile,
    mapboxToken,
    stops,
    reorderStops,
    stats,
    nextStop,
    isLoading,
    metricsLoading,
  } = useRouteDay(routeDate);
  const reorderMutation = useReorderRouteStops();

  const techName = profile
    ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Technician'
    : 'Technician';
  const dateLabel = routeDate
    ? parseLocalDate(routeDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const handlePersistReorder = async (ordered: RouteDayStop[]) => {
    const payload = ordered
      .filter((s) => s.route_stop_id)
      .map((s, i) => ({ id: s.route_stop_id!, sort_order: i }));
    if (!payload.length) return;
    try {
      await reorderMutation.mutateAsync(payload);
    } catch (e) {
      toast({
        title: 'Could not save order',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDirections = () => {
    if (!nextStop) return;
    const address = buildFullAddress(nextStop);
    if (mapboxToken && nextStop.latitude && nextStop.longitude) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          window.open(
            `https://www.mapbox.com/directions/?origin=${latitude},${longitude}&destination=${nextStop.latitude},${nextStop.longitude}`,
            '_blank'
          );
        },
        () => {
          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
        }
      );
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#F97316]" />
      </div>
    );
  }

  const nextStopAddress = nextStop ? buildFullAddress(nextStop) : '';

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] -mx-0 bg-slate-100">
      <header className="bg-[#F97316] text-white px-3 py-3 flex items-center gap-3 sticky top-0 z-20">
        <button
          type="button"
          onClick={() => navigate('/technician/dashboard')}
          className="p-1 rounded hover:bg-white/10"
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{techName}</div>
          <div className="text-sm text-orange-100">{dateLabel}</div>
        </div>
      </header>

      <RouteDayStats
        completed={stats.completed}
        total={stats.total}
        pct={stats.pct}
        totalMiles={stats.totalMiles}
        remainingMiles={stats.remainingMiles}
        totalMinutes={stats.totalMinutes}
        hasMapbox={!!mapboxToken}
      />

      {metricsLoading && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-slate-500 bg-white border-b">
          <Loader2 className="h-3 w-3 animate-spin text-[#F97316]" />
          Updating route…
        </div>
      )}

      <div className="flex-1 bg-white">
        <RouteDayStopList
          stops={stops}
          onReorder={reorderStops}
          onPersistReorder={handlePersistReorder}
        />
      </div>

      {nextStop && (
        <div
          className="fixed left-0 right-0 z-30 bg-[#F97316] text-white px-4 py-3 flex items-start gap-3"
          style={{ bottom: '4rem' }}
        >
          <Zap className="h-5 w-5 shrink-0 opacity-90 mt-0.5" />
          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={handleDirections}
              className="text-sm font-medium truncate w-full text-left hover:opacity-90 active:opacity-80"
            >
              Directions to {nextStop.customer?.first_name} {nextStop.customer?.last_name} &gt;
            </button>
            <button
              type="button"
              onClick={handleDirections}
              className="text-xs text-orange-100 underline text-left w-full truncate mt-1 hover:text-white active:text-white"
            >
              {nextStopAddress}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
