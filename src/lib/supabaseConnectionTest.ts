import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = "https://nebgrdwjheeuactkcebw.supabase.co";

export interface ConnectionStatus {
  connected: boolean;
  error?: string;
  details?: {
    url: string;
    status?: number;
    message?: string;
  };
}

/**
 * Test Supabase connection
 */
export async function testSupabaseConnection(): Promise<ConnectionStatus> {
  try {
    // Try a simple query to test connection
    const { data, error } = await supabase
      .from('staff')
      .select('id')
      .limit(1);

    if (error) {
      // Check if it's a network error
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        return {
          connected: false,
          error: 'Network connection failed. Please check your internet connection.',
          details: {
            url: SUPABASE_URL,
            message: error.message
          }
        };
      }

      // Check if it's an authentication/authorization error
      if (error.code === 'PGRST116' || error.message?.includes('JWT')) {
        return {
          connected: true,
          error: 'Connection successful but authentication failed. This is normal if you are not logged in.',
          details: {
            url: SUPABASE_URL,
            message: error.message
          }
        };
      }

      // Check if project is paused/suspended
      if (error.message?.includes('project') && (error.message?.includes('paused') || error.message?.includes('suspended'))) {
        return {
          connected: false,
          error: 'Supabase project appears to be paused or suspended. Please check your Supabase dashboard.',
          details: {
            url: SUPABASE_URL,
            message: error.message
          }
        };
      }

      return {
        connected: false,
        error: error.message || 'Unknown error occurred',
        details: {
          url: SUPABASE_URL,
          message: error.message
        }
      };
    }

    return {
      connected: true,
      details: {
        url: SUPABASE_URL
      }
    };
  } catch (error: any) {
    // Network errors typically throw here
    const errorMessage = error?.message || 'Unknown error';
    
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
      return {
        connected: false,
        error: 'Cannot connect to Supabase. This could mean:\n• Your internet connection is down\n• The Supabase project is paused/suspended\n• Firewall is blocking the connection\n• The Supabase URL is incorrect',
        details: {
          url: SUPABASE_URL,
          message: errorMessage
        }
      };
    }

    return {
      connected: false,
      error: errorMessage,
      details: {
        url: SUPABASE_URL,
        message: errorMessage
      }
    };
  }
}

/**
 * Test if Supabase URL is reachable
 */
export async function testSupabaseURL(): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lYmdyZHdqaGVldWFjdGtjZWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNjk4MzIsImV4cCI6MjA3MDg0NTgzMn0.qiwQR6T0IgFge1L4-MQ2FEeMe0kdQ7ni14WnGQXz2Zc"
      }
    });
    return response.ok || response.status === 404; // 404 means the endpoint exists but might need auth
  } catch {
    return false;
  }
}

