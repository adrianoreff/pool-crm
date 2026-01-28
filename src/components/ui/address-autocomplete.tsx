import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { MapPin, Loader2 } from 'lucide-react';
import { useBusiness } from '@/hooks/useBusiness';

export interface AddressResult {
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  fullAddress: string;
}

interface AddressAutocompleteProps extends Omit<React.ComponentProps<'input'>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (result: AddressResult) => void;
  mapboxToken?: string | null;
}

interface MapboxFeature {
  id: string;
  place_name: string;
  text: string;
  center: [number, number];
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
  properties?: {
    address?: string;
  };
  address?: string;
}

function parseMapboxResult(feature: MapboxFeature): AddressResult {
  const context = feature.context || [];
  
  // Extract address components from context
  let city = '';
  let state = '';
  let zipCode = '';
  
  for (const ctx of context) {
    if (ctx.id.startsWith('place')) {
      city = ctx.text;
    } else if (ctx.id.startsWith('region')) {
      state = ctx.short_code?.replace('US-', '') || ctx.text;
    } else if (ctx.id.startsWith('postcode')) {
      zipCode = ctx.text;
    }
  }
  
  // Get street address - combine house number with street name
  const streetNumber = feature.address || feature.properties?.address || '';
  const streetName = feature.text || '';
  const streetAddress = streetNumber ? `${streetNumber} ${streetName}` : streetName;
  
  return {
    address: streetAddress,
    city,
    state,
    zipCode,
    latitude: feature.center[1],
    longitude: feature.center[0],
    fullAddress: feature.place_name,
  };
}

const AddressAutocomplete = React.forwardRef<HTMLInputElement, AddressAutocompleteProps>(
  ({ className, value, onChange, onAddressSelect, mapboxToken: propToken, ...props }, ref) => {
    const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    
    const { data: business } = useBusiness();
    const mapboxToken = propToken ?? business?.mapbox_public_token;

    const fetchSuggestions = useCallback(async (query: string) => {
      if (!mapboxToken || query.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
          `access_token=${mapboxToken}&` +
          `country=us&` +
          `types=address&` +
          `autocomplete=true&` +
          `limit=5`
        );
        
        if (!response.ok) throw new Error('Failed to fetch suggestions');
        
        const data = await response.json();
        setSuggestions(data.features || []);
        setIsOpen(true);
        setActiveIndex(-1);
      } catch (error) {
        console.error('Address autocomplete error:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, [mapboxToken]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
      
      // Debounce API calls
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(newValue);
      }, 300);
    };

    const handleSelectSuggestion = (feature: MapboxFeature) => {
      const result = parseMapboxResult(feature);
      onChange(result.address);
      onAddressSelect?.(result);
      setSuggestions([]);
      setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < suggestions.length) {
            handleSelectSuggestion(suggestions[activeIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setActiveIndex(-1);
          break;
      }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Cleanup debounce on unmount
    useEffect(() => {
      return () => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
      };
    }, []);

    return (
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Input
            ref={ref || inputRef}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setIsOpen(true)}
            className={cn('pr-8', className)}
            {...props}
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mapboxToken ? (
              <MapPin className="h-4 w-4" />
            ) : null}
          </div>
        </div>

        {isOpen && suggestions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
            <ul className="max-h-60 overflow-auto py-1" role="listbox">
              {suggestions.map((feature, index) => (
                <li
                  key={feature.id}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors',
                    index === activeIndex
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => handleSelectSuggestion(feature)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="truncate">{feature.place_name}</span>
                </li>
              ))}
            </ul>
            <div className="border-t px-3 py-1.5 text-xs text-muted-foreground">
              Powered by Mapbox
            </div>
          </div>
        )}
      </div>
    );
  }
);

AddressAutocomplete.displayName = 'AddressAutocomplete';

export { AddressAutocomplete };
