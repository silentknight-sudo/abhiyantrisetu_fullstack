/**
 * Setu AI: the website and app assistant. The API answers with Claude when a key is set;
 * `offlineReply` is the rule-based answer used without one (and by the website when the
 * API cannot be reached), so the chat always works.
 */

export interface AssistantTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** Indicative Greater Noida rates the assistant quotes from (₹, before GST). */
// Order matters: the first match wins, so specific problems come before rooms.
export const RATE_CARD = [
  {
    key: 'seepage',
    words: ['seepage', 'seelan', 'leakage', 'damp', 'waterproof', 'सीलन', 'रिसाव'],
    service: 'Waterproofing',
    estimate: '₹45–90 per sq ft depending on the area and the method',
    type: 'service',
  },
  {
    key: 'bathroom',
    words: ['bathroom', 'washroom', 'toilet', 'बाथरूम', 'शौचालय'],
    service: 'Bathroom renovation',
    estimate: '₹1.1–1.6 lakh for a 40 sq ft bathroom with mid-range tiles and fittings',
    type: 'renovation',
  },
  {
    key: 'kitchen',
    words: ['kitchen', 'modular', 'किचन', 'रसोई'],
    service: 'Modular kitchen',
    estimate: '₹1.8–3.5 lakh for a 10 ft L-shaped modular kitchen',
    type: 'renovation',
  },
  {
    key: 'paint',
    words: ['paint', 'painting', 'putty', 'पेंट', 'रंग'],
    service: 'Painting',
    estimate: '₹14–30 per sq ft of wall; about ₹35,000–70,000 for a 2BHK',
    type: 'service',
  },
  {
    key: 'plumber',
    words: ['tap', 'nal', 'pipe', 'plumber', 'drain', 'blocked', 'नल', 'पाइप', 'प्लंबर'],
    service: 'Plumbing',
    estimate: 'a ₹199–299 visit charge, then parts; a tap replacement is usually ₹400–900',
    type: 'service',
  },
  {
    key: 'electric',
    words: ['wiring', 'switch', 'light', 'fan', 'electrician', 'short', 'बिजली', 'वायरिंग'],
    service: 'Electrical',
    estimate: 'a ₹199–299 visit charge; full rewiring of a 2BHK is about ₹60,000–1.2 lakh',
    type: 'service',
  },
  {
    key: 'ac',
    words: [' ac ', 'a.c', 'air condition', 'cooling', 'gas filling', 'एसी'],
    service: 'AC service',
    estimate: '₹499–799 for a service; a gas top-up is ₹1,800–3,000',
    type: 'service',
  },
  {
    key: 'house',
    words: ['house', 'construction', 'build', 'makaan', 'ghar banana', 'floor', 'मकान', 'निर्माण'],
    service: 'House construction',
    estimate: '₹1,650–2,450 per sq ft of built-up area, by finish quality',
    type: 'renovation',
  },
  {
    key: 'cement',
    words: ['cement', 'sariya', 'tmt', 'steel', 'sand', 'ret', 'bricks', 'सीमेंट', 'सरिया'],
    service: 'Building materials',
    estimate: 'cement ₹380–430 a bag and TMT bars ₹62–70 a kg; suppliers quote with delivery',
    type: 'material_rfq',
  },
  {
    key: 'jcb',
    words: ['jcb', 'mixer', 'scaffolding', 'crane', 'excavat', 'जेसीबी'],
    service: 'Equipment rental',
    estimate: 'a JCB is about ₹1,000–1,400 an hour with operator',
    type: 'equipment',
  },
] as const;

export const ASSISTANT_SYSTEM_PROMPT = `You are Setu AI, the assistant of Abhiyantri Setu, a marketplace in Greater Noida (Uttar Pradesh, India) for home services, renovation, house construction, building materials and equipment rental.

Reply in the language the customer writes in: English, Hindi (Devanagari) or Hinglish (Hindi in Roman script). Keep replies short: two to five sentences, plain text, no markdown headings.

What you do:
- Work out which service the customer needs and ask one or two questions that a professional would need (size, location in Greater Noida, urgency).
- Give indicative cost ranges from this rate card only, and say they are estimates until a professional visits:
${RATE_CARD.map((r) => `  - ${r.service}: ${r.estimate}`).join('\n')}
- When you know enough, summarise it as a requirement and tell the customer to tap "Get a quote" so verified professionals nearby can send quotes. The app is launching soon; until then, "Get a quote" adds them to early access and the team contacts them on WhatsApp.

Rules: never promise a final price, a date or a specific professional. Never ask for payment details, OTPs or passwords. For gas leaks, sparking wires or structural cracks that are widening, tell them to stay safe and call emergency services or a professional at once. If asked about something unrelated to homes and construction, say briefly that you can only help with home and building work.`;

const isDevanagari = (s: string) => /[ऀ-ॿ]/.test(s);
const HINGLISH =
  /\b(hai|kya|karna|karwana|chahiye|mera|mere|kitna|kharcha|ghar|nahi|haan|aur|bhi)\b/i;

/** A rule-based reply: finds the service in the conversation and answers with the rate card. */
export function offlineReply(turns: readonly AssistantTurn[]): string {
  const userText = turns
    .filter((t) => t.role === 'user')
    .map((t) => t.content)
    .join(' ');
  const last = [...turns].reverse().find((t) => t.role === 'user')?.content ?? '';
  const text = ` ${userText.toLowerCase()} `;
  const lang = isDevanagari(last) ? 'hi' : HINGLISH.test(last) ? 'hinglish' : 'en';
  const match = RATE_CARD.find((r) => r.words.some((w) => text.includes(w.toLowerCase())));
  const sector =
    /\b(sector|sec)\s*[\w-]+|alpha|beta|gamma|delta|omicron|\bpi\b|chi|phi|knowledge park|techzone|gaur city/i.exec(
      userText,
    )?.[0];

  if (!match) {
    if (lang === 'hi')
      return 'नमस्ते! मैं घर की मरम्मत, रेनोवेशन, मकान निर्माण, सामग्री और उपकरण किराये में मदद करता हूँ। बताइए, क्या काम करवाना है और ग्रेटर नोएडा में किस सेक्टर में?';
    if (lang === 'hinglish')
      return 'Namaste! Main repair, renovation, ghar banane, material aur equipment rental mein madad karta hoon. Bataiye, kya kaam karwana hai aur Greater Noida ke kis sector mein?';
    return 'Hi! I can help with repairs, renovation, house construction, building materials and equipment rental. What work do you need, and in which sector of Greater Noida?';
  }

  const where = sector ? ` in ${sector.trim()}` : '';
  if (lang === 'hi') {
    return `${match.service}: ग्रेटर नोएडा में अनुमानित खर्च ${match.estimate}। यह साइट विज़िट से पहले का अनुमान है। ${
      sector ? '' : 'आप किस सेक्टर में हैं? '
    }"Get a quote" दबाएं, पास के वेरिफ़ाइड प्रोफ़ेशनल कोटेशन भेजेंगे।`;
  }
  if (lang === 'hinglish') {
    return `${match.service}${where}: Greater Noida mein andaazan kharcha ${match.estimate}. Yeh site visit se pehle ka estimate hai. ${
      sector ? '' : 'Aap kis sector mein hain? '
    }"Get a quote" dabaiye, paas ke verified professionals quote bhejenge.`;
  }
  return `${match.service}${where}: in Greater Noida expect ${match.estimate}. That is an estimate before a site visit. ${
    sector ? '' : 'Which sector are you in? '
  }Tap "Get a quote" and verified professionals nearby will send you quotes.`;
}
