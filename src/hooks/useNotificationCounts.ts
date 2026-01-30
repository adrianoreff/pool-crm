import { useAppointments, usePendingAppointments } from '@/hooks/useAppointments';

/**
 * Returns counts for the Header notification badge: jobs with reported problems + pending confirmation.
 * Used only in the main app layout (admin dashboard).
 */
export function useNotificationCounts() {
  const { data: problemAppointments = [], isLoading: loadingProblems } = useAppointments({
    hasProblemReported: true,
  });
  const { data: pendingAppointments = [], isLoading: loadingPending } = usePendingAppointments();

  const problemsCount = problemAppointments.length;
  const pendingCount = pendingAppointments.length;
  const totalCount = problemsCount + pendingCount;
  const isLoading = loadingProblems || loadingPending;

  return {
    problemsCount,
    pendingCount,
    totalCount,
    problemAppointments,
    pendingAppointments,
    isLoading,
  };
}
