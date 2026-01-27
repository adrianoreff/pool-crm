import { Clock, DollarSign, ChevronRight } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_min: number | null;
  duration_max: number | null;
  base_price_min: number | null;
  base_price_max: number | null;
}

interface WidgetServiceSelectProps {
  services: Service[];
  primaryColor: string;
  onSelect: (service: Service) => void;
}

export function WidgetServiceSelect({ services, primaryColor, onSelect }: WidgetServiceSelectProps) {
  const formatDuration = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    if (min === max || !max) return `${min || max} min`;
    return `${min}-${max} min`;
  };

  const formatPrice = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    if (min === max || !max) return `$${min || max}`;
    return `$${min}-$${max}`;
  };

  if (services.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No services available at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {services.map((service) => {
        const duration = formatDuration(service.duration_min, service.duration_max);
        const price = formatPrice(service.base_price_min, service.base_price_max);

        return (
          <button
            key={service.id}
            onClick={() => onSelect(service)}
            className="w-full text-left p-4 rounded-xl border transition-all hover:shadow-md group"
            style={{ 
              borderColor: 'hsl(var(--border))',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = primaryColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'hsl(var(--border))';
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground truncate">{service.name}</h3>
                {service.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {service.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2">
                  {duration && (
                    <span className="inline-flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      {duration}
                    </span>
                  )}
                  {price && (
                    <span className="inline-flex items-center text-xs text-muted-foreground">
                      <DollarSign className="h-3 w-3 mr-0.5" />
                      {price}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight 
                className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform ml-3 flex-shrink-0"
                style={{ color: primaryColor }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
