import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import LoginPage from './Pages/LoginPage.js';
import RegisterPage from './Pages/RegisterPage.js';
import CashDrop from './Pages/CashDrop.js';
import Homepage from './Pages/HomePage.js';
import Header from './Pages/Header.js';
import CdDashboard from './Pages/CdDashboard.js';
import Dashboard from './Pages/Dashboard.js';
import CashDropReconcilerPage from './Pages/CdValidation.js';
import BankDrop from './Pages/BankDrop.js';
import Odoo from './Pages/Odoo.js';
import ProtectedRoute from './components/ProtectedRoute';
import SessionIdleGuard from './components/SessionIdleGuard';
import { API_ENDPOINTS, clearSessionAndRedirectToLogin } from './config/api';

function App() {
  const navigate = useNavigate();
  const [checkingUsers, setCheckingUsers] = useState(true);
  const [sessionValid, setSessionValid] = useState(true); // force Header re-render when session expires

  // When any part of the app gets 401, redirect to login (sessionExpired is dispatched from api.js)
  useEffect(() => {
    const onSessionExpired = () => {
      setSessionValid(false);
      navigate('/login', { replace: true });
    };
    const onSessionRestored = () => setSessionValid(true);
    window.addEventListener('sessionExpired', onSessionExpired);
    window.addEventListener('sessionRestored', onSessionRestored);
    return () => {
      window.removeEventListener('sessionExpired', onSessionExpired);
      window.removeEventListener('sessionRestored', onSessionRestored);
    };
  }, [navigate]);

  // When user returns to the tab, validate session so expired token doesn’t keep showing app content
  useEffect(() => {
    const validateSession = async () => {
      const token = sessionStorage.getItem('access_token');
      if (!token) return;
      try {
        const res = await fetch(API_ENDPOINTS.CURRENT_USER, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          clearSessionAndRedirectToLogin();
        }
      } catch {
        // ignore network errors; don’t log out on offline
      }
    };
    const onVisible = () => validateSession();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    const USER_COUNT_TIMEOUT_MS = 10000; // 10 seconds

    const checkUserCount = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), USER_COUNT_TIMEOUT_MS);
        const response = await fetch(API_ENDPOINTS.USER_COUNT, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) {
          const data = await response.json();
          if (data.count === 0) {
            navigate('/register');
          }
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.warn('User count request timed out – is the backend running and database reachable?');
        } else {
          console.error('Error checking user count:', error);
        }
        // Continue to app (e.g. show login) so user isn't stuck
      } finally {
        setCheckingUsers(false);
      }
    };

    checkUserCount();
  }, [navigate]);

  if (checkingUsers) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
   <>
    <Header sessionValid={sessionValid} />
    <SessionIdleGuard />
   <Routes>
    <Route path="/" element={<Homepage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/cash-drop" element={<ProtectedRoute><CashDrop /></ProtectedRoute>} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/cd-dashboard" element={<ProtectedRoute><CdDashboard /></ProtectedRoute>} />
    <Route path="/cd-validation" element={<ProtectedRoute><CashDropReconcilerPage /></ProtectedRoute>} />
    <Route path="/bank-drop" element={<ProtectedRoute><BankDrop /></ProtectedRoute>} />
    <Route path="/odoo" element={<ProtectedRoute><Odoo /></ProtectedRoute>} />
   </Routes>
   </>
  );
}

export default App;
