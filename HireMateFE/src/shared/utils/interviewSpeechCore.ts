export type SpeechIssueCode = 'AUTOPLAY_BLOCKED' | 'VOICE_UNAVAILABLE' | 'TTS_FAILED' | 'UNSUPPORTED' | 'CANCELLED';

export function selectInterviewVoice<T extends { lang?: string }>(
  voices: Array<T | null | undefined> | null | undefined,
  language: 'vi' | 'en',
): T | null {
  const list = Array.isArray(voices) ? voices : [];
  const langOf = (voice: T | null | undefined) => String(voice?.lang || '').toLowerCase().replace('_', '-');
  if (language === 'vi') {
    return list.find((voice) => langOf(voice) === 'vi-vn')
      || list.find((voice) => langOf(voice).startsWith('vi'))
      || null;
  }
  return list.find((voice) => langOf(voice) === 'en-us')
    || list.find((voice) => langOf(voice).startsWith('en'))
    || null;
}

export function classifySpeechError(error: unknown): SpeechIssueCode {
  const record = error as { error?: string; name?: string; message?: string } | null;
  const code = String(record?.error || record?.name || record?.message || error || '').toLowerCase();
  if (code.includes('not-allowed') || code.includes('notallowed')) return 'AUTOPLAY_BLOCKED';
  if (code.includes('voice_unavailable') || code.includes('unavailable')) return 'VOICE_UNAVAILABLE';
  if (code.includes('unsupported') || code.includes('synthesis-missing')) return 'UNSUPPORTED';
  if (code.includes('canceled') || code.includes('cancelled') || code.includes('interrupted')) return 'CANCELLED';
  return 'TTS_FAILED';
}

export function speechIssueMessage(issue: string, language: 'vi' | 'en'): string {
  const english = language === 'en';
  if (issue === 'AUTOPLAY_BLOCKED') {
    return english
      ? 'The browser blocked automatic playback. Press Listen again to hear the question.'
      : 'Trình duyệt chưa cho phép tự phát. Nhấn \'Nghe lại\' để nghe câu hỏi.';
  }
  if (issue === 'VOICE_UNAVAILABLE') {
    return english
      ? 'This device has no English reading voice.'
      : 'Thiết bị hiện không có giọng đọc phù hợp cho tiếng Việt.';
  }
  if (issue === 'UNSUPPORTED') {
    return english
      ? 'This browser cannot read questions aloud. You can still read and type your answer.'
      : 'Trình duyệt không hỗ trợ đọc câu hỏi. Bạn vẫn có thể đọc và trả lời bằng văn bản.';
  }
  return english
    ? 'Voice playback failed. You can still read the question and continue the interview.'
    : 'Không thể phát giọng đọc. Bạn vẫn có thể đọc câu hỏi và tiếp tục phỏng vấn.';
}

export function speechAudioKey(sessionId: string, orderIndex: number, language: 'vi' | 'en', text: string): string {
  return `${sessionId}:${orderIndex}:${language}:${text.trim()}`;
}

export function shouldApplyTranscript(transcript: string, questionIndex: number, activeIndex: number): boolean {
  return questionIndex === activeIndex && typeof transcript === 'string' && transcript.trim().length > 0;
}
