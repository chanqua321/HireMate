import {
  classifySpeechError,
  selectInterviewVoice,
  speechAudioKey,
  speechIssueMessage,
} from './interviewSpeechCore.ts';

export type InterviewLanguage = 'vi' | 'en';
export type SpeechIssue = 'AUTOPLAY_BLOCKED' | 'VOICE_UNAVAILABLE' | 'TTS_FAILED' | 'UNSUPPORTED' | 'CANCELLED';

export { selectInterviewVoice, speechIssueMessage, classifySpeechError, speechAudioKey };

let currentAudio: HTMLAudioElement | null = null;
const audioUrls = new Map<string, string>();
const audioLoads = new Map<string, Promise<Blob>>();

function haltCurrent(): void {
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  try { synthesis()?.cancel(); } catch { /* ignore */ }
}

type SpeechCallbacks = {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (issue: SpeechIssue) => void;
};

let generation = 0;

function synthesis(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  return window.speechSynthesis;
}

export function loadInterviewVoices(): Promise<SpeechSynthesisVoice[]> {
  const synth = synthesis();
  if (!synth) return Promise.resolve([]);
  const current = synth.getVoices();
  if (current.length > 0) return Promise.resolve(current);
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      const voices = synth.getVoices();
      if (voices.length === 0) return;
      settled = true;
      synth.removeEventListener('voiceschanged', finish);
      resolve(voices);
    };
    synth.addEventListener('voiceschanged', finish);
    try {
      const warmup = new SpeechSynthesisUtterance(' ');
      warmup.volume = 0;
      warmup.lang = 'en-US';
      synth.speak(warmup);
      synth.cancel();
    } catch { /* voice list can still arrive through voiceschanged */ }
    window.setTimeout(() => {
      if (settled) return;
      settled = true;
      synth.removeEventListener('voiceschanged', finish);
      resolve(synth.getVoices());
    }, 800);
  });
}

export function resolveInterviewVoice(language: InterviewLanguage): SpeechSynthesisVoice | null {
  const synth = synthesis();
  if (!synth) return null;
  return selectInterviewVoice(synth.getVoices(), language) as SpeechSynthesisVoice | null;
}

export function stopInterviewSpeech(): void {
  generation += 1;
  haltCurrent();
}

export async function playQuestionAudio(
  request: {
    cacheKey: string;
    load: () => Promise<Blob>;
    language: InterviewLanguage;
    fallbackText: string;
  },
  callbacks?: SpeechCallbacks,
): Promise<void> {
  const id = ++generation;
  haltCurrent();
  try {
    let url = audioUrls.get(request.cacheKey);
    if (!url) {
      let pending = audioLoads.get(request.cacheKey);
      if (!pending) {
        pending = request.load();
        audioLoads.set(request.cacheKey, pending);
      }
      const blob = await pending;
      audioLoads.delete(request.cacheKey);
      if (id !== generation) return;
      if (!blob || blob.size < 64 || !String(blob.type || '').includes('audio')) {
        throw new Error('TTS_FAILED');
      }
      url = URL.createObjectURL(blob);
      audioUrls.set(request.cacheKey, url);
    }
    if (id !== generation) return;
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onended = () => {
      if (id === generation) callbacks?.onEnd?.();
    };
    try {
      await audio.play();
    } catch (error) {
      if (id !== generation) return;
      const issue = classifySpeechError(error) as SpeechIssue;
      callbacks?.onError?.(issue === 'AUTOPLAY_BLOCKED' ? 'AUTOPLAY_BLOCKED' : 'TTS_FAILED');
      callbacks?.onEnd?.();
      return;
    }
    if (id === generation) callbacks?.onStart?.();
  } catch {
    if (id !== generation) return;
    await playBrowserSpeech(request.fallbackText, request.language, id, callbacks);
  }
}

async function playBrowserSpeech(
  text: string,
  language: InterviewLanguage,
  id: number,
  callbacks?: SpeechCallbacks,
): Promise<void> {
  const spoken = text.replace(/\s+/g, ' ').trim();
  const synth = synthesis();
  if (!synth || !spoken) {
    callbacks?.onError?.(synth ? 'TTS_FAILED' : 'UNSUPPORTED');
    callbacks?.onEnd?.();
    return;
  }
  const voices = await loadInterviewVoices();
  if (id !== generation) return;
  const voice = selectInterviewVoice(voices, language) as SpeechSynthesisVoice | null;
  if (!voice) {
    callbacks?.onError?.('TTS_FAILED');
    callbacks?.onEnd?.();
    return;
  }
  const chunks = splitForSpeech(spoken);
  let started = false;
  for (const chunk of chunks) {
    if (id !== generation) return;
    const result = await speakChunk(synth, chunk, voice, language);
    if (id !== generation || result === 'CANCELLED') return;
    if (!started && result === 'OK') {
      started = true;
      callbacks?.onStart?.();
    }
    if (result !== 'OK') {
      callbacks?.onError?.(result === 'VOICE_UNAVAILABLE' ? 'TTS_FAILED' : result);
      callbacks?.onEnd?.();
      return;
    }
  }
  if (id === generation) callbacks?.onEnd?.();
}

export async function playInterviewSpeech(
  text: string,
  language: InterviewLanguage,
  callbacks?: SpeechCallbacks,
): Promise<void> {
  const spoken = text.replace(/\s+/g, ' ').trim();
  const synth = synthesis();
  if (!synth) {
    callbacks?.onError?.('UNSUPPORTED');
    callbacks?.onEnd?.();
    return;
  }
  if (!spoken) {
    callbacks?.onEnd?.();
    return;
  }

  const id = ++generation;
  try { synth.cancel(); } catch { /* ignore */ }
  await new Promise((resolve) => window.setTimeout(resolve, 40));
  if (id !== generation) return;

  const voices = await loadInterviewVoices();
  await new Promise((resolve) => window.setTimeout(resolve, 40));
  if (id !== generation) return;
  const voice = selectInterviewVoice(voices, language) as SpeechSynthesisVoice | null;
  if (!voice) {
    callbacks?.onError?.('VOICE_UNAVAILABLE');
    callbacks?.onEnd?.();
    return;
  }

  const chunks = splitForSpeech(spoken);
  let started = false;
  for (const chunk of chunks) {
    if (id !== generation) return;
    const result = await speakChunk(synth, chunk, voice, language);
    if (id !== generation || result === 'CANCELLED') return;
    if (!started && result === 'OK') {
      started = true;
      callbacks?.onStart?.();
    }
    if (result !== 'OK') {
      callbacks?.onError?.(result);
      callbacks?.onEnd?.();
      return;
    }
  }
  if (id === generation) callbacks?.onEnd?.();
}

function splitForSpeech(text: string): string[] {
  const sentences = text.match(/[^.!?\n]+[.!?\n]?/g) ?? [text];
  const chunks: string[] = [];
  let buffer = '';
  for (const sentence of sentences) {
    if ((buffer + sentence).length > 220 && buffer.trim()) {
      chunks.push(buffer.trim());
      buffer = sentence;
    } else {
      buffer += sentence;
    }
  }
  if (buffer.trim()) chunks.push(buffer.trim());
  return chunks.length > 0 ? chunks : [text];
}

function speakChunk(
  synth: SpeechSynthesis,
  text: string,
  voice: SpeechSynthesisVoice,
  language: InterviewLanguage,
): Promise<'OK' | SpeechIssue> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: 'OK' | SpeechIssue) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(result);
    };
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = language === 'vi' ? 'vi-VN' : 'en-US';
    utterance.rate = 1;
    const timeout = window.setTimeout(() => finish('TTS_FAILED'), Math.max(12_000, text.length * 90));
    utterance.onend = () => finish('OK');
    utterance.onerror = (event) => finish(classifySpeechError(event) as SpeechIssue);
    synth.speak(utterance);
  });
}
