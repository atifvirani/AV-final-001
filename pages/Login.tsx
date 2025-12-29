
import React, { useState } from 'react';
import { Role } from '../types';
import { Shield, User, Lock } from 'lucide-react';
import AuthorFootnote from '../components/AuthorFootnote';

interface LoginProps {
  onLogin: (role: Role, id: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [role, setRole] = useState<Role>(Role.SALESMAN);
  const [password, setPassword] = useState('');
  const [salesmanId, setSalesmanId] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === Role.ADMIN) {
      if (password === 'ADMIN') {
        onLogin(Role.ADMIN, 'manager');
      } else {
        alert('Incorrect Admin Password');
      }
    } else {
      if (salesmanId.trim()) {
        onLogin(Role.SALESMAN, salesmanId.toUpperCase());
      } else {
        alert('Enter Salesman ID');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden relative z-10">
        <div className="p-8 bg-blue-600 text-white text-center">
          <h1 className="text-3xl font-bold tracking-tight">AV Final 001</h1>
          <p className="mt-2 text-blue-100 opacity-90">Enterprise Resource Planning</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-6">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setRole(Role.SALESMAN)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                role === Role.SALESMAN ? 'bg-white shadow text-blue-600' : 'text-gray-500'
              }`}
            >
              Salesman
            </button>
            <button
              type="button"
              onClick={() => setRole(Role.ADMIN)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                role === Role.ADMIN ? 'bg-white shadow text-blue-600' : 'text-gray-500'
              }`}
            >
              Admin
            </button>
          </div>

          <div className="space-y-4">
            {role === Role.SALESMAN ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salesman ID</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={salesmanId}
                    onChange={(e) => setSalesmanId(e.target.value)}
                    placeholder="e.g. A"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="1"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg"
          >
            Access System
          </button>
        </form>
      </div>
      <AuthorFootnote />
    </div>
  );
};

export default Login;
