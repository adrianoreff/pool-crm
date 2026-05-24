import { useState, useMemo, useEffect, useRef } from 'react';
import { useRoutes, dateToDayOfWeek } from '@/hooks/useRoutes';
import { useCustomers } from '@/hooks/useCustomers';
import { useBusiness } from '@/hooks/useBusiness';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getLocalDateString } from '@/lib/utils';
import { MapPin, Loader2 } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { geocodeAddress } from '@/lib/mapbox/geocode';
import type { CustomerWithAddresses } from '@/types/database';

type StatusFilter = 'all' | 'active' | 'inactive';

const MARKER_COLORS = {
  active: '#F97316',
  inactive: '#94A3B8',
} as const;

type MapCustomer = {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
  latitude: number;
  longitude: number;
};

function buildCustomerAddress(customer: CustomerWithAddresses): string {
  const primary =
    customer.customer_addresses?.find((a) => a.is_primary) ?? customer.customer_addresses?.[0];
  if (primary) {
    return [primary.address, primary.city, primary.state, primary.zip_code].filter(Boolean).join(', ');
  }
  return [customer.address, customer.city, customer.state, customer.zip_code].filter(Boolean).join(', ');
}

function customerIsActive(customer: CustomerWithAddresses): boolean {
  return customer.is_active !== false;
}

function getCustomerCoords(
  customer: CustomerWithAddresses,
  geocoded: Record<string, { latitude: number; longitude: number }>
): { latitude: number; longitude: number } | null {
  const lat = customer.latitude ?? geocoded[customer.id]?.latitude ?? null;
  const lng = customer.longitude ?? geocoded[customer.id]?.longitude ?? null;
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    return { latitude: lat, longitude: lng };
  }

  const primary =
    customer.customer_addresses?.find((a) => a.is_primary) ?? customer.customer_addresses?.[0];
  if (primary?.latitude != null && primary?.longitude != null) {
    return { latitude: Number(primary.latitude), longitude: Number(primary.longitude) };
  }

  const geo = geocoded[customer.id];
  return geo ?? null;
}

function createMarkerElement(color: string): HTMLDivElement {
  const el = document.createElement('div');
  el.style.width = '22px';
  el.style.height = '22px';
  el.style.borderRadius = '50%';
  el.style.backgroundColor = color;
  el.style.border = '2px solid white';
  el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)';
  el.style.cursor = 'pointer';
  return el;
}

export default function RoutesMap() {
  const [date, setDate] = useState(getLocalDateString());
  const [techFilter, setTechFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { data: routes = [] } = useRoutes();
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: business } = useBusiness();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodedByCustomerId, setGeocodedByCustomerId] = useState<
    Record<string, { latitude: number; longitude: number }>
  >({});
  const geocodedRef = useRef(geocodedByCustomerId);
  geocodedRef.current = geocodedByCustomerId;

  const dayOfWeek = dateToDayOfWeek(date);
  const routesForDay = routes.filter((r) => r.day_of_week === dayOfWeek && r.is_active !== false);

  const technicians = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];
    for (const route of routes) {
      if (!route.technician_id || seen.has(route.technician_id)) continue;
      seen.add(route.technician_id);
      list.push({
        id: route.technician_id,
        name: route.technician
          ? `${route.technician.first_name ?? ''} ${route.technician.last_name ?? ''}`.trim()
          : 'Technician',
      });
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [routes]);

  const techRouteCustomerIds = useMemo(() => {
    if (techFilter === 'all') return null;
    const ids = new Set<string>();
    routes
      .filter((r) => r.day_of_week === dayOfWeek && r.technician_id === techFilter)
      .forEach((route) => {
        route.stops
          ?.filter((s) => s.is_active !== false)
          .forEach((s) => ids.add(s.customer_id));
      });
    return ids;
  }, [routes, dayOfWeek, techFilter]);

  const filteredCustomers = useMemo(() => {
    let list = customers;
    if (statusFilter === 'active') {
      list = list.filter((c) => customerIsActive(c));
    } else if (statusFilter === 'inactive') {
      list = list.filter((c) => !customerIsActive(c));
    }
    if (techRouteCustomerIds) {
      list = list.filter((c) => techRouteCustomerIds.has(c.id));
    }
    return list;
  }, [customers, statusFilter, techRouteCustomerIds]);

  const mapCustomers = useMemo((): MapCustomer[] => {
    const result: MapCustomer[] = [];
    for (const customer of filteredCustomers) {
      const coords = getCustomerCoords(customer, geocodedByCustomerId);
      if (!coords) continue;
      result.push({
        id: customer.id,
        name: `${customer.first_name} ${customer.last_name ?? ''}`.trim(),
        address: buildCustomerAddress(customer),
        isActive: customerIsActive(customer),
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    }
    return result;
  }, [filteredCustomers, geocodedByCustomerId]);

  const stats = useMemo(() => {
    const active = mapCustomers.filter((c) => c.isActive).length;
    const inactive = mapCustomers.length - active;
    return { active, inactive, total: mapCustomers.length };
  }, [mapCustomers]);

  // Geocode customers missing coordinates
  useEffect(() => {
    const token = business?.mapbox_public_token;
    if (!token || !filteredCustomers.length) return;

    const missing = filteredCustomers.filter((c) => {
      if (getCustomerCoords(c, geocodedRef.current)) return false;
      return !!buildCustomerAddress(c);
    });
    if (!missing.length) return;

    const controller = new AbortController();
    setGeocodeLoading(true);

    (async () => {
      for (const customer of missing.slice(0, 50)) {
        if (controller.signal.aborted) break;
        if (geocodedRef.current[customer.id]) continue;
        const addr = buildCustomerAddress(customer);
        if (!addr) continue;
        const coords = await geocodeAddress(addr, token, controller.signal);
        if (coords) {
          setGeocodedByCustomerId((prev) =>
            prev[customer.id] ? prev : { ...prev, [customer.id]: { latitude: coords.latitude, longitude: coords.longitude } }
          );
        }
      }
    })().finally(() => {
      if (!controller.signal.aborted) setGeocodeLoading(false);
    });

    return () => controller.abort();
  }, [filteredCustomers, business?.mapbox_public_token]);

  // Initialize map once
  useEffect(() => {
    const token = business?.mapbox_public_token;
    if (!mapContainer.current || !token) return;

    mapboxgl.accessToken = token;
    if (mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-117.1, 33.1],
      zoom: 10,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.on('load', () => setMapReady(true));

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [business?.mapbox_public_token]);

  // Update markers when data or filters change
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    mapCustomers.forEach((customer) => {
      const color = customer.isActive ? MARKER_COLORS.active : MARKER_COLORS.inactive;
      const statusLabel = customer.isActive ? 'Active' : 'Inactive';
      const marker = new mapboxgl.Marker({ element: createMarkerElement(color) })
        .setLngLat([customer.longitude, customer.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 16 }).setHTML(
            `<strong>${customer.name}</strong><br/>
            <span style="color:${color};font-size:12px;font-weight:600;">${statusLabel}</span><br/>
            <span style="font-size:12px;color:#64748b;">${customer.address}</span>`
          )
        )
        .addTo(map);
      markersRef.current.push(marker);
    });

    if (mapCustomers.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      mapCustomers.forEach((c) => bounds.extend([c.longitude, c.latitude]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 800 });
    }
  }, [mapCustomers, mapReady]);

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-7 w-7 text-primary" />
            Routes Map
          </h1>
        </div>
        <div>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label>Technician</Label>
          <Select value={techFilter} onValueChange={setTechFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All techs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Techs</SelectItem>
              {technicians.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!business?.mapbox_public_token ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Add your Mapbox public token in Settings to view the map.
          </CardContent>
        </Card>
      ) : (
        <div className="relative flex-1 min-h-[400px]">
          <div ref={mapContainer} className="h-full w-full rounded-lg border" />
          {(customersLoading || geocodeLoading) && (
            <div className="absolute top-3 right-3 flex items-center gap-2 rounded-md bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow border">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading locations…
            </div>
          )}
          {!customersLoading && mapCustomers.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-background/60 text-muted-foreground gap-2 pointer-events-none">
              <MapPin className="h-8 w-8" />
              <p className="text-sm">No customers with location data for this filter.</p>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium">
          {routesForDay.length} routes · {stats.total} customers on map
          {stats.total > 0 && ` (${stats.active} active, ${stats.inactive} inactive)`}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full border border-white shadow"
              style={{ backgroundColor: MARKER_COLORS.active }}
            />
            Active
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full border border-white shadow"
              style={{ backgroundColor: MARKER_COLORS.inactive }}
            />
            Inactive
          </div>
        </div>
      </div>
    </div>
  );
}
