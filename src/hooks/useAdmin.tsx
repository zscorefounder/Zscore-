import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AdminContextType {
  isAdmin: boolean;
  user: any | null;
  loading: boolean;
  login: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const ADMIN_EMAIL = 'shansarkarbhai@gmail.com';

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedAdmin = localStorage.getItem('z_score_admin_session');
    if (storedAdmin) {
      const userData = JSON.parse(storedAdmin);
      if (userData.email.toLowerCase() === ADMIN_EMAIL) {
        setIsAdmin(true);
        setUser(userData);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string) => {
    if (email.toLowerCase().trim() === ADMIN_EMAIL) {
      const adminUser = { 
        email: email.toLowerCase().trim(), 
        name: 'Admin',
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
      };
      localStorage.setItem('z_score_admin_session', JSON.stringify(adminUser));
      setIsAdmin(true);
      setUser(adminUser);
      return true;
    }
    return false;
  };

  const logout = async () => {
    localStorage.removeItem('z_score_admin_session');
    setIsAdmin(false);
    setUser(null);
  };

  return (
    <AdminContext.Provider value={{ isAdmin, user, loading, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
