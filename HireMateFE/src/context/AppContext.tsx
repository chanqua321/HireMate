import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Profile,
  InterviewConfig,
  InterviewResult,
  HistoryItem,
} from '../types';
import {
  STORAGE_KEYS,
  DEFAULT_PROFILE,
  DEFAULT_INTERVIEW_CONFIG,
} from '../config/constants';
import { authService, profileService, interviewService } from '../services';
import { mapSummaryToHistory } from '../services/interview.service';

interface UpdateProfileOptions {
  /** Khi true: chỉ cập nhật state/localStorage, không gọi PUT /Profile */
  skipApi?: boolean;
}

interface AppContextType {
  profile: Profile;
  updateProfile: (updates: Partial<Profile>, options?: UpdateProfileOptions) => void;
  interviewConfig: InterviewConfig;
  updateInterviewConfig: (config: Partial<InterviewConfig>) => void;
  history: HistoryItem[];
  addHistoryItem: (item: HistoryItem) => void;
  lastResult: InterviewResult | null;
  saveLastResult: (res: InterviewResult) => void;
  isLoggedIn: boolean;
  login: (name?: string) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const safeReadJSON = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    return fallback;
  }
};

const safeStoreJSON = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Ignore storage quota error
  }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<Profile>(() =>
    safeReadJSON<Profile>(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE)
  );

  const [interviewConfig, setInterviewConfigState] = useState<InterviewConfig>(() =>
    safeReadJSON<InterviewConfig>(
      STORAGE_KEYS.INTERVIEW_CONFIG,
      DEFAULT_INTERVIEW_CONFIG
    )
  );

  const [history, setHistoryState] = useState<HistoryItem[]>(() =>
    safeReadJSON<HistoryItem[]>(STORAGE_KEYS.HISTORY, [])
  );

  const [lastResult, setLastResultState] = useState<InterviewResult | null>(() =>
    safeReadJSON<InterviewResult | null>(STORAGE_KEYS.LAST_RESULT, null)
  );

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return Boolean(sessionStorage.getItem('hm_access_token'));
  });

  const updateProfile = useCallback((updates: Partial<Profile>, options?: UpdateProfileOptions) => {
    setProfileState((prev) => {
      const next = { ...prev, ...updates };
      safeStoreJSON(STORAGE_KEYS.PROFILE, next);
      if (next.name && next.name.trim().length > 0) {
        setIsLoggedIn(true);
      }
      // Non-blocking BE sync if logged in (onboarding dùng API riêng → skipApi)
      if (!options?.skipApi && sessionStorage.getItem('hm_access_token')) {
        profileService.updateProfile(updates).catch(() => {});
      }
      return next;
    });
  }, []);

  const updateInterviewConfig = useCallback((config: Partial<InterviewConfig>) => {
    setInterviewConfigState((prev) => {
      const next = { ...prev, ...config };
      safeStoreJSON(STORAGE_KEYS.INTERVIEW_CONFIG, next);
      return next;
    });
  }, []);

  const addHistoryItem = useCallback((item: HistoryItem) => {
    setHistoryState((prev) => {
      const next = [...prev, item];
      safeStoreJSON(STORAGE_KEYS.HISTORY, next);
      return next;
    });
  }, []);

  const saveLastResult = useCallback((res: InterviewResult) => {
    setLastResultState(res);
    safeStoreJSON(STORAGE_KEYS.LAST_RESULT, res);
    addHistoryItem({
      date: res.date,
      role: res.role,
      score: res.overall,
    });
  }, [addHistoryItem]);

  const login = useCallback((name?: string) => {
    setIsLoggedIn(true);
    if (name) {
      updateProfile({ name });
    }
  }, [updateProfile]);

  const logout = useCallback(() => {
    authService.logout().catch(() => {});
    setIsLoggedIn(false);
    updateProfile({ name: '' });
  }, [updateProfile]);

  useEffect(() => {
    // Sync theme attributes on mount
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.add('js');

    // Clear legacy persistent auth tokens from localStorage so browser closing logs out
    localStorage.removeItem('hm_access_token');
    localStorage.removeItem('hm_refresh_token');

    // Sync profile + interview history from BE when logged in
    if (sessionStorage.getItem('hm_access_token')) {
      profileService.getProfile().then((res) => {
        if (res.ok && res.data) {
          setProfileState((prev) => {
            const next = { ...prev, ...res.data! };
            safeStoreJSON(STORAGE_KEYS.PROFILE, next);
            return next;
          });
          setIsLoggedIn(true);
        }
      }).catch(() => {});

      interviewService.getHistory().then((res) => {
        if (res.ok && Array.isArray(res.data)) {
          const mapped = mapSummaryToHistory(res.data);
          setHistoryState(mapped);
          safeStoreJSON(STORAGE_KEYS.HISTORY, mapped);
        }
      }).catch(() => {});
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        profile,
        updateProfile,
        interviewConfig,
        updateInterviewConfig,
        history,
        addHistoryItem,
        lastResult,
        saveLastResult,
        isLoggedIn,
        login,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
