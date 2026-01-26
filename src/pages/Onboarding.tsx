import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wrench, Loader2, Building2, User, Phone, ArrowRight, Sparkles } from 'lucide-react';

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { user, createBusiness, needsOnboarding } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user doesn't need onboarding, redirect to dashboard
    if (!needsOnboarding && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [needsOnboarding, user, navigate]);

  // Pre-fill from user metadata if available
  useEffect(() => {
    if (user?.user_metadata) {
      setFirstName(user.user_metadata.first_name || '');
      setLastName(user.user_metadata.last_name || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!businessName.trim()) {
      setError('Please enter your business name');
      return;
    }

    setIsLoading(true);

    try {
      const { error: createError } = await createBusiness(
        businessName.trim(),
        firstName.trim() || undefined,
        lastName.trim() || undefined,
        phone.trim() || undefined
      );
      
      if (createError) {
        setError(createError.message);
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="businessName">Business name *</Label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="businessName"
            type="text"
            placeholder="Smith's Plumbing & Electric"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="pl-10"
            required
            disabled={isLoading}
            autoFocus
          />
        </div>
        <p className="text-xs text-muted-foreground">
          This is the name your customers will see
        </p>
      </div>

      <Button 
        type="button" 
        className="w-full"
        onClick={() => businessName.trim() && setStep(2)}
        disabled={!businessName.trim()}
      >
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="firstName"
              type="text"
              placeholder="John"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="pl-10"
              disabled={isLoading}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            type="text"
            placeholder="Smith"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone number</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="pl-10"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button 
          type="button" 
          variant="outline"
          className="flex-1"
          onClick={() => setStep(1)}
          disabled={isLoading}
        >
          Back
        </Button>
        <Button 
          type="submit" 
          className="flex-1"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Get Started
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="bg-primary p-2 rounded-lg">
              <Wrench className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">TradeFlow</span>
          </div>
          <CardTitle className="text-2xl">
            {step === 1 ? 'Set up your business' : 'Almost there!'}
          </CardTitle>
          <CardDescription>
            {step === 1 
              ? "Let's get your business set up in TradeFlow"
              : "Add your details to complete setup"
            }
          </CardDescription>
          
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 pt-4">
            <div className={`h-2 w-16 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-2 w-16 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
