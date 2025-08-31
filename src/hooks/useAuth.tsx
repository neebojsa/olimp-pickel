import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Staff {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  page_permissions: string[];
  can_see_prices: boolean;
  can_see_customers: boolean;
}

interface AuthContextType {
  staff: Staff | null;
  token: string | null;
  isLoading: boolean;
  login: (staffData: Staff, sessionToken: string) => void;
  logout: () => void;
  hasPagePermission: (page: string) => boolean;
  canSeePrices: () => boolean;
  canSeeCustomers: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on app start
    const savedToken = localStorage.getItem('staff_token');
    if (savedToken) {
      verifySession(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifySession = async (sessionToken: string) => {
    try {
      const { data, error } = await supabase.rpc('verify_staff_session', {
        token: sessionToken
      });

      if (error) throw error;

      const result = data as any;
      if (result.success) {
        setStaff(result.staff);
        setToken(sessionToken);
      } else {
        localStorage.removeItem('staff_token');
      }
    } catch (error) {
      console.error('Session verification error:', error);
      localStorage.removeItem('staff_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = (staffData: Staff, sessionToken: string) => {
    setStaff(staffData);
    setToken(sessionToken);
    localStorage.setItem('staff_token', sessionToken);
  };

  const logout = () => {
    setStaff(null);
    setToken(null);
    localStorage.removeItem('staff_token');
  };

  const hasPagePermission = (page: string): boolean => {
    if (!staff) return false;
    console.log('hasPagePermission - staff.page_permissions:', staff.page_permissions);
    console.log('hasPagePermission - checking page:', page);
    const hasPermission = staff.page_permissions.includes(page) || staff.page_permissions.includes('all');
    console.log('hasPagePermission - result:', hasPermission);
    return hasPermission;
  };

  const canSeePrices = (): boolean => {
    return staff?.can_see_prices || false;
  };

  const canSeeCustomers = (): boolean => {
    return staff?.can_see_customers || false;
  };

  return (
    <AuthContext.Provider value={{
      staff,
      token,
      isLoading,
      login,
      logout,
      hasPagePermission,
      canSeePrices,
      canSeeCustomers
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};