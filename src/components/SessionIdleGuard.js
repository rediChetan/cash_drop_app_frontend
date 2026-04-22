import React, { useEffect, useReducer } from 'react';
import { useLocation } from 'react-router-dom';
import { useIdleTimer } from 'react-idle-timer';
import { clearSessionAndRedirectToLogin } from '../config/api';

const IDLE_MS = 20 * 60 * 1000;

/**
 * Logs the user out after 20 minutes of no keyboard/mouse/touch/scroll activity.
 * Disabled on login/register. Does not replace JWT refresh — see api.js for that.
 */
function SessionIdleGuard() {
  const location = useLocation();
  const [, forceSync] = useReducer((n) => n + 1, 0);

  useEffect(() => {
    const bump = () => forceSync();
    window.addEventListener('sessionRestored', bump);
    window.addEventListener('sessionExpired', bump);
    return () => {
      window.removeEventListener('sessionRestored', bump);
      window.removeEventListener('sessionExpired', bump);
    };
  }, []);

  const onAuthPage = ['/login', '/register'].includes(location.pathname);
  const hasToken = typeof sessionStorage !== 'undefined' && !!sessionStorage.getItem('access_token');

  useIdleTimer({
    onIdle: () => {
      if (sessionStorage.getItem('access_token')) {
        clearSessionAndRedirectToLogin();
      }
    },
    timeout: IDLE_MS,
    throttle: 1000,
    disabled: onAuthPage || !hasToken,
  });

  return null;
}

export default SessionIdleGuard;
