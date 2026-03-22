import React, { useEffect, useState } from 'react';
import { auth, signInWithGoogle, signOut, onAuthStateChanged, User } from './auth';
import { getUsageCount, hasReachedLimit, MAX_FREE_USES } from './usage';

interface AuthWallProps {
  children: React.ReactNode;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { user, loading };
};

export const UserAvatar: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <img
        src={user.photoURL || ''}
        alt={user.displayName || 'User'}
        className="w-7 h-7 rounded-full border border-white/20"
        referrerPolicy="no-referrer"
      />
      <button
        onClick={() => signOut(auth)}
        className="text-[10px] opacity-60 hover:opacity-100 transition-opacity"
        title="Sign out"
      >
        Sign out
      </button>
    </div>
  );
};

export const AuthWall: React.FC<AuthWallProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const [, setTick] = useState(0);

  // Re-render when usage changes
  const forceUpdate = () => setTick((t) => t + 1);

  if (loading) return null;

  // If user is signed in, always allow
  if (user) return <>{children}</>;

  // If under free limit, allow
  if (!hasReachedLimit()) return <>{children}</>;

  // Show auth wall
  const used = getUsageCount();

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      <div style={{
        background: 'rgba(30,30,40,0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '360px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '24px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <h2 style={{
          color: '#fff',
          fontSize: '18px',
          fontWeight: 700,
          marginBottom: '8px',
        }}>Free trial complete</h2>

        <p style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '13px',
          marginBottom: '24px',
        }}>
          {used} of {MAX_FREE_USES} free uses consumed
        </p>

        <div style={{
          width: '100%',
          height: '4px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          marginBottom: '24px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            borderRadius: '2px',
          }} />
        </div>

        <button
          onClick={async () => {
            try {
              await signInWithGoogle();
              forceUpdate();
            } catch (e) {
              console.error('Sign-in failed:', e);
            }
          }}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.25)';
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
          Continue with Google
        </button>

        <p style={{
          color: 'rgba(255,255,255,0.3)',
          fontSize: '11px',
          marginTop: '16px',
        }}>
          Sign in for unlimited access
        </p>
      </div>
    </div>
  );
};
