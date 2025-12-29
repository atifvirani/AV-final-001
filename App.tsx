
import React, { useState, useEffect } from 'react';
import { Role } from './types';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import SalesmanDashboard from './pages/SalesmanDashboard';

const App: React.FC = () => {
  const [user, setUser] = useState<{ role: Role; id: string } | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('av_session_secure');
    if (saved) {
      setUser(JSON.parse(saved));
    }
  }, []);

  const handleLogin = (role: Role, id: string) => {
    const session = { role, id };
    setUser(session);
    sessionStorage.setItem('av_session_secure', JSON.stringify(session));
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.clear(); // Complete reset on logout
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (user.role === Role.ADMIN) {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  return <SalesmanDashboard salesmanId={user.id} onLogout={handleLogout} />;
};

export default App;
