import { useState, useMemo } from 'react';
import { useRoutes, dateToDayOfWeek } from '@/hooks/useRoutes';
import { useAppointments } from '@/hooks/useAppointments';
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
import { MapPin } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef } from 'react';

export default function RoutesMap() {
  const [date, setDate] = useState(getLocalDateString());
  const [techFilter, setTechFilter] = useState<string>('all');
  const { data: routes = [] } = useRoutes();
  const { data: business } = useBusiness();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const dayOfWeek = dateToDayOfWeek(date);
  const { data: appointments = [] } = useAppointments({ dateFrom: date, dateTo: date });

  const filteredAppts = useMemo(() => {
    let list = appointments.filter((a) => a.latitude && a.longitude);
    if (techFilter !== 'all') {
      list = list.filter((a) => a.technician_id === techFilter);
    }
    return list;
  }, [appointments, techFilter]);

  const technicians = useMemo(() => {
    const ids = new Set(routes.map((r) => r.technician_id));
    return routes
      .filter((r) => ids.has(r.technician_id))
      .map((r) => ({
        id: r.technician_id,
        name: r.technician
          ? `${r.technician.first_name} ${r.technician.last_name}`
          : 'Technician',
      }));
  }, [routes]);

  const routesForDay = routes.filter((r) => r.day_of_week === dayOfWeek);

  useEffect(() => {
    const token = business?.mapbox_public_token;
    if (!mapContainer.current || !token) return;

    mapboxgl.accessToken = token;
    if (mapRef.current) mapRef.current.remove();

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-117.1, 33.1],
      zoom: 10,
    });
    mapRef.current = map;

    map.on('load', () => {
      filteredAppts.forEach((a) => {
        if (!a.longitude || !a.latitude) return;
        new mapboxgl.Marker({ color: '#0EA5E9' })
          .setLngLat([a.longitude, a.latitude])
          .setPopup(
            new mapboxgl.Popup().setHTML(
              `<strong>${a.customer?.first_name} ${a.customer?.last_name || ''}</strong><br/>${a.address}`
            )
          )
          .addTo(map);
      });
      if (filteredAppts.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        filteredAppts.forEach((a) => {
          if (a.longitude && a.latitude) bounds.extend([a.longitude, a.latitude]);
        });
        map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [filteredAppts, business?.mapbox_public_token]);

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
      </div>

      {!business?.mapbox_public_token ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Add your Mapbox public token in Settings to view the map.
          </CardContent>
        </Card>
      ) : (
        <div ref={mapContainer} className="flex-1 min-h-[400px] rounded-lg border" />
      )}

      <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium">
        {routesForDay.length} routes · {filteredAppts.length} pools on map
      </div>
    </div>
  );
}
