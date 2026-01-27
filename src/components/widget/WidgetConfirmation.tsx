import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, Clock, MapPin, Phone, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
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

interface WidgetConfirmationProps {
  booking: BookingResult;
  service: Service;
  date: Date;
  time: string;
  customerInfo: CustomerInfo;
  businessName: string;
  businessPhone: string | null;
  primaryColor: string;
  onBookAnother: () => void;
  onClose: () => void;
}

export function WidgetConfirmation({
  booking,
  service,
  date,
  time,
  customerInfo,
  businessName,
  businessPhone,
  primaryColor,
  onBookAnother,
  onClose,
}: WidgetConfirmationProps) {
  const handleCopyReference = () => {
    navigator.clipboard.writeText(booking.referenceCode);
    toast.success('Reference code copied!');
  };

  const fullAddress = [
    customerInfo.address,
    customerInfo.city,
    customerInfo.state,
    customerInfo.zipCode,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="text-center space-y-6">
      {/* Success icon */}
      <div 
        className="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${primaryColor}15` }}
      >
        <CheckCircle className="h-10 w-10" style={{ color: primaryColor }} />
      </div>

      {/* Success message */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Booking Confirmed!</h2>
        <p className="text-muted-foreground mt-1">
          We've received your appointment request
        </p>
      </div>

      {/* Reference code */}
      <div 
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border"
        style={{ borderColor: primaryColor, backgroundColor: `${primaryColor}08` }}
      >
        <span className="text-sm text-muted-foreground">Reference:</span>
        <span className="font-mono font-bold" style={{ color: primaryColor }}>
          {booking.referenceCode}
        </span>
        <button
          onClick={handleCopyReference}
          className="p-1 hover:bg-black/5 rounded transition-colors"
          aria-label="Copy reference code"
        >
          <Copy className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Booking details */}
      <div className="text-left space-y-3 p-4 rounded-lg bg-muted/50">
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium">{format(date, 'EEEE, MMMM d, yyyy')}</p>
            <p className="text-sm text-muted-foreground">Date</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium">{time}</p>
            <p className="text-sm text-muted-foreground">{service.name}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium">{fullAddress}</p>
            <p className="text-sm text-muted-foreground">Service Address</p>
          </div>
        </div>
      </div>

      {/* Next steps */}
      <div className="text-left p-4 rounded-lg border border-border">
        <h3 className="font-medium mb-2">What's Next?</h3>
        <ul className="text-sm text-muted-foreground space-y-1.5">
          <li>• You'll receive a confirmation email shortly</li>
          <li>• Our team will review your appointment</li>
          <li>• We'll contact you if we need any additional information</li>
          <li>• You can reschedule or cancel using your reference code</li>
        </ul>
      </div>

      {/* Contact info */}
      {businessPhone && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-4 w-4" />
          <span>Questions? Call us at</span>
          <a 
            href={`tel:${businessPhone}`}
            className="font-medium hover:underline"
            style={{ color: primaryColor }}
          >
            {businessPhone}
          </a>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBookAnother} className="flex-1">
          Book Another
        </Button>
        <Button
          onClick={onClose}
          className="flex-1"
          style={{ 
            backgroundColor: primaryColor,
            color: 'white',
          }}
        >
          Done
        </Button>
      </div>
    </div>
  );
}
