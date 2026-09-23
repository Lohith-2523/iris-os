import { describe, expect, it } from 'vitest';
import { hasMeaningfulEnglishSpeech } from './voice-input';

describe('hasMeaningfulEnglishSpeech', () => {
  it.each(['Hello Miles.', 'um', 'Uh, create a task.', 'hmm...'])('accepts English speech: %s', (value) => {
    expect(hasMeaningfulEnglishSpeech(value)).toBe(true);
  });

  it.each(['', '...', '[noise]', '(background noise). Hello', '音楽'])('rejects non-speech or non-English first sentences: %s', (value) => {
    expect(hasMeaningfulEnglishSpeech(value)).toBe(false);
  });
});
