import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTheme = () => {
  const [theme, setTheme] = useState('blue');

  useEffect(() => {
    loadUserTheme();
  }, []);

  const loadUserTheme = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_preferences')
      .select('theme_color')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data?.theme_color) {
      setTheme(data.theme_color);
      document.documentElement.setAttribute('data-theme', data.theme_color);
    }
  };

  const updateTheme = (newTheme: string) => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return { theme, updateTheme, loadUserTheme };
};