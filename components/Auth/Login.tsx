
import React, { useState } from 'react';
import { User } from '../../types';
import { storageService } from '../../services/storageService';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegistering) {
      // Check if user already exists
      const existing = storageService.getAllUsers().find(u => u.email === formData.email);
      if (existing) {
        setError('Email already registered.');
        return;
      }

      const userId = 'u_' + Math.random().toString(36).substr(2, 9);
      const newUser: User = {
        id: userId,
        name: formData.name,
        age: parseInt(formData.age),
        bio: 'Freshly joined LinkUp!',
        media: ['https://ui-avatars.com/api/?name=' + encodeURIComponent(formData.name) + '&background=ec4899&color=fff&size=512'],
        location: 'Nearby'
      };

      storageService.registerUser(formData.email, formData.password, newUser);
      onLogin(newUser);
    } else {
      const user = storageService.authenticate(formData.email, formData.password);
      if (user) {
        onLogin(user);
      } else {
        setError('Invalid email or password.');
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-6 text-white max-w-md mx-auto">
      <div className="w-full space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 bg-clip-text text-transparent">
            LinkUp
          </h1>
          <p className="mt-2 text-slate-400">Discover direct connections.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && <p className="text-rose-500 text-sm text-center font-bold bg-rose-500/10 py-2 rounded-lg border border-rose-500/20">{error}</p>}
          
          {isRegistering && (
            <>
              <input
                type="text"
                placeholder="First Name"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
              <input
                type="number"
                placeholder="Age"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
                value={formData.age}
                onChange={(e) => setFormData({...formData, age: e.target.value})}
                required
              />
            </>
          )}
          <input
            type="email"
            placeholder="Email Address"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
          />

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-pink-500/30 transition-all active:scale-95"
          >
            {isRegistering ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }}
            className="text-slate-400 hover:text-pink-400 transition-colors font-medium"
          >
            {isRegistering ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
