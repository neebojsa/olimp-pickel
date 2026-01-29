import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SortPreference {
  field: string;
  direction: "asc" | "desc";
}

export function useSortPreference(storageKey: string, defaultValue?: SortPreference) {
  const { staff } = useAuth();
  const userId = staff?.id || "anonymous";
  const [sortPreference, setSortPreference] = useState<SortPreference | null>(
    defaultValue || null
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load preference on mount
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const loadPreference = async () => {
      try {
        // Try Supabase first
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Check if user_preferences table has a jsonb column for custom preferences
          // For now, we'll use localStorage as primary storage
          // TODO: Add jsonb column to user_preferences table for sort preferences
        }

        // Fallback to localStorage
        const localStorageKey = `sortPref:${userId}:${storageKey}`;
        const saved = localStorage.getItem(localStorageKey);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setSortPreference(parsed);
          } catch (e) {
            console.error("Error parsing saved sort preference:", e);
          }
        } else if (defaultValue) {
          setSortPreference(defaultValue);
        }
      } catch (error) {
        console.error("Error loading sort preference:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreference();
  }, [userId, storageKey, defaultValue]);

  const savePreference = async (preference: SortPreference) => {
    if (!userId) return;

    setSortPreference(preference);

    try {
      // Save to localStorage (primary storage for now)
      const localStorageKey = `sortPref:${userId}:${storageKey}`;
      localStorage.setItem(localStorageKey, JSON.stringify(preference));

      // TODO: Also save to Supabase user_preferences table when jsonb column is added
      // const { data: { user } } = await supabase.auth.getUser();
      // if (user) {
      //   await supabase
      //     .from('user_preferences')
      //     .upsert({
      //       user_id: user.id,
      //       sort_preferences: { [storageKey]: preference }
      //     });
      // }
    } catch (error) {
      console.error("Error saving sort preference:", error);
    }
  };

  return {
    sortPreference,
    savePreference,
    isLoading,
  };
}
