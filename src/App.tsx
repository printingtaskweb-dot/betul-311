import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SplashScreen } from './components/SplashScreen';
import { Home } from './pages/Home';
import { ComplaintForm } from './pages/ComplaintForm';
import { TrackComplaint } from './pages/TrackComplaint';
import { AuthPage } from './pages/AuthPage';
import { GreenDepartmentPage } from './pages/GreenDepartmentPage';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';

const AppRoutes: React.FC = () => (
  <Routes>
    {/* Citizen routes */}
    <Route path="/" element={<Home />} />
    <Route path="/auth" element={<AuthPage />} />
    <Route path="/complaint/new" element={<ComplaintForm />} />
    <Route path="/track" element={<TrackComplaint />} />

    {/* Department-specific routes */}
    <Route path="/department/green" element={<GreenDepartmentPage />} />

    {/* Admin routes */}
    <Route path="/admin" element={<AdminLogin />} />
    <Route path="/admin/dashboard" element={<AdminDashboard />} />

    {/* Fallback */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App: React.FC = () => {
  const [splashDone, setSplashDone] = useState(false);
  const alreadyShown = sessionStorage.getItem('splash_shown');

  useEffect(() => {
    if (alreadyShown) setSplashDone(true);
  }, []);

  const handleSplashDone = () => {
    sessionStorage.setItem('splash_shown', '1');
    setSplashDone(true);
  };

  return (
    <AuthProvider>
      {!splashDone && <SplashScreen onDone={handleSplashDone} />}
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
