import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { usePushPreferences, useUpdatePushPreferences, DEFAULT_PUSH_PREFERENCES } from '@/hooks/usePushPreferences';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, Loader2, Building2, Wrench } from 'lucide-react';

const OFFICE_ROLES = ['owner', 'admin', 'dispatcher'] as const;
const isOfficeRole = (role: string) => OFFICE_ROLES.includes(role as typeof OFFICE_ROLES[number]);
const isTechnicianRole = (role: string) => role === 'technician';

export function PushNotificationPreferences() {
  const { isSubscribed } = usePushNotifications();
  const { profile } = useAuth();
  const { data: preferences, isLoading } = usePushPreferences();
  const updatePreferences = useUpdatePushPreferences();

  const [pushNewAppointment, setPushNewAppointment] = useState(true);
  const [pushCancellation, setPushCancellation] = useState(true);
  const [pushReschedule, setPushReschedule] = useState(true);
  const [pushChatDirect, setPushChatDirect] = useState(true);
  const [pushChatJob, setPushChatJob] = useState(true);
  const [pushJobProblem, setPushJobProblem] = useState(true);
  const [pushAssigned, setPushAssigned] = useState(true);

  useEffect(() => {
    if (preferences) {
      setPushNewAppointment(preferences.push_new_appointment ?? true);
      setPushCancellation(preferences.push_cancellation ?? true);
      setPushReschedule(preferences.push_reschedule ?? true);
      setPushChatDirect(preferences.push_chat_direct ?? true);
      setPushChatJob(preferences.push_chat_job ?? true);
      setPushJobProblem(preferences.push_job_problem ?? true);
      setPushAssigned(preferences.push_assigned ?? true);
    } else if (!isLoading) {
      setPushNewAppointment(DEFAULT_PUSH_PREFERENCES.push_new_appointment);
      setPushCancellation(DEFAULT_PUSH_PREFERENCES.push_cancellation);
      setPushReschedule(DEFAULT_PUSH_PREFERENCES.push_reschedule);
      setPushChatDirect(DEFAULT_PUSH_PREFERENCES.push_chat_direct);
      setPushChatJob(DEFAULT_PUSH_PREFERENCES.push_chat_job);
      setPushJobProblem(DEFAULT_PUSH_PREFERENCES.push_job_problem);
      setPushAssigned(DEFAULT_PUSH_PREFERENCES.push_assigned);
    }
  }, [preferences, isLoading]);

  const handleSave = () => {
    updatePreferences.mutate({
      push_new_appointment: pushNewAppointment,
      push_cancellation: pushCancellation,
      push_reschedule: pushReschedule,
      push_chat_direct: pushChatDirect,
      push_chat_job: pushChatJob,
      push_job_problem: pushJobProblem,
      push_assigned: pushAssigned,
    });
  };

  if (!isSubscribed) return null;

  const role = profile?.role ?? '';
  const showOffice = isOfficeRole(role);
  const showTechnician = isTechnicianRole(role);

  if (!showOffice && !showTechnician) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          Which push notifications to receive
        </CardTitle>
        <CardDescription>
          Choose which events trigger a push notification on your devices.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading preferences…
          </div>
        ) : (
          <>
            {showOffice && (
              <div className="space-y-4">
                <h4 className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4" />
                  For office / dashboard
                </h4>
                <div className="space-y-3 pl-6">
                  <div className="flex items-center justify-between py-2 border-b">
                    <Label className="font-normal">New appointment (call, widget or manual)</Label>
                    <Switch checked={pushNewAppointment} onCheckedChange={setPushNewAppointment} />
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <Label className="font-normal">Cancellations</Label>
                    <Switch checked={pushCancellation} onCheckedChange={setPushCancellation} />
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <Label className="font-normal">Reschedules</Label>
                    <Switch checked={pushReschedule} onCheckedChange={setPushReschedule} />
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <Label className="font-normal">Direct messages (technician → office)</Label>
                    <Switch checked={pushChatDirect} onCheckedChange={setPushChatDirect} />
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <Label className="font-normal">Job chat messages</Label>
                    <Switch checked={pushChatJob} onCheckedChange={setPushChatJob} />
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <Label className="font-normal">Job problem reported</Label>
                    <Switch checked={pushJobProblem} onCheckedChange={setPushJobProblem} />
                  </div>
                </div>
              </div>
            )}

            {showTechnician && (
              <div className="space-y-4">
                <h4 className="flex items-center gap-2 text-sm font-medium">
                  <Wrench className="h-4 w-4" />
                  For technicians
                </h4>
                <div className="space-y-3 pl-6">
                  <div className="flex items-center justify-between py-2 border-b">
                    <Label className="font-normal">Assigned to appointment</Label>
                    <Switch checked={pushAssigned} onCheckedChange={setPushAssigned} />
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <Label className="font-normal">Direct messages (office → you)</Label>
                    <Switch checked={pushChatDirect} onCheckedChange={setPushChatDirect} />
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <Label className="font-normal">Job chat messages</Label>
                    <Switch checked={pushChatJob} onCheckedChange={setPushChatJob} />
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <Label className="font-normal">My appointment cancelled</Label>
                    <Switch checked={pushCancellation} onCheckedChange={setPushCancellation} />
                  </div>
                </div>
              </div>
            )}

            <Button
              className="bg-primary hover:bg-primary-hover"
              onClick={handleSave}
              disabled={updatePreferences.isPending}
            >
              {updatePreferences.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Save preferences
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
