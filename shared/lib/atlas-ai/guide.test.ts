import { describe, expect, it } from 'vitest';
import { ATLAS_GUIDE_MESSAGES, ATLAS_GUIDE_SESSION_ID, ATLAS_GUIDE_TITLE } from './guide';

describe('Miles guide chat', () => {
  it('has a stable pinned identity and only assistant-authored guidance', () => {
    expect(ATLAS_GUIDE_SESSION_ID).toBe('atlas-guide');
    expect(ATLAS_GUIDE_TITLE).toBe('How Miles works');
    expect(ATLAS_GUIDE_MESSAGES.length).toBeGreaterThanOrEqual(7);
    expect(ATLAS_GUIDE_MESSAGES.every((message) => message.role === 'assistant')).toBe(true);
  });

  it('documents capabilities, controls, confirmations, and access boundaries', () => {
    const guide = ATLAS_GUIDE_MESSAGES.map((message) => message.content).join('\n');

    expect(guide).toContain('What you can ask Miles');
    expect(guide).toContain('What Miles can create');
    expect(guide).toContain('New Chat');
    expect(guide).toContain('Suggested query buttons');
    expect(guide).toContain('Microphone button');
    expect(guide).toContain('Send button');
    expect(guide).toContain('Reply **Confirm**');
    expect(guide).toContain('AI data-sharing consent');
    expect(guide).toContain('**Pro**');
    expect(guide).toContain('**Advanced**');
  });
});
