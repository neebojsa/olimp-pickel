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
  /** Set when logged in as customer contact person - filters data to this company only */
  customer_id?: string;
  customer_name?: string;
  is_customer_user?: boolean;
}

interface AuthContextType {
  staff: Staff | null;
  token: string | null;
  isLoading: boolean;
  login: (staffData: Staff, sessionToken: string, stayLoggedIn?: boolean) => void;
  logout: () => void;
  hasPagePermission: (page: string) => boolean;
  canSeePrices: () => boolean;
  canSeeCustomers: () => boolean;
  /** True when logged in as customer contact - restricts to own company data only */
  isCustomerUser: () => boolean;
  /** Customer company ID when isCustomerUser - use to filter sales orders, inventory, etc. */
  customerId: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on app start
    // Check localStorage first (persistent session), then sessionStorage (temporary session)
    const savedToken = localStorage.getItem('staff_token') || sessionStorage.getItem('staff_token');
    if (savedToken) {
      verifySession(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifySession = async (sessionToken: string) => {
    try {
      // Try staff session first
      const { data: staffData, error: staffError } = await supabase.rpc('verify_staff_session', {
        token: sessionToken
      });

      if (staffError) {
        if (staffError.message?.includes('Failed to fetch') || staffError.message?.includes('NetworkError')) {
          console.error('Connection error - Supabase may be unreachable:', staffError);
          setIsLoading(false);
          return;
        }
      }

      const staffResult = staffData as any;
      if (staffResult?.success && staffResult.staff) {
        const staffObj = staffResult.staff;
        setStaff({
          ...staffObj,
          page_permissions: Array.isArray(staffObj.page_permissions) ? staffObj.page_permissions : []
        });
        setToken(sessionToken);
        setIsLoading(false);
        return;
      }

      // Staff session failed - try customer contact session
      const { data: contactData, error: contactError } = await supabase.rpc('verify_customer_contact_session', {
        token: sessionToken
      });

      if (contactError) {
        if (contactError.message?.includes('Failed to fetch') || contactError.message?.includes('NetworkError')) {
          console.error('Connection error - Supabase may be unreachable:', contactError);
          setIsLoading(false);
          return;
        }
      }

      const contactResult = contactData as any;
      if (contactResult?.success && contactResult.staff) {
        const staffObj = contactResult.staff;
        const perms = staffObj.page_permissions;
        setStaff({
          ...staffObj,
          page_permissions: Array.isArray(perms) ? perms : (typeof perms === 'string' ? JSON.parse(perms || '[]') : [])
        });
        setToken(sessionToken);
      } else {
        localStorage.removeItem('staff_token');
        sessionStorage.removeItem('staff_token');
      }
    } catch (error: any) {
      console.error('Session verification error:', error);
      if (error?.message && !error.message.includes('Failed to fetch') && !error.message.includes('NetworkError')) {
        localStorage.removeItem('staff_token');
        sessionStorage.removeItem('staff_token');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = (staffData: Staff, sessionToken: string, stayLoggedIn: boolean = true) => {
    setStaff(staffData);
    setToken(sessionToken);
    
    if (stayLoggedIn) {
      // Store in localStorage for persistent session
      localStorage.setItem('staff_token', sessionToken);
      sessionStorage.removeItem('staff_token'); // Clear any temporary session
    } else {
      // Store in sessionStorage for temporary session (cleared when browser tab closes)
      sessionStorage.setItem('staff_token', sessionToken);
      localStorage.removeItem('staff_token'); // Clear any persistent session
    }
  };

  const logout = () => {
    setStaff(null);
    setToken(null);
    localStorage.removeItem('staff_token');
    sessionStorage.removeItem('staff_token');
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

  const isCustomerUser = (): boolean => {
    return !!(staff?.is_customer_user && staff?.customer_id);
  };

  const customerId = (): string | null => {
    return staff?.customer_id || null;
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
      canSeeCustomers,
      isCustomerUser,
      customerId
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