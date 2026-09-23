import { useCallback, useEffect, useRef, useState } from 'react';
import { cvService, type CvItemDto } from '../services/cv.service';

export type PollerStatus = 'idle' | 'polling' | 'ready' | 'failed' | 'timeout';

export interface CvPollerState {
  status: PollerStatus;
  cv: CvItemDto | null;
  progress: number; // 0–100 visual
  errorMessage?: string;
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10; // 30s total

/**
 * Poll GET /Cv/{id} sau khi tạo/upload CV để chờ BE analyze xong.
 * BE /Cv/wizard và /Cv/upload tự trigger AI analyze — FE chỉ chờ kết quả.
 *
 * @param cvId  ID vừa tạo; truyền null/'' để không poll.
 * @param onReady  Callback khi analyzedAt != null && parseSucceeded == true
 */
export function useCvAnalysisPoller(
  cvId: string | null | undefined,
  onReady?: (cv: CvItemDto) => void
) {
  const [state, setState] = useState<CvPollerState>({
    status: 'idle',
    cv: null,
    progress: 0,
  });

  const pollCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const stop = useCallback(() => {
    activeRef.current = false;
    clearTimer();
  }, []);

  const poll = useCallback(async (id: string) => {
    if (!activeRef.current) return;

    pollCountRef.current += 1;
    const count = pollCountRef.current;
    const progress = Math.min(10 + count * 8, 90); // visual: 18→26→…→90

    setState((prev) => ({ ...prev, status: 'polling', progress }));

    try {
      const res = await cvService.getCv(id);
      if (!activeRef.current) return;

      if (res.ok && res.data) {
        const cv = res.data;

        // Phân tích xong khi có analyzedAt; parseSucceeded cho biết chất lượng
        if (cv.analyzedAt) {
          activeRef.current = false;
          clearTimer();
          setState({ status: 'ready', cv, progress: 100 });
          onReady?.(cv);
          return;
        }
      }
    } catch {
      // mạng lỗi → tiếp tục poll nếu chưa timeout
    }

    if (count >= MAX_POLLS) {
      activeRef.current = false;
      setState((prev) => ({
        ...prev,
        status: 'timeout',
        progress: 100,
        errorMessage: 'AI phân tích mất hơn 30s. Bạn có thể thử lại thủ công.',
      }));
      return;
    }

    // Schedule next poll
    timerRef.current = setTimeout(() => poll(id), POLL_INTERVAL_MS);
  }, [onReady]);

  const startPolling = useCallback(
    (id: string) => {
      if (!id) return;
      stop();
      pollCountRef.current = 0;
      activeRef.current = true;
      setState({ status: 'polling', cv: null, progress: 10 });
      timerRef.current = setTimeout(() => poll(id), POLL_INTERVAL_MS);
    },
    [poll, stop]
  );

  /** Retry thủ công sau timeout/failed: gọi /analyze rồi poll lại */
  const retryAnalyze = useCallback(
    async (id: string) => {
      setState({ status: 'polling', cv: null, progress: 5, errorMessage: undefined });
      try {
        await cvService.analyzeCv(id);
      } catch {
        // fire-and-forget; poll sẽ bắt kết quả
      }
      startPolling(id);
    },
    [startPolling]
  );

  // Auto-start khi cvId thay đổi
  useEffect(() => {
    if (!cvId) {
      stop();
      setState({ status: 'idle', cv: null, progress: 0 });
      return;
    }
    startPolling(cvId);
    return stop;
  }, [cvId, startPolling, stop]);

  return { ...state, startPolling, retryAnalyze, stop };
}
