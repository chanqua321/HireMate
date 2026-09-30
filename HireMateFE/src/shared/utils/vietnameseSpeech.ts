import { playInterviewSpeech, stopInterviewSpeech, resolveInterviewVoice } from './interviewSpeech';

export function getAvailableVietnameseVoice(): SpeechSynthesisVoice | null {
  return resolveInterviewVoice('vi');
}

export function stopVietnameseSpeech(): void {
  stopInterviewSpeech();
}

export function playVietnameseSpeech(
  text: string,
  callbacks?: { onStart?: () => void; onEnd?: () => void; onError?: (error?: unknown) => void },
): void {
  void playInterviewSpeech(text, 'vi', {
    onStart: callbacks?.onStart,
    onEnd: callbacks?.onEnd,
    onError: (issue) => callbacks?.onError?.(issue),
  });
}
