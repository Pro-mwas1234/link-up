
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
  const [isSyncing, setIsSyncing] = useState(false);
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
    if (!formData.cloudId) {
      setError('Please enter your Cloud ID.');
      return;
    }
    setError('');
    setIsSyncing(true);
    try {
      // Force a fresh fetch from the global registry
      const globalUsers = await cloudService.fetchGlobalDiscovery();
      const user = globalUsers.find(u => u.id.trim() === formData.cloudId.trim());
      
      if (user) {
        // Persist locally
        storageService.cacheCloudUser(user);
        // Save session
        localStorage.setItem('linkup_session_userid', user.id);
        onLogin(user);
      } else {
        setError('Cloud ID not found. Ensure your other device is online and the app is open!');
      }
    } catch (e) {
      setError('Could not reach the global registry. Check your connection.');
    } finally {
      setIsSyncing(false);
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
      if (!formData.name || !formData.age || !formData.email || !formData.password) {
        setError('Please fill in all fields.');
        return;
      }
      const userId = 'uid-' + Math.random().toString(36).substr(2, 6);
      const newUser: User = {
        id: userId,
        name: formData.name,
        age: parseInt(formData.age),
        bio: `Available ${formData.preference.toLowerCase()}! 😈`,
        media: [`https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=ec4899&color=fff`],
        location: 'Cloud Connected',
        preference: formData.preference,
        lastSeen: Date.now()
      };
      storageService.registerUser(formData.email, formData.password, newUser);
      cloudService.publishProfile(newUser); // Push immediately
      onLogin(newUser);
    } else {
      const user = storageService.authenticate(formData.email, formData.password);
      if (user) onLogin(user); else setError('Invalid credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white max-w-md mx-auto relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(236,72,153,0.1),transparent)]" />
      
      <div className="w-full space-y-8 relative z-10 text-center">
        <div className="space-y-2">
          <h1 className="text-6xl font-black bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent italic tracking-tighter">LinkUp</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Peer-to-Peer Hookup Network</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left">
          {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-xs font-bold animate-in fade-in slide-in-from-top-2">{error}</div>}
          
          {isClaiming ? (
            <div className="space-y-4">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center px-4">Locate your identity from another device using your Cloud ID</p>
              <input
                type="text"
                placeholder="Enter Cloud ID (uid-...)"
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-pink-500 text-pink-400 font-mono"
                value={formData.cloudId}
                onChange={(e) => setFormData({...formData, cloudId: e.target.value})}
              />
            </div>
          ) : (
            <>
              {isRegistering && (
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Name" className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-pink-500" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  <input type="number" placeholder="Age" className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-pink-500" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} />
                </div>
              )}
              <input type="email" placeholder="Email Address" className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-pink-500" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              <input type="password" placeholder="Password" className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-pink-500" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
              
              {isRegistering && (
                <div className="pt-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4 mb-2 block">Hookup Preference</label>
                  <select 
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-pink-500 appearance-none text-sm font-bold"
                    value={formData.preference}
                    onChange={(e) => setFormData({...formData, preference: e.target.value as HookupPreference})}
                  >
                    <option value="Tonight">Tonight</option>
                    <option value="Right Now">Right Now</option>
                    <option value="FWB">Friends with Benefits</option>
                    <option value="Discrete">Discrete / DL</option>
                    <option value="Short Term">Short Term</option>
                  </select>
                </div>
              )}
            </>
          )}

          <button 
            type="submit" 
            disabled={isSyncing}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-600 py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-pink-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-3"
          >
            {isSyncing && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
            <span>{isClaiming ? 'Link Identities' : isRegistering ? 'Create Global Profile' : 'Enter LinkUp'}</span>
          </button>
        </form>

        <div className="flex flex-col space-y-4 pt-6">
          <button onClick={() => { setIsRegistering(!isRegistering); setIsClaiming(false); setError(''); }} className="text-xs text-slate-400 font-bold hover:text-pink-500 transition-colors uppercase tracking-widest">
            {isRegistering ? 'Return to Sign In' : 'Join the Global Network'}
          </button>
          <div className="h-px bg-slate-800 w-1/4 mx-auto" />
          <button onClick={() => { setIsClaiming(!isClaiming); setIsRegistering(false); setError(''); }} className="text-[10px] text-pink-400 font-black uppercase tracking-[0.2em] hover:text-pink-300 transition-colors">
            {isClaiming ? 'Back to standard login' : 'Found LinkUp on another device? Sync via ID'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
