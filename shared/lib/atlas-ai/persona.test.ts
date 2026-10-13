import { describe, expect, it } from 'vitest';
import { MILES_CHARACTER, milesTextPersona, milesVoicePersona } from './persona';

describe('Miles persona', () => {
  it('keeps the same character in text and voice while adapting delivery to the medium', () => {
    const context = { userName: 'Alex', organizationName: 'Example Agency' };
    const text = milesTextPersona(context);
    const voice = milesVoicePersona(context);

    expect(text).toContain(MILES_CHARACTER);
    expect(voice).toContain(MILES_CHARACTER);
    expect(text).toContain('same natural character as your voice conversations');
    expect(text).toContain('Use concise Markdown only when it materially improves clarity');
    expect(voice).toContain('Never read markdown, URLs, or formatting aloud');
    expect(text).toContain('Address the user as Alex. Their agency is Example Agency.');
    expect(voice).toContain('Address the user as Alex. Their agency is Example Agency.');
  });
});
