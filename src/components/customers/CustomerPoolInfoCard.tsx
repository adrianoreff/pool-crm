import { Droplets } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePoolProfile } from '@/hooks/usePoolProfile';
import {
  getPoolTypeLabel,
  getSanitizerLabel,
} from '@/lib/pool-profile-form';
import { Loader2 } from 'lucide-react';

interface CustomerPoolInfoCardProps {
  customerId: string;
}

export function CustomerPoolInfoCard({ customerId }: CustomerPoolInfoCardProps) {
  const { data: profile, isLoading } = usePoolProfile(customerId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Droplets className="h-4 w-4" />
            Pool Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No pool details saved. Edit customer to add.</p>
        </CardContent>
      </Card>
    );
  }

  const bodies: string[] = [];
  if (profile.has_pool) bodies.push('Pool');
  if (profile.has_spa) bodies.push('Spa');
  if (profile.has_water_feature) bodies.push('Water feature');

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Droplets className="h-4 w-4" />
          Pool Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          {bodies.map((b) => (
            <Badge key={b} variant="secondary">
              {b}
            </Badge>
          ))}
        </div>
        {(profile.pool_type || profile.sanitizer_type) && (
          <p className="text-muted-foreground">
            {profile.pool_type && (
              <span>
                Style: <span className="text-foreground">{getPoolTypeLabel(profile.pool_type)}</span>
              </span>
            )}
            {profile.pool_type && profile.sanitizer_type && ' · '}
            {profile.sanitizer_type && (
              <span>
                Sanitizer: <span className="text-foreground">{getSanitizerLabel(profile.sanitizer_type)}</span>
              </span>
            )}
          </p>
        )}
        {profile.minutes_at_stop != null && (
          <p>
            <span className="text-muted-foreground">Minutes at stop: </span>
            {profile.minutes_at_stop}
          </p>
        )}
        {profile.location_notes && (
          <p>
            <span className="text-muted-foreground">Location notes: </span>
            {profile.location_notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
