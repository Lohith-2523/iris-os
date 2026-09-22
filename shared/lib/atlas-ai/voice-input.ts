const NON_SPEECH_LABEL = /\[(?:background )?(?:noise|music|silence|sound|inaudible|unintelligible)]|\((?:background )?(?:noise|music|silence|sound|inaudible|unintelligible)\)/gi;

/**
 * Realtime transcription can emit punctuation or non-speech labels for ambient
 * noise. Only accept a turn when its first sentence contains an English word
 * (including short fillers such as "um", "uh", or "hmm").
 */
export function hasMeaningfulEnglishSpeech(transcript: string) {
  const firstSentence = transcript.trim().split(/[.!?]+/, 1)[0] || '';
  const spokenContent = firstSentence.replace(NON_SPEECH_LABEL, ' ').trim();
  return /\b[a-z]+(?:['’-][a-z]+)*\b/i.test(spokenContent);
}
