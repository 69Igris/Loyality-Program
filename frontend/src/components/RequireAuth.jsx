import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function FullPageBootstrap() {
  return (
    <div className="mx-auto max-w-[1180px] px-6 py-20 lg:px-10">
      <div className="flex items-center gap-3">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-clay" />
        <p className="font-mono text-[11px] uppercase tracking-widelabel text-ink-60">
          Verifying session…
        </p>
      </div>
      <div className="mt-8 space-y-4">
        <div className="skeleton h-6 w-1/3" />
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton h-4 w-1/2" />
      </div>
    </div>
  );
}

export default function RequireAuth({ children }) {
  const { isAuthenticated, bootstrapping } = useAuth();
  const location = useLocation();

  if (bootstrapping) return <FullPageBootstrap />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return children;
}
