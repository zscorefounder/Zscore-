import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AdminContextType {
  isAdmin: boolean;
  user: any | null;
  loading: boolean;
  login: (email: string) => boolean;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for an admin flag
    const storedAdmin = localStorage.getItem('z_score_is_admin') === 'true';
    const storedUser = localStorage.getItem('z_score_admin_user');
    
    if (storedAdmin && storedUser) {
      setIsAdmin(true);
      setUser(JSON.parse(storedUser));
    }
    
    setLoading(false);
  }, []);

  const login = (email: string) => {
    // Hardcoded admin email - handle case sensitivity
    if (email.toLowerCase().trim() === 'shansarkarbhai@gmail.com') {
      const adminUser = { email: email.toLowerCase().trim(), name: 'Zeeshan' };
      localStorage.setItem('z_score_is_admin', 'true');
      localStorage.setItem('z_score_admin_user', JSON.stringify(adminUser));
      setIsAdmin(true);
      setUser(adminUser);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('z_score_is_admin');
    localStorage.removeItem('z_score_admin_user');
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
