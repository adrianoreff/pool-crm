import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { WidgetServiceSelect } from '@/components/widget/WidgetServiceSelect';
import { WidgetDateTimePicker } from '@/components/widget/WidgetDateTimePicker';
import { WidgetCustomerForm } from '@/components/widget/WidgetCustomerForm';
import { WidgetConfirmation } from '@/components/widget/WidgetConfirmation';

const API_URL = 'https://rfbkwdpilwmdnaurlxhm.supabase.co/functions/v1';

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_min: number | null;
  duration_max: number | null;
  base_price_min: number | null;
  base_price_max: number | null;
}

interface WidgetConfig {
  business: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  };
  appearance: {
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
    borderColor: string;
    buttonText: string;
    buttonTextColor: string;
  };
  services: Service[];
  bookingRules: {
    advanceBookingDays: number;
    minimumNoticeHours: number;
    allowSameDay: boolean;
  };
}

interface CustomerInfo {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  notes: string;
}

interface BookingResult {
  id: string;
  referenceCode: string;
  portalToken: string;
}

export default function BookingWidget() {
  const { embedCode } = useParams<{ embedCode: string }>();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    notes: '',
  });
  const [booking, setBooking] = useState<BookingResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch widget config on mount
  useEffect(() => {
    if (!embedCode) return;

    fetch(`${API_URL}/widget-config?embed_code=${encodeURIComponent(embedCode)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Widget not found');
        return res.json();
      })
      .then((data) => {
        setConfig(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [embedCode]);

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setStep(2);
  };

  const handleDateTimeSelect = (date: Date, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setStep(3);
  };

  const handleCustomerSubmit = async (info: CustomerInfo) => {
    setCustomerInfo(info);
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/create-appointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embedCode,
          customer: {
            firstName: info.firstName,
            lastName: info.lastName,
            phone: info.phone,
            email: info.email || null,
          },
          serviceId: selectedService?.id,
          date: selectedDate?.toISOString().split('T')[0],
          time: selectedTime,
          address: info.address,
          city: info.city,
          state: info.state,
          zipCode: info.zipCode,
          notes: info.notes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create appointment');
      }

      const data = await response.json();
      setBooking({
        id: data.appointment.id,
        referenceCode: data.appointment.referenceCode,
        portalToken: data.appointment.portalToken,
      });
      setStep(4);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookAnother = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setCustomerInfo({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      notes: '',
    });
    setBooking(null);
    setError(null);
  };

  const handleClose = () => {
    window.parent.postMessage({ type: 'tradeflow-widget-close' }, '*');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center">
          <p className="text-destructive font-medium mb-2">Unable to load booking widget</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!config) return null;

  const primaryColor = config.appearance.primaryColor || '#F97316';

  return (
    <div 
      className="min-h-screen bg-background"
      style={{ 
        '--widget-primary': primaryColor,
        '--widget-primary-foreground': config.appearance.buttonTextColor || '#FFFFFF',
      } as React.CSSProperties}
    >
      {/* Header */}
      <div 
        className="sticky top-0 z-10 px-6 py-4 border-b bg-background"
        style={{ borderColor: config.appearance.borderColor }}
      >
        <h1 
          className="text-lg font-semibold"
          style={{ color: config.appearance.textColor }}
        >
          {config.business.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {step === 1 && 'Select a service'}
          {step === 2 && 'Choose date & time'}
          {step === 3 && 'Your information'}
          {step === 4 && 'Booking confirmed!'}
        </p>
        
        {/* Progress bar */}
        <div className="mt-3 flex gap-1">
          {[1, 2, 3, 4].map((s) => (
            <div 
              key={s}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{ 
                backgroundColor: s <= step ? primaryColor : config.appearance.borderColor 
              }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && step !== 4 && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {step === 1 && (
          <WidgetServiceSelect
            services={config.services}
            primaryColor={primaryColor}
            onSelect={handleServiceSelect}
          />
        )}

        {step === 2 && selectedService && (
          <WidgetDateTimePicker
            embedCode={embedCode!}
            serviceId={selectedService.id}
            serviceDuration={selectedService.duration_max || 60}
            bookingRules={config.bookingRules}
            primaryColor={primaryColor}
            borderColor={config.appearance.borderColor}
            onSelect={handleDateTimeSelect}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <WidgetCustomerForm
            initialData={customerInfo}
            primaryColor={primaryColor}
            isSubmitting={isSubmitting}
            onSubmit={handleCustomerSubmit}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && booking && selectedService && selectedDate && selectedTime && (
          <WidgetConfirmation
            booking={booking}
            service={selectedService}
            date={selectedDate}
            time={selectedTime}
            customerInfo={customerInfo}
            businessName={config.business.name}
            businessPhone={config.business.phone}
            primaryColor={primaryColor}
            onBookAnother={handleBookAnother}
            onClose={handleClose}
          />
        )}
      </div>
    </div>
  );
}
