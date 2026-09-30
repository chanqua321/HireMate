import assert from 'node:assert/strict';
import {
  classifySpeechError,
  selectInterviewVoice,
  shouldApplyTranscript,
  speechAudioKey,
  speechIssueMessage,
} from './speech-core.mjs';

const check = (value, name) => {
  assert.ok(value, name);
  console.log(`PASS: ${name}`);
};

const vi = { name: 'Microsoft An', lang: 'vi-VN' };
const en = { name: 'Microsoft Aria', lang: 'en-US' };
const enGb = { name: 'Daniel', lang: 'en-GB' };

check(selectInterviewVoice([], 'vi') === null, '1 empty voice list does not invent a Vietnamese voice');
check(selectInterviewVoice([vi, en], 'vi')?.lang === 'vi-VN', '1 vi question selects vi-VN');
check(selectInterviewVoice([en, { name: 'Vi', lang: 'vi' }], 'vi')?.lang === 'vi', 'vi prefix is accepted after exact locale');
check(selectInterviewVoice([en], 'vi') === null, '4 no vi voice does not fall back to English');
check(selectInterviewVoice([vi, en], 'en')?.lang === 'en-US', '2 en question selects en-US');
check(selectInterviewVoice([vi, enGb], 'en')?.lang === 'en-GB', 'en prefix is accepted');
check(selectInterviewVoice([vi], 'en') === null, '5 no en voice does not fall back to Vietnamese');
check(selectInterviewVoice([], 'en') === null, '3 voiceschanged can start from an empty list');

check(classifySpeechError({ error: 'not-allowed' }) === 'AUTOPLAY_BLOCKED', '6 autoplay rejected');
check(classifySpeechError({ name: 'NotAllowedError' }) === 'AUTOPLAY_BLOCKED', '6 NotAllowedError is autoplay');
check(classifySpeechError({ error: 'canceled' }) === 'CANCELLED', '9 double replay cancels the previous utterance');
check(classifySpeechError({ error: 'interrupted' }) === 'CANCELLED', '10 question change interrupts speech');
check(classifySpeechError({ error: 'synthesis-failed' }) === 'TTS_FAILED', '12 other TTS failure');
check(speechIssueMessage('AUTOPLAY_BLOCKED', 'vi').includes('Nghe lại'), '6 Vietnamese autoplay hint');
check(speechIssueMessage('VOICE_UNAVAILABLE', 'vi').includes('tiếng Việt'), '4 Vietnamese missing voice');
check(speechIssueMessage('VOICE_UNAVAILABLE', 'en').includes('English'), '5 English missing voice');
check(!speechIssueMessage('TTS_FAILED', 'vi').includes('translate.google'), 'no hidden provider URL');

check(shouldApplyTranscript('  SQL Server  ', 1, 1), '21 valid transcript applies to the same question');
check(!shouldApplyTranscript('   ', 1, 1), '17 empty transcript is ignored');
check(!shouldApplyTranscript('hello', 0, 1), '24 stale STT response is ignored');
check(shouldApplyTranscript('Em sử dụng Entity Framework Core với SQL Server.', 2, 2), '23 mixed technical Vietnamese stays on the same question');
check(speechAudioKey('s', 1, 'vi', ' SQL ') === speechAudioKey('s', 1, 'vi', 'SQL'), '13 replay uses the same audio key');
check(speechAudioKey('s', 1, 'vi', 'SQL') !== speechAudioKey('s', 2, 'vi', 'SQL'), '15 question change uses another audio key');
check(speechAudioKey('s', 1, 'vi', 'SQL') !== speechAudioKey('s', 1, 'en', 'SQL'), '1 language is part of the audio key');

console.log('Interview speech checks passed.');
