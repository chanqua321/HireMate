import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../../app/context/AppContext';

interface CandidateRouteGuardProps {
  children: React.ReactNode;
}

export const CandidateRouteGuard: React.FC<CandidateRouteGuardProps> = ({ children }) => {
  const { isLoggedIn } = useApp();
  const location = useLocation();

  // Kiểm tra token cả trong session và local storage
  const hasToken =
    Boolean(sessionStorage.getItem('hm_access_token')) ||
    Boolean(localStorage.getItem('hm_access_token')) ||
    isLoggedIn;

  if (!hasToken) {
    const redirectTarget = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectTarget}`} replace />;
  }

  return <>{children}</>;
};

export default CandidateRouteGuard;
