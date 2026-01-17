
import React, { useState } from 'react';
import { User, HookupPreference } from '../../types';
import { storageService } from '../../services/storageService';
import { cloudService } from '../../services/cloudService';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    email: '',
    password: '',
    cloudId: '',
    preference: 'Tonight' as HookupPreference
  });
  const [error, setError] = useState('');

  const handleClaim = async () => {
    if (!formData.cloudId) return;
    const globalUsers = await cloudService.fetchGlobalDiscovery();
    const user = globalUsers.find(u => u.id === formData.cloudId);
    if (user) {
      storageService.registerUser(user.id, 'temp', user);
      onLogin(user);
    } else {
      setError('Cloud ID not found. Ensure you published your profile from your other device.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isClaiming) {
      handleClaim();
      return;
    }

    if (isRegistering) {
      const userId = 'uid-' + Math.random().toString(36).substr(2, 6);
      const newUser: User = {
        id: userId,
        name: formData.name,
        age: parseInt(formData.age),
        bio: `Available ${formData.preference.toLowerCase()}! 😈`,
        media: [`https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=ec4899&color=fff`],
        location: 'Cloud Connected',
        preference: formData.preference
      };
      storageService.registerUser(formData.email, formData.password, newUser);
      onLogin(newUser);
    } else {
      const user = storageService.authenticate(formData.email, formData.password);
      if (user) onLogin(user); else setError('Invalid credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white max-w-md mx-auto relative">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(236,72,153,0.1),transparent)]" />
      
      <div className="w-full space-y-8 relative z-10 text-center">
        <h1 className="text-5xl font-black bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent italic tracking-tighter">LinkUp</h1>
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Real-time Hookup Discovery</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left">
          {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-bold">{error}</div>}
          
          {isClaiming ? (
            <input
              type="text"
              placeholder="Enter your Cloud ID (e.g. uid-abc123)"
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-pink-500"
              value={formData.cloudId}
              onChange={(e) => setFormData({...formData, cloudId: e.target.value})}
            />
          ) : (
            <>
              {isRegistering && (
                <>
                  <input type="text" placeholder="Name" className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 outline-none" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  <input type="number" placeholder="Age" className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 outline-none" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} />
                </>
              )}
              <input type="email" placeholder="Email" className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 outline-none" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              <input type="password" placeholder="Password" className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 outline-none" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
            </>
          )}

          <button type="submit" className="w-full bg-pink-500 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-pink-500/20 active:scale-95 transition-all">
            {isClaiming ? 'Sync Cloud Identity' : isRegistering ? 'Register Global' : 'Sign In'}
          </button>
        </form>

        <div className="flex flex-col space-y-3 pt-6">
          <button onClick={() => { setIsRegistering(!isRegistering); setIsClaiming(false); }} className="text-xs text-slate-400 font-bold hover:text-pink-500 transition-colors">
            {isRegistering ? 'Already have an account? Sign in' : 'Create a new global profile'}
          </button>
          <button onClick={() => { setIsClaiming(!isClaiming); setIsRegistering(false); }} className="text-[10px] text-pink-400/60 font-black uppercase tracking-widest hover:text-pink-400">
            {isClaiming ? 'Back to standard login' : 'Found LinkUp on another device? Sync here'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
