import { Navigate } from 'react-router-dom';

/** @deprecated Use /services?tab=readings */
export default function PoolChemistrySettings() {
  return <Navigate to="/services?tab=readings" replace />;
}
