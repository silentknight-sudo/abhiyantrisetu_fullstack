import { describe, expect, it } from 'vitest';
import { offlineReply } from '../src/assistant';

const ask = (content: string) => offlineReply([{ role: 'user', content }]);

describe('offlineReply', () => {
  it('answers seepage before the room it is in, in Hinglish', () => {
    const reply = ask('Bathroom mein seelan aa rahi hai');
    expect(reply).toContain('Waterproofing');
    expect(reply).toContain('Aap kis sector mein hain?');
  });

  it('answers in Hindi when asked in Devanagari', () => {
    expect(ask('किचन मॉड्यूलर बनवाना है')).toContain('अनुमानित खर्च');
  });

  it('skips the sector question once a sector is given', () => {
    const reply = ask('Cost to build a 1,200 sq ft house in Sector Pi?');
    expect(reply).toContain('House construction in Sector Pi');
    expect(reply).not.toContain('Which sector');
  });

  it('asks what is needed when it recognises no service', () => {
    expect(ask('hello')).toContain('What work do you need');
  });
});
