import { useState, useEffect } from 'react';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const API_URL = 'https://rfbkwdpilwmdnaurlxhm.supabase.co/functions/v1';

interface TimeSlot {
  time: string;
  available: boolean;
  techniciansAvailable: number;
}

interface WidgetDateTimePickerProps {
  embedCode: string;
  serviceId: string;
  serviceDuration: number;
  bookingRules: {
    advanceBookingDays: number;
    minimumNoticeHours: number;
    allowSameDay: boolean;
  };
  primaryColor: string;
  borderColor: string;
  onSelect: (date: Date, time: string) => void;
  onBack: () => void;
}

export function WidgetDateTimePicker({
  embedCode,
  serviceId,
  serviceDuration,
  bookingRules,
  primaryColor,
  borderColor,
  onSelect,
  onBack,
}: WidgetDateTimePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = startOfDay(new Date());
  const minDate = bookingRules.allowSameDay ? today : addDays(today, 1);
  const maxDate = addDays(today, bookingRules.advanceBookingDays);

  // Fetch availability when date changes
  useEffect(() => {
    if (!selectedDate) return;

    setIsLoading(true);
    setError(null);
    setSlots([]);
    setSelectedTime(null);

    fetch(`${API_URL}/widget-availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embedCode,
        date: format(selectedDate, 'yyyy-MM-dd'),
        serviceId,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch availability');
        return res.json();
      })
      .then((data) => {
        setSlots(data.slots || []);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedDate, embedCode, serviceId]);

  const handleContinue = () => {
    if (selectedDate && selectedTime) {
      onSelect(selectedDate, selectedTime);
    }
  };

  const availableSlots = slots.filter((s) => s.available);

  return (
    <div className="space-y-6">
      {/* Calendar */}
      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          disabled={(date) => 
            isBefore(date, minDate) || 
            isBefore(maxDate, date)
          }
          className={cn("rounded-lg border p-3 pointer-events-auto")}
          style={{ borderColor }}
        />
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div>
          <h3 className="font-medium mb-3">
            Available times for {format(selectedDate, 'EEEE, MMMM d')}
          </h3>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-destructive text-sm py-4">{error}</p>
          ) : availableSlots.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No available times for this date. Please select another date.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {availableSlots.map((slot) => {
                const isSelected = selectedTime === slot.time;
                return (
                  <button
                    key={slot.time}
                    onClick={() => setSelectedTime(slot.time)}
                    className={cn(
                      "p-3 rounded-lg border text-sm font-medium transition-all",
                      isSelected 
                        ? "border-2 shadow-sm" 
                        : "hover:border-primary"
                    )}
                    style={{
                      borderColor: isSelected ? primaryColor : borderColor,
                      backgroundColor: isSelected ? `${primaryColor}10` : 'transparent',
                    }}
                  >
                    <div>{slot.time}</div>
                    {slot.techniciansAvailable > 0 && (
                      <div className="flex items-center justify-center mt-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3 mr-1" />
                        {slot.techniciansAvailable}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!selectedDate || !selectedTime}
          className="flex-1"
          style={{ 
            backgroundColor: primaryColor,
            color: 'white',
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
