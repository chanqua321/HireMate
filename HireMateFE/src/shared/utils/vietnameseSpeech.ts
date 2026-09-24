/**
 * HireMate — Robust Vietnamese Text-to-Speech Engine
 * Dual-layer Architecture:
 * Layer 1: Native Web Speech API (if Vietnamese voice is available: Microsoft An, HoaiMy, Google Tiếng Việt, vi-VN)
 * Layer 2: High-Quality Neural Vietnamese Audio Stream (guaranteed 100% Vietnamese pronunciation, never Japanese/English)
 */

let currentAudio: HTMLAudioElement | null = null;
let isAudioPlayingState = false;

/**
 * Finds a genuine Vietnamese voice from window.speechSynthesis
 */
export function getAvailableVietnameseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Prioritize genuine Vietnamese voices
  return (
    voices.find((v) => {
      const n = v.name.toLowerCase();
      const l = v.lang.toLowerCase();
      return (
        (n.includes('hoaimy') || n.includes('namminh') || n.includes(' an') || n.includes('an ')) &&
        (l.startsWith('vi') || n.includes('vietnam'))
      );
    }) ||
    voices.find((v) => {
      const l = v.lang.toLowerCase();
      const n = v.name.toLowerCase();
      return (
        l === 'vi-vn' ||
        l === 'vi_vn' ||
        l.startsWith('vi') ||
        n.includes('vietnam') ||
        n.includes('tiếng việt') ||
        n.includes('vietnamese')
      );
    }) ||
    null
  );
}

/**
 * Clean text for natural speech synthesis
 */
export function cleanSpeechText(text: string): string {
  return text
    .replace(/[*#📌👉⭐🎙️[\]()⚡🔥💎🚀✨]/g, '')
    .replace(/\b(Situation|Task|Action|Result)\b/gi, '')
    .replace(/\[S\]|\[T\]|\[A\]|\[R\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Stop any ongoing Vietnamese speech (both WebSpeech and Audio stream)
 */
export function stopVietnameseSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }

  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.src = '';
    } catch (e) {}
    currentAudio = null;
  }

  isAudioPlayingState = false;
}

/**
 * Play speech in guaranteed native Vietnamese
 */
export function playVietnameseSpeech(
  text: string,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err?: any) => void;
  }
): void {
  const clean = cleanSpeechText(text);
  if (!clean) {
    if (callbacks?.onEnd) callbacks.onEnd();
    return;
  }

  // Always cancel any previous ongoing audio
  stopVietnameseSpeech();

  const viVoice = getAvailableVietnameseVoice();

  // If a genuine Vietnamese voice exists in the browser, use Web Speech API
  if (viVoice && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.voice = viVoice;
      utterance.lang = viVoice.lang || 'vi-VN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        isAudioPlayingState = true;
        if (callbacks?.onStart) callbacks.onStart();
      };

      utterance.onend = () => {
        isAudioPlayingState = false;
        if (callbacks?.onEnd) callbacks.onEnd();
      };

      utterance.onerror = (err) => {
        isAudioPlayingState = false;
        // Fallback to Layer 2 audio stream if WebSpeech failed
        playVietnameseAudioStream(clean, callbacks);
      };

      isAudioPlayingState = true;
      if (callbacks?.onStart) callbacks.onStart();
      window.speechSynthesis.speak(utterance);
      return;
    } catch (e) {
      // Fallback to Layer 2 audio stream
    }
  }

  // Layer 2: High-Quality Vietnamese Neural Audio Stream
  playVietnameseAudioStream(clean, callbacks);
}

/**
 * Layer 2: Vietnamese Neural Audio Stream via HTML5 Audio
 */
function playVietnameseAudioStream(
  cleanText: string,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err?: any) => void;
  }
): void {
  try {
    // Split into sentences if text is long (> 160 chars)
    const chunks = splitIntoSentences(cleanText, 160);
    let currentChunkIdx = 0;

    const playNextChunk = () => {
      if (currentChunkIdx >= chunks.length) {
        isAudioPlayingState = false;
        if (callbacks?.onEnd) callbacks.onEnd();
        return;
      }

      const chunk = chunks[currentChunkIdx];
      currentChunkIdx++;

      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(
        chunk
      )}`;

      const audio = new Audio(url);
      currentAudio = audio;

      audio.onplay = () => {
        isAudioPlayingState = true;
        if (currentChunkIdx === 1 && callbacks?.onStart) {
          callbacks.onStart();
        }
      };

      audio.onended = () => {
        playNextChunk();
      };

      audio.onerror = (err) => {
        console.warn('Audio stream fallback error:', err);
        isAudioPlayingState = false;
        if (callbacks?.onError) callbacks.onError(err);
        if (callbacks?.onEnd) callbacks.onEnd();
      };

      audio.play().catch((err) => {
        console.warn('Audio play prevented or failed:', err);
        isAudioPlayingState = false;
        if (callbacks?.onError) callbacks.onError(err);
        if (callbacks?.onEnd) callbacks.onEnd();
      });
    };

    playNextChunk();
  } catch (err) {
    isAudioPlayingState = false;
    if (callbacks?.onError) callbacks.onError(err);
    if (callbacks?.onEnd) callbacks.onEnd();
  }
}

/**
 * Splits long text into natural sentences
 */
function splitIntoSentences(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const s of sentences) {
    if ((currentChunk + s).length <= maxLength) {
      currentChunk += (currentChunk ? ' ' : '') + s.trim();
    } else {
      if (currentChunk) chunks.push(currentChunk);
      if (s.length > maxLength) {
        // Force split by commas or words
        const words = s.split(' ');
        let temp = '';
        for (const w of words) {
          if ((temp + ' ' + w).length <= maxLength) {
            temp += (temp ? ' ' : '') + w;
          } else {
            if (temp) chunks.push(temp);
            temp = w;
          }
        }
        if (temp) currentChunk = temp;
      } else {
        currentChunk = s.trim();
      }
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks.length > 0 ? chunks : [text];
}
