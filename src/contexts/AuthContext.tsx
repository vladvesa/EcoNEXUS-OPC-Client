import { createContext, useContext, useState, ReactNode } from 'react';

export type Role = 'admin' | 'operator';

export interface User {
  username: string;
  role: Role;
  displayName: string;
}

interface AuthContextValue {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const CREDENTIALS: Record<string, { password: string; role: Role; displayName: string }> = {
  admin: { password: 'admin123', role: 'admin', displayName: 'Administrator' },
  operator: { password: 'op123', role: 'operator', displayName: 'Operator' },
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (username: string, password: string): boolean => {
    const entry = CREDENTIALS[username.toLowerCase()];
    if (entry && entry.password === password) {
      setUser({ username: username.toLowerCase(), role: entry.role, displayName: entry.displayName });
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
