import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Profile,
  InterviewConfig,
  InterviewResult,
  HistoryItem,
} from '../../shared/types';
import {
  STORAGE_KEYS,
  DEFAULT_PROFILE,
  DEFAULT_INTERVIEW_CONFIG,
  sanitizeAutoFilledProfile,
} from '../../shared/config/constants';
import { SAMPLE_HISTORY, SAMPLE_LAST_RESULT } from '../../shared/data/sampleHistory';
import { profileService } from '../../shared/services';
import { authService } from '../../features/auth';

interface AppContextType {
  profile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
  interviewConfig: InterviewConfig;
  updateInterviewConfig: (config: Partial<InterviewConfig>) => void;
  history: HistoryItem[];
  addHistoryItem: (item: HistoryItem) => void;
  lastResult: InterviewResult | null;
  saveLastResult: (res: InterviewResult) => void;
  isLoggedIn: boolean;
  login: (name?: string) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
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
  const [profile, setProfileState] = useState<Profile>(() => {
    const cleaned = sanitizeAutoFilledProfile(
      safeReadJSON<Profile>(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE)
    );
    safeStoreJSON(STORAGE_KEYS.PROFILE, cleaned);
    return cleaned;
  });

  const [interviewConfig, setInterviewConfigState] = useState<InterviewConfig>(() =>
    safeReadJSON<InterviewConfig>(
      STORAGE_KEYS.INTERVIEW_CONFIG,
      DEFAULT_INTERVIEW_CONFIG
    )
  );

  const [history, setHistoryState] = useState<HistoryItem[]>(() =>
    safeReadJSON<HistoryItem[]>(STORAGE_KEYS.HISTORY, SAMPLE_HISTORY)
  );

  const [lastResult, setLastResultState] = useState<InterviewResult | null>(() =>
    safeReadJSON<InterviewResult | null>(
      STORAGE_KEYS.LAST_RESULT,
      SAMPLE_LAST_RESULT
    )
  );

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const p = safeReadJSON<Profile>(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
    return Boolean(p.name && p.name.trim().length > 0);
  });

  const updateProfile = useCallback((updates: Partial<Profile>) => {
    setProfileState((prev) => {
      const next = { ...prev, ...updates };
      safeStoreJSON(STORAGE_KEYS.PROFILE, next);
      if (next.name && next.name.trim().length > 0) {
        setIsLoggedIn(true);
      }
      // Chỉ sync field vừa đổi — tránh ghi đè DB bằng role/field mặc định khi login chỉ cập nhật tên
      if (localStorage.getItem('hm_access_token')) {
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

  const refreshProfile = useCallback(async () => {
    if (!localStorage.getItem('hm_access_token')) return;

    try {
      const meRes = await authService.getMe();
      if (meRes.ok && meRes.data) {
        setIsLoggedIn(true);
        const me = meRes.data;
        setProfileState((prev) => {
          const next = {
            ...prev,
            name: me.fullName || prev.name,
            currentPlanCode: me.currentPlanCode || prev.currentPlanCode || 'free',
            isPremium: Boolean(me.isPremium ?? prev.isPremium),
          };
          safeStoreJSON(STORAGE_KEYS.PROFILE, next);
          return next;
        });
      }

      const res = await profileService.getProfile();
      if (res.ok && res.data) {
        const beData: any = res.data;
        setProfileState((prev) => {
          const mappedRole = beData.desiredPosition || beData.role || '';
          const mappedField = beData.desiredIndustry || beData.field || '';
          const mappedEducation = beData.university || beData.education || prev.education;
          const mappedSkills =
            Array.isArray(beData.hobbies) && beData.hobbies.length > 0
              ? beData.hobbies
              : Array.isArray(beData.skills) && beData.skills.length > 0
              ? beData.skills
              : prev.skills;

          const next = sanitizeAutoFilledProfile({
            ...prev,
            ...beData,
            name: beData.fullName || beData.name || prev.name,
            role: mappedRole,
            field: mappedField,
            exp: beData.experienceLevel || '',
            bio: beData.bio !== null && beData.bio !== undefined ? beData.bio : prev.bio,
            education: mappedEducation,
            skills: mappedSkills,
            isPremium: Boolean(beData.isPremium),
            currentPlanCode: beData.currentPlanCode || 'free',
          });
          safeStoreJSON(STORAGE_KEYS.PROFILE, next);
          return next;
        });
        setIsLoggedIn(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    // Sync theme attributes on mount
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.add('js');

    refreshProfile();
  }, [refreshProfile]);

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
        refreshProfile,
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
