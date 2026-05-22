import { useMemo, useState, useEffect, useCallback } from 'react';
import { useTechnicianAppointments, sortTechnicianRouteStops } from '@/hooks/useTechnicianAppointments';
import { useBusiness } from '@/hooks/useBusiness';
import { useAuth } from '@/contexts/AuthContext';
import { geocodeAddress, type LngLat } from '@/lib/mapbox/geocode';
import { fetchRouteMetrics, clearRouteMetricsCache, type RouteMetrics } from '@/lib/mapbox/route-metrics';
import {
  buildRouteSchedule,
  DEFAULT_SERVICE_MINUTES,
  totalRouteMinutes,
  type ScheduledStop,
} from '@/lib/route-schedule';
import type { AppointmentWithRelations } from '@/types/database';

export type RouteDayStop = AppointmentWithRelations & {
  route_stop?: { sort_order: number; est_minutes?: number | null } | null;
  coords?: LngLat | null;
  schedule?: ScheduledStop;
  legMiles?: number;
  canReorder: boolean;
};

function buildAddressLine(apt: AppointmentWithRelations): string {
  const parts = [apt.address, apt.city, apt.state, apt.zip_code].filter(Boolean);
  return parts.join(', ');
}

function aptToCoords(apt: AppointmentWithRelations): LngLat | null {
  const lat = apt.latitude != null ? Number(apt.latitude) : null;
  const lng = apt.longitude != null ? Number(apt.longitude) : null;
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    return { latitude: lat, longitude: lng };
  }
  const c = apt.customer;
  if (c?.latitude != null && c?.longitude != null) {
    return { latitude: Number(c.latitude), longitude: Number(c.longitude) };
  }
  return null;
}

export function useRouteDay(date: string) {
  const { profile } = useAuth();
  const { data: business } = useBusiness();
  const mapboxToken = business?.mapbox_public_token ?? '';
  const { data: appointments = [], isLoading: apptsLoading } = useTechnicianAppointments({
    dateFrom: date,
    dateTo: date,
  });

  const [orderedStops, setOrderedStops] = useState<RouteDayStop[]>([]);
  const [metrics, setMetrics] = useState<RouteMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [coordsReady, setCoordsReady] = useState(false);

  const baseStops = useMemo(() => {
    const active = appointments.filter((a) => a.status !== 'cancelled');
    return sortTechnicianRouteStops(active) as RouteDayStop[];
  }, [appointments]);

  useEffect(() => {
    let cancelled = false;
    async function resolveCoords() {
      setCoordsReady(false);
      const withCoords: RouteDayStop[] = [];
      for (const apt of baseStops) {
        let coords = aptToCoords(apt);
        if (!coords && mapboxToken) {
          const addr = buildAddressLine(apt);
          if (addr) coords = await geocodeAddress(addr, mapboxToken);
        }
        withCoords.push({
          ...apt,
          coords,
          canReorder: !!apt.route_stop_id,
        });
      }
      if (!cancelled) {
        setOrderedStops(withCoords);
        setCoordsReady(true);
      }
    }
    if (baseStops.length) resolveCoords();
    else {
      setOrderedStops([]);
      setCoordsReady(true);
    }
    return () => {
      cancelled = true;
    };
  }, [baseStops, mapboxToken]);

  const recomputeMetricsAndSchedule = useCallback(
    async (stops: RouteDayStop[]) => {
      if (!stops.length) {
        setMetrics(null);
        return stops.map((s) => ({ ...s }));
      }

      const coords = stops.map((s) => s.coords).filter((c): c is LngLat => !!c);
      setMetricsLoading(true);
      let routeMetrics: RouteMetrics | null = null;
      if (coords.length >= 2 && mapboxToken) {
        routeMetrics = await fetchRouteMetrics(coords, mapboxToken);
      }
      setMetrics(routeMetrics);
      setMetricsLoading(false);

      const serviceMins = stops.map(
        (s) => s.route_stop?.est_minutes ?? DEFAULT_SERVICE_MINUTES
      );
      const driveLegMins: number[] = [0];
      if (routeMetrics?.legs.length) {
        for (let i = 0; i < stops.length; i++) {
          if (i === 0) driveLegMins[0] = 0;
          else {
            const leg = routeMetrics.legs[i - 1];
            driveLegMins[i] = leg ? leg.durationSeconds / 60 : 0;
          }
        }
      } else {
        for (let i = 0; i < stops.length; i++) driveLegMins[i] = i === 0 ? 0 : 0;
      }

      const schedule = buildRouteSchedule(stops.length, serviceMins, driveLegMins);

      return stops.map((s, i) => ({
        ...s,
        schedule: schedule[i],
        legMiles:
          i === 0
            ? 0
            : routeMetrics?.legs[i - 1]
              ? routeMetrics.legs[i - 1].distanceMeters / 1609.344
              : 0,
      }));
    },
    [mapboxToken]
  );

  useEffect(() => {
    if (!coordsReady || !orderedStops.length) return;
    let cancelled = false;
    (async () => {
      const enriched = await recomputeMetricsAndSchedule(orderedStops);
      if (!cancelled) setOrderedStops(enriched);
    })();
    return () => {
      cancelled = true;
    };
  }, [coordsReady]); // eslint-disable-line react-hooks/exhaustive-deps -- initial metrics after coords

  const stats = useMemo(() => {
    const total = orderedStops.length;
    const completed = orderedStops.filter((s) => s.status === 'completed').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const serviceMins = orderedStops.map(
      (s) => s.route_stop?.est_minutes ?? DEFAULT_SERVICE_MINUTES
    );
    const driveLegMins = orderedStops.map((s, i) =>
      i === 0 ? 0 : (metrics?.legs[i - 1]?.durationSeconds ?? 0) / 60
    );
    const totalMin = totalRouteMinutes(serviceMins, driveLegMins);
    const remainingMiles = orderedStops
      .filter((s) => s.status !== 'completed')
      .reduce((sum, s, i) => {
        if (i === 0) return sum;
        return sum + (s.legMiles ?? 0);
      }, 0);
    return {
      total,
      completed,
      remaining: total - completed,
      pct,
      totalMiles: metrics?.totalMiles ?? 0,
      remainingMiles,
      totalMinutes: totalMin,
    };
  }, [orderedStops, metrics]);

  const nextStop = useMemo(
    () => orderedStops.find((s) => s.status !== 'completed' && s.status !== 'cancelled'),
    [orderedStops]
  );

  const reorderStops = useCallback(
    async (newOrder: RouteDayStop[]) => {
      clearRouteMetricsCache();
      setOrderedStops(newOrder);
      const enriched = await recomputeMetricsAndSchedule(newOrder);
      setOrderedStops(enriched);
      return enriched;
    },
    [recomputeMetricsAndSchedule]
  );

  return {
    date,
    profile,
    mapboxToken,
    stops: orderedStops,
    setStops: setOrderedStops,
    reorderStops,
    metrics,
    metricsLoading,
    stats,
    nextStop,
    isLoading: apptsLoading || !coordsReady,
  };
}
