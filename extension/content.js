// Meet Spark — engagement toolkit for Google Meet
(() => {
  if (window.__meetSpark) return;
  window.__meetSpark = true;

  /* ============================================================
   * Content
   * ============================================================ */
  const ICEBREAKERS = {
    "Warm-up": [
      "Chai or filter coffee — and how do you take it?",
      "What's the best thing you ate this week — ghar ka khana counts!",
      "Monsoon, winter or summer — which season do you enjoy most?",
      "What's your favourite street food, and which city makes it best?",
      "What's your go-to comfort food after a long day?",
      "Which song has been on repeat for you lately — any language?",
      "What's one place in India you'd love to visit next?",
      "How are you planning to spend your next long weekend?",
      "Which festival do you look forward to most, and why?",
      "What's the one snack you always keep at home?"
    ],
    "Work": [
      "What's one tool or shortcut that saves you time every day?",
      "What's the best career advice you've received from a senior or mentor?",
      "What was your first job or internship like?",
      "What's your best tip for handling a busy week?",
      "What does a perfect workday look like for you — office or WFH?",
      "What's a project you're quietly proud of?",
      "If you could automate one task forever, which would it be?",
      "What's your best trick for beating the commute (or the Monday blues)?",
      "What's something you've learned from a teammate recently?"
    ],
    "Fun": [
      "If your life were a movie, which actor would play you?",
      "Which dish from another state would you eat every day if you could?",
      "Train journey or road trip — what's your best travel memory?",
      "What's the most memorable cricket moment you've watched?",
      "Which cartoon or TV show did you love as a kid?",
      "If you could master one classical art — music, dance, painting — which would it be?",
      "What's the funniest thing that's happened to you at a wedding?",
      "Which mithai could you never say no to?",
      "What would your autobiography be called?",
      "Which film dialogue do you quote the most?"
    ],
    "Reflective": [
      "What's a habit that has made a real difference in your life?",
      "What's something your parents or grandparents taught you that still helps you?",
      "Who has influenced the way you work the most?",
      "What would you tell yourself on your first day at work?",
      "What are you learning right now outside of work?",
      "What's a small tradition from home that you still follow?",
      "What does a great team look like to you?"
    ]
  };

  const WYR = [
    [
      "Unlimited chai for life",
      "Unlimited coffee for life"
    ],
    [
      "Biryani every day",
      "Dosa every day"
    ],
    [
      "Work from Goa for a month",
      "Work from the hills (Manali) for a month"
    ],
    [
      "Travel by train across India",
      "Take a road trip across India"
    ],
    [
      "Watch a cricket final live in the stadium",
      "Watch it at home with family and snacks"
    ],
    [
      "Never face traffic again",
      "Never face a power cut again"
    ],
    [
      "Speak every Indian language",
      "Cook every Indian cuisine perfectly"
    ],
    [
      "Long weekend every month",
      "One extra week of leave a year"
    ],
    [
      "Monsoon all year",
      "Winter all year"
    ],
    [
      "Always 10 minutes early",
      "Always 5 minutes late"
    ],
    [
      "Present to the whole company",
      "Present to the leadership team"
    ],
    [
      "Camera always on",
      "Mic always unmuted"
    ],
    [
      "Street food tour in Delhi",
      "Seafood trail in Kerala"
    ],
    [
      "Watch only old classic films",
      "Watch only the latest releases"
    ],
    [
      "A personal chef",
      "A personal driver"
    ],
    [
      "Win a Filmfare award",
      "Win an Olympic medal"
    ],
    [
      "Live in a big city",
      "Live in your hometown"
    ],
    [
      "Give up sweets for a year",
      "Give up fried snacks for a year"
    ]
  ];

  const BINGO = [
    "“Am I audible?”",
    "“Sorry, network issue”",
    "“Can you see my screen?”",
    "Pressure cooker whistle",
    "Doorbell / delivery arrives",
    "“Just give me two minutes”",
    "“You're on mute”",
    "Power cut / inverter beep",
    "“Kindly share the deck”",
    "“Let's take this offline”",
    "Someone joins late",
    "“I'll drop off in five”",
    "Horn or traffic noise",
    "“Hope everyone is doing well”",
    "“Okay, okay, okay”",
    "Family member walks in",
    "“Can you repeat that?”",
    "“I think you're breaking”",
    "“Let's prepone it”",
    "“I'll revert on this”",
    "Chai break mentioned",
    "Wrong window shared",
    "“Next slide, please”",
    "Two people talk at once",
    "Frozen video",
    "“We're running short on time”",
    "Pet or pigeon cameo",
    "“Any questions? No? Great”",
    "Someone speaks while on mute",
    "“I'll send a follow-up mail”"
  ];

  /* ============================================================
   * Utilities
   * ============================================================ */

  // Google Meet enforces Trusted Types — plain innerHTML assignments throw.
  let ttPolicy = null;
  try {
    if (window.trustedTypes && trustedTypes.createPolicy) {
      ttPolicy = trustedTypes.createPolicy("meet-spark-" + Math.random().toString(36).slice(2, 8), { createHTML: (h) => h });
    }
  } catch (e) { console.warn("[Meet Spark] Trusted Types policy unavailable", e); }
  function setHTML(el, html) {
    // eslint-disable-next-line no-restricted-syntax -- G2-REVIEWED: TT-safe sink inside setHTML() (value is a TrustedHTML from ttPolicy)
    if (ttPolicy) { el.innerHTML = ttPolicy.createHTML(html); return; }
    // eslint-disable-next-line no-restricted-syntax -- G2-REVIEWED: TT-safe sink inside setHTML() (throws under TT, then falls back to buildDOM)
    try { el.innerHTML = html; return; } catch (e) { /* fall through */ }
    // Strictest CSP: build the DOM ourselves (no HTML parsing sinks at all).
    el.replaceChildren(buildDOM(html));
  }
  const VOID = new Set(["br", "input", "img", "hr", "path", "circle", "rect", "meta", "link"]);
  const SVG_NS = "http://www.w3.org/2000/svg";
  const decode = (t) => t.replace(/&(#\d+|#x[\da-f]+|amp|lt|gt|quot|#39|nbsp);/gi, (m, e) => {
    const map = { amp: "&", lt: "<", gt: ">", quot: '"', nbsp: " " };
    if (map[e.toLowerCase()]) return map[e.toLowerCase()];
    return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  });
  function buildDOM(html) {
    const frag = document.createDocumentFragment();
    const stack = [frag];
    const top = () => stack[stack.length - 1];
    const re = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)/g;
    let m;
    while ((m = re.exec(html))) {
      if (m[0].startsWith("<!--")) continue;
      if (m[1]) { // closing tag
        const tag = m[1].toLowerCase();
        for (let i = stack.length - 1; i > 0; i--) {
          if (stack[i].localName === tag) { stack.length = i; break; }
        }
      } else if (m[2]) { // opening tag
        const tag = m[2].toLowerCase();
        const parent = top();
        const inSvg = tag === "svg" || (parent.namespaceURI === SVG_NS);
        const node = inSvg ? document.createElementNS(SVG_NS, tag === "svg" ? "svg" : m[2]) : document.createElement(tag);
        const attrRe = /([^\s=>\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
        let a;
        while ((a = attrRe.exec(m[3] || ""))) node.setAttribute(a[1], decode(a[2] ?? a[3] ?? a[4] ?? ""));
        parent.appendChild(node);
        if (tag === "style") { // raw text content
          const end = html.indexOf("</style>", re.lastIndex);
          node.textContent = html.slice(re.lastIndex, end);
          re.lastIndex = end + 8;
        } else if (!m[4] && !VOID.has(tag)) {
          stack.push(node);
        }
      } else if (m[5]) {
        top().appendChild(document.createTextNode(decode(m[5])));
      }
    }
    return frag;
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  // ROSTER-002: a meeting code (abc-defg-hij) or a /lookup/ path; null on the home screen and other pages.
  const MEETING_PATH = /^\/(?:_meet\/)?(?:([a-z]{3}-[a-z]{4}-[a-z]{3})|lookup\/([\w-]+))(?:[/?#]|$)/i;
  const meetingId = () => { const m = location.pathname.match(MEETING_PATH); return m ? (m[1] || "lookup-" + m[2]).toLowerCase() : null; };
  // ROSTER-004: stored data is validated before use; anything of the wrong shape is ignored.
  const validNames = (v) => (Array.isArray(v) ? v.filter((n) => typeof n === "string" && n.trim() && n.length <= 80) : []);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(`meetSpark:${k}`); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(`meetSpark:${k}`, JSON.stringify(v)); } catch {} }
  };
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const initials = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const AVATAR = ["#1a73e8", "#188038", "#e37400", "#a142f4", "#d93025", "#007b83", "#c26401", "#3949ab"];
  const avatarColor = (n) => AVATAR[[...n].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % AVATAR.length];

  const I = {
    spark: '<path d="M12 2l2.1 6.4L20.5 10.5 14.1 12.6 12 19l-2.1-6.4L3.5 10.5 9.9 8.4z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>',
    close: '<path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6z"/>',
    chat: '<path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7l-4 4V6a2 2 0 0 1 1-2zm1 2v11.2L6.2 16H20V6z"/>',
    split: '<path d="M11 3h2v18h-2zM4 6h5v2H4v8h5v2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm11 0h5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5v-2h5V8h-5z"/>',
    grid: '<path d="M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm8-2h8v8h-8zm2 2v4h4v-4z"/>',
    people: '<path d="M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0-6a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0 8c-3.3 0-7 1.6-7 4v2h14v-2c0-2.4-3.7-4-7-4zm-5 4c.3-.8 2.6-2 5-2s4.7 1.2 5 2zm12.5-6.1A4 4 0 0 0 16 4.1a4 4 0 0 1 0 7.8zM17 14c1.7.9 3 2.2 3 4v2h2v-2c0-1.8-2.2-3.3-5-4z"/>',
    copy: '<path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11z"/>',
    next: '<path d="M12 4l-1.4 1.4 5.6 5.6H4v2h12.2l-5.6 5.6L12 20l8-8z"/>',
    sync: '<path d="M12 4V1L8 5l4 4V6a6 6 0 0 1 5.7 7.9l1.5 1.5A8 8 0 0 0 12 4zm0 14a6 6 0 0 1-5.7-7.9L4.8 8.6A8 8 0 0 0 12 20v3l4-4-4-4z"/>',
    person: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4z"/>',
    check: '<path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>',
    plus: '<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/>'
  };
  const icon = (name, size = 20) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">${I[name]}</svg>`;

  /* ============================================================
   * Participant detection
   * ============================================================ */
  // ROSTER-109: also Meet's presenting / tile control phrases (backup for ROSTER-108).
  const JUNK = /^(you|me|presentation|presenting|host|meeting host|co-host|more options|more actions|pin|unpin|mute|remove|keep|keep_outline|more_vert|mic|mic_off|mic_none|frame_person|visual_effects|in the meeting|contributors|waiting to join|people|participants|zoom in|zoom out|reset zoom|fit to frame|fill frame|you are presenting|stop presenting|present now|full screen|exit full screen|backgrounds and effects)$/i;
  // ROSTER-107: a status note in brackets — "(Presenting)", "(Presenting, annotating)", "(You, presenting)",
  // "(Host · Presenting)", or cut off without a closing bracket — starts with one of these words.
  const STATUS_NOTE = /\s*\((?:you|presenting|presentation|host|meeting host|co-host)\b[^)]*(?:\)|$)/gi;
  function cleanName(raw) {
    if (!raw) return null;
    let n = String(raw).split("\n")[0]
      .replace(STATUS_NOTE, " ")
      .replace(/\s+/g, " ").trim();
    if (!n || n.length > 60 || n.length < 2) return null;
    if (JUNK.test(n) || /_/.test(n) || /^\d+$/.test(n)) return null;
    if (/\b(presentation|is presenting|joined|left the meeting)\b/i.test(n)) return null;
    return n;
  }

  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];
  const log = (...a) => console.debug("[Meet Spark]", ...a);
  const visible = (el) => !!el && el.getClientRects().length > 0;
  const firstWord = (el) => ((el.innerText || el.textContent || "").trim().split(/\s+/)[0] || "").toLowerCase();

  // --- Finding Meet's controls (several strategies, Meet changes often) ---
  // Label of any clickable element (aria-label, tooltip, labelledby or title).
  function labelOf(el) {
    const by = el.getAttribute("aria-labelledby");
    const byText = by ? by.split(/\s+/).map((id) => document.getElementById(id)?.textContent || "").join(" ") : "";
    return (el.getAttribute("aria-label") || el.getAttribute("data-tooltip") || byText || el.getAttribute("title") || "").trim();
  }
  // STRICT matching — never click toggles/settings (e.g. "Let participants send messages").
  const PEOPLE_LABEL = /^(people|show everyone|everyone|participants|show participants|view participants)\b/i;
  // SAFE-004: also plurals and verb forms ("Meeting options", "Everyone messages", "Muted").
  const UNSAFE_LABEL = /\b(let|allow|turn|send|message|chat|mute|remove|lock|admit|deny|host|settings|option|access)(s|es|d|ed|ing)?\b/i;
  function safeCandidate(el) {
    if (!visible(el)) return false;
    const role = el.getAttribute("role");
    if (role === "switch" || role === "checkbox" || role === "menuitemcheckbox" || el.hasAttribute("aria-checked")) return false;
    const label = labelOf(el);
    return !UNSAFE_LABEL.test(label);
  }
  // SAFE-001: the ONLY place Spark clicks Meet's DOM. Re-checks safeCandidate() at click time and
  // refuses elements Meet has removed or replaced. Every caller passes a reason for the debug log.
  function safeClick(el, reason) {
    if (!el || !el.isConnected || !safeCandidate(el)) { log("safeClick refused:", reason); return false; }
    log("click:", reason, labelOf(el) || firstWord(el));
    // eslint-disable-next-line no-restricted-syntax -- G1-REVIEWED: the single reviewed click site; safeCandidate() is checked on the line above (GR-2, SAFE-001)
    el.click();
    return true;
  }
  // SAFE-002: group headers inside the participants list that may be expanded ("Contributors" etc.).
  const GROUP_HEADER = /\b(contributors|in the meeting|in call|participants|others|guests)\b/i;
  function expandGroups(list) {
    qa('[aria-expanded="false"]', list)
      .filter((b) => GROUP_HEADER.test(labelOf(b) || (b.textContent || "").trim()))
      .forEach((b) => safeClick(b, "expand group"));
  }
  function peopleButton() {
    const all = qa('button, [role="button"]');
    const byPanelId = all.find((b) => b.getAttribute("data-panel-id") === "1" && safeCandidate(b));
    if (byPanelId) return byPanelId;
    const byLabel = all.find((b) => PEOPLE_LABEL.test(labelOf(b)) && safeCandidate(b));
    if (byLabel) return byLabel;
    const byIcon = all.find((b) => /^(people|group|groups|people_alt|groups_2)$/.test(firstWord(b)) && safeCandidate(b));
    return byIcon || null;
  }
  function leaveButton() {
    // DETECT-001: aria-label and the call_end icon only — never Meet's obfuscated jsname attributes.
    return q('button[aria-label*="Leave call" i], button[aria-label*="leave" i][aria-label*="call" i]') ||
      qa("button").find((b) => firstWord(b) === "call_end") || null;
  }
  const inCall = () => !!(leaveButton() || peopleButton() || q("[data-participant-id]"));

  function peopleCount() {
    const b = peopleButton();
    if (!b) return null;
    const label = b.getAttribute("aria-label") || "";
    let m = label.match(/(\d+)/);
    if (!m) {
      // The count badge usually sits next to / inside the button's wrapper.
      for (let el = b, i = 0; el && i < 3; el = el.parentElement, i++) {
        const t = (el.innerText || "").replace(/[a-z_]+/gi, " ");
        m = t.match(/\b(\d{1,4})\b/);
        if (m) break;
      }
    }
    return m ? parseInt(m[1], 10) : null;
  }

  // People panel list: prefer labelled lists, otherwise the list whose rows carry aria-labels.
  function participantsList() {
    // SYNC-004: only a visible list, and in the fallback only one inside a People/participants panel.
    const labelled = qa('[role="list"][aria-label*="articipant" i], [role="list"][aria-label*="in the meeting" i], [role="list"][aria-label*="in call" i]').find(visible);
    if (labelled) return labelled;
    const lists = qa('[role="list"]').filter((l) => visible(l));
    let best = null, bestScore = 0;
    lists.forEach((l) => {
      const rows = qa('[role="listitem"]', l);
      const named = rows.filter((r) => nameFrom(r)).length;
      // SYNC-004: judge the panel by its aria-label or heading only — never its body text (Chat says
      // "Messages can only be seen by people in the call", which must not count).
      const box = l.closest("aside, [role=complementary], [role=dialog], [role=region], section") || l.parentElement;
      const head = box ? (box.getAttribute("aria-label") || q("h1, h2, h3, [role=heading]", box)?.textContent || "") : "";
      const inPanel = /^(people|participants|in the meeting|in call|contributors)\b/i.test(head.trim()) ||
        /\b(people|participants|in the meeting|in call)\b/i.test(l.getAttribute("aria-label") || "");
      const score = named * 2 + (inPanel ? 5 : 0);
      if (named && inPanel && score > bestScore) { best = l; bestScore = score; }
    });
    return best;
  }
  function selfName() {
    const el = q("[data-self-name]");
    return el ? cleanName(el.getAttribute("data-self-name")) : null;
  }
  // ROSTER-108: names never come from buttons or other controls (e.g. a presenter tile's "Zoom in" button).
  const CONTROL = 'button, [role="button"], a, input, select, textarea';
  const inControl = (c) => !!c.closest?.(CONTROL);
  // Visible text lines of el, minus any line that is just the text or label of a control inside it.
  function textLines(el) {
    const controlText = new Set(qa(CONTROL, el).flatMap((b) => [b.textContent, b.getAttribute("aria-label"), b.getAttribute("data-tooltip"), b.getAttribute("title")])
      .filter(Boolean).map((t) => t.trim().toLowerCase()));
    return (el.innerText || "").split("\n").map((x) => x.trim()).filter((x) => x && !controlText.has(x.toLowerCase()));
  }
  function nameFrom(el) {
    if (!el) return null;
    const self = el.hasAttribute?.("data-self-name") ? el : q("[data-self-name]", el);
    const direct = (self && cleanName(self.getAttribute("data-self-name"))) || cleanName(el.getAttribute?.("aria-label"));
    if (direct) return direct;
    for (const sel of [".notranslate", '[translate="no"]', "[data-tooltip]"]) {
      for (const c of qa(sel, el)) {
        if (inControl(c)) continue; // ROSTER-108
        const n = cleanName(c.textContent) || cleanName(c.getAttribute("data-tooltip"));
        if (n) return n;
      }
    }
    const line = textLines(el).find((x) => cleanName(x)); // ROSTER-108
    return cleanName(line);
  }
  function scanPanel() {
    const list = participantsList();
    if (!list) return null;
    const names = new Set();
    qa('[role="listitem"]', list).forEach((li) => { const n = nameFrom(li); if (n) names.add(n); });
    return names;
  }
  function scanTiles() {
    const names = new Set();
    qa("[data-participant-id], [data-requested-participant-id]").forEach((t) => { const n = nameFrom(t); if (n) names.add(n); });
    qa("[data-self-name]").forEach((el) => { const n = cleanName(el.getAttribute("data-self-name")); if (n) names.add(n); });
    return names;
  }

  // Profile photos (googleusercontent) sit next to names in tiles and in the People list.
  function scanAvatars() {
    const names = new Set();
    qa('img[src*="googleusercontent.com"]').filter(visible).forEach((img) => {
      if (img.closest("#meet-spark-host")) return;
      let el = img.parentElement;
      for (let i = 0; el && i < 5; i++, el = el.parentElement) {
        const lines = textLines(el); // ROSTER-108: skip control labels
        if (lines.length > 8) break; // climbed too far (whole panel)
        const n = lines.map(cleanName).find(Boolean);
        if (n) { names.add(n); break; }
      }
    });
    return names;
  }
  // Everything currently readable on screen.
  function scanVisible() {
    const all = new Set([...(scanPanel() || []), ...scanTiles(), ...scanAvatars()]);
    const me = selfName(); if (me) all.add(me);
    return all;
  }

  // --- Diagnostics: structure only, names are masked ---
  // DIAG-001: free-text labels keep only known control words; anything else (names!) becomes "…".
  const DIAG_WORDS = new Set(("people everyone everyone's participants participant show hide view more options option for leave call end " +
    "mic microphone camera video audio turn on off present presenting presentation now raise raised hand hands pin unpin keep " +
    "settings host hosts controls control captions meeting details activities reactions react mute muted unmute remove from the " +
    "in with all panel side close open send message messages chat let can to and your you admit deny lock emoji effects background " +
    "share sharing screen tile tiles layout change full exit record recording transcript is are of a an by waiting join joined " +
    "contributors list info information tools apps add others guests search menu new tab window button main stage spotlight group groups").split(" "));
  const redact = (t) => (t || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean)
    .map((w) => { const k = w.toLowerCase().replace(/[^a-z_'-]/g, ""); return DIAG_WORDS.has(k) || /_/.test(w) || /^\(?\d+\)?[,.:]?$/.test(w) ? w : "…"; })
    .join(" ").replace(/…(?:\s+…)+/g, "…");
  function diagnose() {
    const mask = (t) => { t = (t || "").trim().replace(/\s+/g, " "); return t ? `${t[0]}…(${t.length})` : ""; };
    const btn = peopleButton();
    const lists = qa('[role="list"]').map((l) => ({
      label: redact(l.getAttribute("aria-label")), visible: visible(l),
      rows: qa('[role="listitem"]', l).length,
      rowsWithLabel: qa('[role="listitem"][aria-label]', l).length,
      sampleRow: (() => { const r = q('[role="listitem"]', l); if (!r) return null;
        return { attrs: [...r.attributes].map((a) => a.name + (a.name === "aria-label" ? "=" + mask(a.value) : "")),
          textLines: (r.innerText || "").split("\n").slice(0, 4).map(mask),
          notranslate: qa(".notranslate,[translate=no]", r).length }; })()
    }));
    const tiles = qa("[data-participant-id], [data-requested-participant-id]");
    const t0 = tiles[0];
    const info = {
      version: (typeof chrome !== "undefined" && chrome.runtime?.getManifest?.().version) || "dev",
      path: meetingId() ? "/<meeting>" : "/", inCall: inCall(),
      leaveButton: !!leaveButton(),
      peopleButton: btn ? { aria: btn.hasAttribute("aria-label") ? redact(btn.getAttribute("aria-label")) : null, panelId: btn.getAttribute("data-panel-id"), text: redact((btn.innerText || "").slice(0, 30)) } : null,
      peopleCount: peopleCount(),
      selfName: !!selfName(),
      participantsListFound: !!participantsList(),
      lists,
      tiles: tiles.length,
      tileSample: t0 ? { attrs: [...t0.attributes].map((a) => a.name), textLines: (t0.innerText || "").split("\n").slice(0, 5).map(mask),
        notranslate: qa(".notranslate,[translate=no]", t0).map((e) => mask(e.textContent)).slice(0, 4) } : null,
      detected: { panel: scanPanel()?.size ?? null, tiles: scanTiles().size, roster: roster.all().length },
      buttons: qa('button, [role="button"]').filter((b) => !b.closest("#meet-spark-host")).map((b) => redact(labelOf(b)) || ("icon:" + redact(firstWord(b)))).filter((l) => l && l.length < 60).slice(0, 60),
      peopleLikeControls: qa('button, [role="button"], [role="tab"], [aria-label], [data-tooltip]')
        .filter((el) => /people|everyone|participant|group/i.test(labelOf(el) + " " + firstWord(el)))
        .slice(0, 15).map((el) => ({ tag: el.tagName.toLowerCase(), role: el.getAttribute("role"), label: redact(labelOf(el)).slice(0, 60),
          icon: redact(firstWord(el)).slice(0, 20), attrs: [...el.attributes].map((a) => a.name).filter((n) => !/^(class|style|jsaction|jscontroller|jsmodel)$/.test(n)),
          pressed: el.getAttribute("aria-pressed"), visible: visible(el) })),
      dataAttrs: (() => { const c = {}; qa("*").forEach((el) => { for (const a of el.attributes) if (a.name.startsWith("data-")) c[a.name] = (c[a.name] || 0) + 1; });
        return Object.entries(c).sort((x, y) => y[1] - x[1]).slice(0, 50).map(([k, v]) => k + ":" + v); })(),
      roles: (() => { const c = {}; qa("[role]").forEach((el) => { const r = el.getAttribute("role"); c[r] = (c[r] || 0) + 1; }); return c; })(),
      regions: qa('[role="region"], [role="complementary"], [role="dialog"], aside, [role="tabpanel"]').map((el) => ({ role: el.getAttribute("role") || el.tagName.toLowerCase(), label: redact(labelOf(el)).slice(0, 50), visible: visible(el) })).slice(0, 15),
      noTranslate: qa('.notranslate, [translate="no"]').filter(visible).slice(0, 12).map((el) => ({ tag: el.tagName.toLowerCase(), text: mask(el.textContent), parentAttrs: [...(el.parentElement?.attributes || [])].map((a) => a.name).filter((n) => n.startsWith("data-") || n === "jsname" || n === "role") })),
      syncPaused,
      watcher: { ...watcherStats }
    };
    return JSON.stringify(info, null, 1);
  }

  // Roster state: name -> { lastSeen, source }. Per-meeting parts are loaded for the current meeting
  // (ROSTER-001) and never saved outside a meeting (ROSTER-002).
  let currentMeeting = meetingId();
  const roster = {
    live: new Map(),
    manual: new Set(currentMeeting ? validNames(store.get(`manual:${currentMeeting}`, [])) : []),
    excluded: new Set(currentMeeting ? validNames(store.get(`excluded:${currentMeeting}`, [])) : []),
    dismissed: new Set(), // removed by the user; not re-added by passive scans until the next manual sync
    lastFullSync: 0,
    lastSyncCount: undefined,
    save() {
      if (!currentMeeting) return; // ROSTER-002: home screen / non-meeting pages keep names in memory only
      store.set(`manual:${currentMeeting}`, [...this.manual]);
      store.set(`excluded:${currentMeeting}`, [...this.excluded]);
    },
    remove(n) { this.live.delete(n); this.manual.delete(n); this.excluded.delete(n); this.dismissed.add(n); this.save(); },
    clear() { this.dismissed = new Set([...this.dismissed, ...this.live.keys()]); this.live.clear(); this.manual.clear(); this.excluded.clear(); this.save(); },
    all() {
      const s = new Set([...this.live.keys(), ...this.manual]);
      return [...s].sort((a, b) => a.localeCompare(b));
    },
    active() { return this.all().filter((n) => !this.excluded.has(n)); }
  };

  // ROSTER-003 (F2): names seen only on tiles/avatars are dropped after 90 s without being seen again.
  const PASSIVE_EXPIRY_MS = 90000;
  function applyScan(names, authoritative) {
    const now = Date.now();
    let changed = false;
    names.forEach((n) => {
      if (roster.dismissed.has(n)) return;
      if (!roster.live.has(n)) changed = true;
      roster.live.set(n, { lastSeen: now });
    });
    if (authoritative) {
      // A COMPLETE People-panel scan lists everyone in the call — drop anyone not in it.
      [...roster.live.keys()].forEach((n) => { if (!names.has(n)) { roster.live.delete(n); changed = true; } });
      // Manually added names are not touched by sync.
    } else {
      [...roster.live.entries()].forEach(([n, v]) => {
        if (now - v.lastSeen > PASSIVE_EXPIRY_MS) { roster.live.delete(n); changed = true; }
      });
    }
    if (changed) renderPeople();
  }

  // ROSTER-001: when the meeting code changes without a page reload, start that meeting's own roster.
  function checkMeeting() {
    const id = meetingId();
    if (id === currentMeeting) return false;
    log("meeting changed:", currentMeeting ? "<meeting>" : "none", "→", id ? "<meeting>" : "none");
    pickerLeft({ meetingChanged: true }); // PSTY-026
    currentMeeting = id;
    roster.live.clear(); roster.dismissed.clear();
    roster.manual = new Set(id ? validNames(store.get(`manual:${id}`, [])) : []);
    roster.excluded = new Set(id ? validNames(store.get(`excluded:${id}`, [])) : []);
    roster.lastFullSync = 0; roster.lastSyncCount = undefined;
    syncPaused = false; joinedAt = 0;
    loadSpoken();
    loadStyleSeen(); // PSTY-006: each meeting has its own six-style tour
    renderPeople();
    return true;
  }

  // SYNC-001: is this People-list scan the WHOLE call? Only then may it remove people from the roster.
  const scrollerOf = (list) => {
    for (let el = list; el && el !== document.body; el = el.parentElement) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight) return el;
    }
    return list;
  };
  const atBottom = (sc) => sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2;
  const hasCollapsedGroup = (list) => qa('[aria-expanded="false"]', list).some((b) => GROUP_HEADER.test(labelOf(b) || (b.textContent || "").trim()));
  function looksComplete(list, panelNames, { needCount }) {
    const sc = scrollerOf(list);
    const scrolledAll = sc.scrollTop <= 1 && atBottom(sc); // the whole list fits on screen
    if (!scrolledAll || hasCollapsedGroup(list)) return false;
    const count = peopleCount();
    if (count == null) return !needCount;
    return panelNames.size >= count - 1; // "You" may be missing from Meet's count
  }

  // SYNC-001 / SYNC-002: scroll through the (virtualised) list until the bottom, collecting every name.
  async function collectPanel(list) {
    const sc = scrollerOf(list);
    const start = sc.scrollTop;
    const names = new Set();
    let bottom = false;
    for (let i = 0; i < 60; i++) { // cap ≈ 60 steps (about 300 people)
      (scanPanel() || []).forEach((n) => names.add(n));
      if (atBottom(sc)) { bottom = true; break; }
      const before = sc.scrollTop;
      sc.scrollTop += Math.max(100, Math.floor(sc.clientHeight * 0.8));
      await sleep(120);
      if (sc.scrollTop === before) { (scanPanel() || []).forEach((n) => names.add(n)); bottom = true; break; }
    }
    sc.scrollTop = start; // put the user's scroll position back
    const count = peopleCount();
    const complete = bottom && !hasCollapsedGroup(list) && (count == null || names.size >= count - 1);
    return { names, complete };
  }

  let syncing = false;
  let syncPaused = false; // set if a sync could not finish safely
  let joinedAt = 0;
  const watcherStats = { ticks: 0, skippedDuringSync: 0 };
  // Sync from what's on screen (used when there is no People button and no open People list).
  function screenSync(silent) {
    if (!silent) roster.dismissed.clear();
    const names = scanVisible();
    if (names.size) applyScan(names, true);
    roster.lastFullSync = Date.now();
    renderPeople();
    log("screen sync:", names.size, "names");
    if (!silent) {
      if (!names.size) toast("No names found. Open Meet's People panel, then tap sync.");
      else toast(`Synced ${names.size} from screen — open the People panel to include everyone`);
    }
  }

  async function fullSync({ silent = false } = {}) {
    if (syncing) return;
    const btn = peopleButton();
    const wasOpen = !!participantsList();
    if (!btn && !wasOpen) return screenSync(silent);
    if (!silent) roster.dismissed.clear();
    syncing = true;
    setSyncState(true);
    let clicked = false, appeared = wasOpen, ourList = null;
    try {
      if (!wasOpen) {
        clicked = safeClick(btn, "open People panel");
        if (!clicked) { screenSync(silent); return; }
      }
      for (let i = 0; i < 30 && !participantsList(); i++) await sleep(100);
      ourList = participantsList();
      if (ourList) appeared = true;
      await sleep(400); // let the list render
      let list = participantsList();
      log("sync: panel list found =", !!list);
      if (list) {
        expandGroups(list); // SAFE-002: only "Contributors"-style headers inside the list
        await sleep(200);
        list = participantsList() || list;
        const { names, complete } = await collectPanel(list);
        const panelSize = names.size;
        scanTiles().forEach((n) => names.add(n));
        const me = selfName(); if (me) names.add(me);
        if (names.size) applyScan(names, complete);
        roster.lastFullSync = Date.now();
        roster.lastSyncCount = peopleCount();
        log("sync: collected", panelSize, "names, complete =", complete);
        if (!silent) toast(complete ? `Synced ${panelSize} participant${panelSize === 1 ? "" : "s"}`
          : `Synced ${panelSize} so far. Scroll the People panel to the bottom or tap sync again.`);
      } else {
        screenSync(true);
        roster.lastSyncCount = peopleCount();
      }
    } finally {
      if (clicked) undoOpen({ appeared, ourList, silent });
      syncing = false;
      setSyncState(false);
    }
  }

  // SAFE-003: close the panel WE opened — but only while our People list is still the one showing,
  // using a freshly found People button. If something else (Chat, Activities) replaced it, don't click.
  function undoOpen({ appeared, ourList, silent }) {
    const now = participantsList();
    // The list showing must be the one we opened (or Meet re-rendered ours, so the old element is gone).
    const listShowing = !!now && (!ourList || now === ourList || !ourList.isConnected);
    if (listShowing || !appeared) {
      // Our list is showing (normal case), or it never appeared at all: revert our own click.
      if (safeClick(peopleButton(), listShowing ? "close People panel" : "revert click (no list appeared)") && listShowing) return;
      syncPaused = true;
      log("sync: People list never appeared — auto-sync paused for this page");
      if (!silent) toast("Synced from screen. For everyone, open Meet's People panel and tap sync.");
      return;
    }
    syncPaused = true;
    log("sync: another panel replaced the People list — not clicking; auto-sync paused");
    if (!silent) toast("Sync paused: Meet's side panel changed. Tap sync again when the People panel is closed.");
  }

  // Passive watcher: reads tiles/panel continuously, triggers a full sync when the headcount changes.
  setInterval(() => {
    checkMeeting(); // ROSTER-001
    if (!inCall()) { pickerLeft(); joinedAt = 0; updateCount(); return; } // PSTY-026
    if (!joinedAt) joinedAt = Date.now();
    watcherStats.ticks++;
    if (syncing) { watcherStats.skippedDuringSync++; return; } // SYNC-003: never read a list mid-sync

    const list = participantsList();
    const panel = list ? scanPanel() : null;
    if (panel && panel.size) {
      const complete = looksComplete(list, panel, { needCount: true }); // SYNC-001
      const me = selfName(); if (me) panel.add(me);
      applyScan(panel, complete);
    } else {
      const seen = scanVisible();
      if (seen.size) applyScan(seen, false);
    }

    if (store.get("autoSync", true) === false || syncPaused) return;
    const count = peopleCount();
    const since = Date.now() - roster.lastFullSync;
    const firstSync = roster.lastFullSync === 0 && Date.now() - joinedAt > 4000;
    // Only re-sync when the headcount actually changed since our last sync (no repeated panel flashing).
    const mismatch = count != null && count !== roster.live.size && count !== roster.lastSyncCount && since > 8000;
    if (firstSync || mismatch) fullSync({ silent: true });
    updateCount();
  }, 2500);

  /* ============================================================
   * UI
   * ============================================================ */
  const host = document.createElement("div");
  host.id = "meet-spark-host";
  host.style.cssText = "position:fixed;inset:0 auto auto 0;width:0;height:0;z-index:2147483646;";
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: "open" });

    setHTML(root, `
<style>
  :host { all: initial; }
  * { box-sizing: border-box; margin: 0; }
  .ui { font-family: "Google Sans Text", "Google Sans", Roboto, Arial, sans-serif; color: #1f1f1f; -webkit-font-smoothing: antialiased; }
  button { font: inherit; cursor: pointer; }

  /* Launcher */
  .launcher {
    position: fixed; right: 16px; bottom: 88px; height: 40px; padding: 0 16px 0 12px;
    display: flex; align-items: center; gap: 8px; border: none; border-radius: 20px;
    background: #3c4043; color: #e3e3e3; font-size: 14px; font-weight: 500; letter-spacing: .1px;
    box-shadow: 0 1px 3px rgba(0,0,0,.3), 0 4px 8px 3px rgba(0,0,0,.15);
    transition: background .15s;
  }
  .launcher:hover { background: #4a4e51; }
  .launcher.on { background: #a8c7fa; color: #062e6f; }

  /* Panel */
  .panel {
    position: fixed; right: 16px; top: 16px; bottom: 88px; width: 360px;
    background: #fff; border-radius: 8px; display: none; flex-direction: column; overflow: hidden;
    box-shadow: 0 1px 3px rgba(60,64,67,.3), 0 4px 8px 3px rgba(60,64,67,.15);
  }
  .panel.open { display: flex; animation: in .18s ease-out; }
  @keyframes in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

  .header { display: flex; align-items: center; justify-content: space-between; padding: 16px 12px 8px 24px; }
  .title { font-family: "Google Sans", Roboto, Arial, sans-serif; font-size: 18px; font-weight: 400; color: #1f1f1f; }
  .iconbtn { width: 40px; height: 40px; border-radius: 50%; border: none; background: transparent; color: #444746; display: grid; place-items: center; }
  .iconbtn:hover { background: #f1f3f4; }

  .nav { display: flex; padding: 0 16px; border-bottom: 1px solid #e0e3e7; }
  .nav button {
    flex: 1; background: none; border: none; padding: 10px 0 12px; color: #444746;
    display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 12px; font-weight: 500;
    position: relative;
  }
  .nav button.active { color: #0b57d0; }
  .nav button.active::after { content: ""; position: absolute; left: 20%; right: 20%; bottom: -1px; height: 3px; border-radius: 3px 3px 0 0; background: #0b57d0; }
  .nav .badge { position: absolute; top: 4px; right: calc(50% - 22px); min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: #0b57d0; color: #fff; font-size: 10px; line-height: 16px; }

  .content { flex: 1; overflow-y: auto; padding: 20px 24px 24px; }
  .view { display: none; }
  .view.active { display: block; }

  .eyebrow { font-size: 12px; font-weight: 500; color: #444746; text-transform: uppercase; letter-spacing: .8px; margin-bottom: 10px; }
  .muted { font-size: 12px; color: #5f6368; line-height: 1.5; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
  .chip { height: 32px; padding: 0 12px; border-radius: 8px; border: 1px solid #c4c7c5; background: #fff; color: #444746; font-size: 13px; font-weight: 500; }
  .chip.active { background: #d3e3fd; border-color: #d3e3fd; color: #041e49; }

  .card { border: 1px solid #e0e3e7; border-radius: 12px; padding: 24px; background: #f8fafd; min-height: 148px; display: flex; flex-direction: column; justify-content: center; }
  .card .to { font-size: 13px; color: #0b57d0; font-weight: 500; margin-bottom: 8px; min-height: 18px; }
  .card .q { font-family: "Google Sans", Roboto, Arial, sans-serif; font-size: 20px; line-height: 28px; color: #1f1f1f; }
  .card .placeholder { color: #5f6368; font-size: 15px; }
  .counter { margin-top: 10px; font-size: 12px; color: #5f6368; text-align: right; }

  .actions { display: flex; gap: 8px; margin-top: 16px; }
  .btn { height: 40px; padding: 0 20px; border-radius: 20px; border: none; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
  .btn.primary { background: #0b57d0; color: #fff; }
  .btn.primary:hover { background: #0a4fbd; box-shadow: 0 1px 3px rgba(0,0,0,.25); }
  .btn.tonal { background: #e9eef6; color: #041e49; }
  .btn.tonal:hover { background: #dde3ea; }
  .btn.text { background: transparent; color: #0b57d0; padding: 0 12px; }
  .btn.text:hover { background: #f0f4f9; }
  .btn.grow { flex: 1; }
  .btn:disabled { opacity: .5; cursor: default; }

  .vs { display: grid; gap: 10px; }
  .option { border: 1px solid #e0e3e7; border-radius: 12px; padding: 18px 20px; display: flex; gap: 14px; align-items: center; background: #fff; }
  .option .tag { flex: none; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; font-weight: 500; font-size: 14px; }
  .option.a .tag { background: #d3e3fd; color: #041e49; }
  .option.b .tag { background: #ffdbcf; color: #390c00; }
  .option .txt { font-family: "Google Sans", Roboto, Arial, sans-serif; font-size: 17px; line-height: 24px; }
  .divider { text-align: center; font-size: 11px; font-weight: 500; letter-spacing: 1px; color: #747775; }

  .bingo-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
  .score { font-size: 13px; color: #444746; }
  .score b { color: #0b57d0; }
  .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; }
  .cell {
    aspect-ratio: 1; border-radius: 6px; border: 1px solid #e0e3e7; background: #fff; color: #1f1f1f;
    font-size: 9.5px; line-height: 1.2; display: flex; align-items: center; justify-content: center;
    text-align: center; padding: 3px; user-select: none; cursor: pointer; position: relative; transition: background .12s;
  }
  .cell:hover { background: #f0f4f9; }
  .cell.on { background: #d3e3fd; border-color: #a8c7fa; color: #041e49; }
  .cell.free { background: #0b57d0; border-color: #0b57d0; color: #fff; font-weight: 500; font-size: 10px; cursor: default; }
  .cell.win { background: #0b57d0; border-color: #0b57d0; color: #fff; }

  .picker { border: 1px solid #e0e3e7; border-radius: 12px; background: #f8fafd; padding: 20px; text-align: center; }
  .picked-avatar { width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 12px; display: grid; place-items: center; color: #fff; font-size: 24px; font-family: "Google Sans", Roboto, Arial, sans-serif; background: #c4c7c5; transition: background .1s; }
  .picked-name { font-family: "Google Sans", Roboto, Arial, sans-serif; font-size: 22px; min-height: 30px; color: #1f1f1f; }
  .picked-sub { font-size: 12px; color: #5f6368; margin-top: 4px; min-height: 16px; }
  .picker.rolling .picked-name { color: #5f6368; }
  .picker.done .picked-avatar { box-shadow: 0 0 0 4px #d3e3fd; }

  .seg { display: flex; border: 1px solid #c4c7c5; border-radius: 20px; overflow: hidden; margin: 16px 0 0; }
  .seg button { flex: 1; height: 36px; border: none; background: #fff; color: #444746; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 6px; }
  .seg button + button { border-left: 1px solid #c4c7c5; }
  .seg button.active { background: #d3e3fd; color: #041e49; }

  .section { display: flex; align-items: center; justify-content: space-between; margin: 24px 0 8px; }
  .live { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #146c2e; font-weight: 500; }
  .live::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: #1e8e3e; box-shadow: 0 0 0 3px #c4eed0; }
  .live.off { color: #5f6368; } .live.off::before { background: #9aa0a6; box-shadow: none; }
  .spin { animation: rot 1s linear infinite; } @keyframes rot { to { transform: rotate(360deg); } }

  .people { list-style: none; padding: 0; }
  .person { display: flex; align-items: center; gap: 12px; padding: 8px 4px; border-radius: 8px; }
  .person:hover { background: #f8fafd; }
  .avatar { flex: none; width: 32px; height: 32px; border-radius: 50%; color: #fff; display: grid; place-items: center; font-size: 13px; font-weight: 500; }
  .person .nm { flex: 1; font-size: 14px; color: #1f1f1f; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .person .meta { font-size: 11px; color: #5f6368; }
  .person .rm { width: 32px; height: 32px; color: #5f6368; opacity: .55; transition: opacity .1s; }
  .person:hover .rm, .person .rm:focus { opacity: 1; }
  .person .rm:hover { background: #fce8e6; color: #b3261e; }
  .person.out .nm, .person.out .avatar { opacity: .4; }
  .person.done .nm { text-decoration: line-through; color: #5f6368; }
  .toggle { width: 20px; height: 20px; border-radius: 4px; border: 2px solid #444746; background: #fff; display: grid; place-items: center; color: #fff; padding: 0; flex: none; }
  .toggle.on { background: #0b57d0; border-color: #0b57d0; }
  .empty { padding: 16px; border: 1px dashed #c4c7c5; border-radius: 8px; text-align: center; }
  .add { display: flex; gap: 8px; margin-top: 12px; }
  .add input { flex: 1; height: 40px; border: 1px solid #c4c7c5; border-radius: 8px; padding: 0 12px; font: inherit; font-size: 14px; color: #1f1f1f; outline: none; }
  .add input:focus { border-color: #0b57d0; box-shadow: 0 0 0 1px #0b57d0; }
  .setting { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e0e3e7; }
  .switch { width: 36px; height: 20px; border-radius: 10px; background: #c4c7c5; border: none; position: relative; flex: none; padding: 0; }
  .switch::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: left .15s; box-shadow: 0 1px 2px rgba(0,0,0,.3); }
  .switch.on { background: #0b57d0; } .switch.on::after { left: 18px; }

  .snackbar { position: fixed; left: 50%; bottom: 96px; transform: translate(-50%, 8px); background: #303030; color: #f2f2f2; font-size: 14px; padding: 14px 16px; border-radius: 4px; min-width: 240px; text-align: center; box-shadow: 0 3px 5px rgba(0,0,0,.2); opacity: 0; transition: opacity .15s, transform .15s; pointer-events: none; }
  .snackbar.show { opacity: 1; transform: translate(-50%, 0); }
  .burst { position: fixed; width: 6px; height: 10px; border-radius: 1px; pointer-events: none; animation: fall ease-in forwards; }
  @keyframes fall { to { transform: translate(var(--dx), 70vh) rotate(540deg); opacity: 0; } }
  /* Picker popup (docs/specs/picker-styles.md) */
  .ui [hidden] { display: none !important; }
  .psty-set { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; }
  .psty-set label { font-size: 14px; color: #1f1f1f; }
  .psty-set select { height: 36px; border: 1px solid #c4c7c5; border-radius: 18px; padding: 0 12px; font: inherit; font-size: 13px; color: #1f1f1f; background: #fff; cursor: pointer; }
  .psty { position: fixed; inset: 0; z-index: 10; background: rgba(12,12,18,.8); display: grid; place-items: center; animation: psty-fade .2s ease-out; }
  .snackbar { z-index: 11; }
  .psty-fx { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
  .psty-dlg { position: relative; width: 640px; height: 600px; display: flex; flex-direction: column; align-items: center; gap: 12px; color: #fff; outline: none; animation: psty-rise .3s cubic-bezier(.2,1.2,.4,1); }
  .psty-x { position: absolute; right: 0; top: 0; width: 44px; height: 44px; border-radius: 50%; border: none; background: rgba(255,255,255,.14); color: #fff; display: grid; place-items: center; z-index: 3; }
  .psty-x:hover, .psty-b:hover { filter: brightness(1.15); }
  .psty-style { height: 44px; display: flex; align-items: center; font-size: 13px; font-weight: 600; letter-spacing: 1.4px; text-transform: uppercase; color: #c4c7c5; }
  .psty-stage { width: 640px; height: 380px; flex: none; position: relative; display: grid; place-items: center; }
  .psty-win { display: flex; align-items: center; justify-content: center; gap: 16px; max-width: 620px; }
  .psty-win > div { min-width: 0; }
  .psty-head { font-size: 14px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #fdd663; }
  .psty-name { font-family: "Google Sans", Roboto, Arial, sans-serif; font-size: 32px; line-height: 40px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; animation: psty-pop .45s ease-out; }
  .psty-acts { display: flex; gap: 12px; animation: psty-fade .4s ease-out; }
  .psty-b { height: 44px; padding: 0 22px; border-radius: 22px; border: none; font-size: 14px; font-weight: 600; }
  .psty-b.ghost { background: transparent; color: #fff; box-shadow: inset 0 0 0 1px rgba(255,255,255,.5); }
  .psty-b.soft { background: rgba(255,255,255,.16); color: #fff; }
  .psty-b.main { background: #a8c7fa; color: #062e6f; padding: 0 30px; }
  .psty-b:focus-visible, .psty-x:focus-visible { outline: 3px solid #fdd663; outline-offset: 2px; }
  .psty-live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .psty-av { flex: none; border-radius: 50%; color: #fff; display: grid; place-items: center; font-weight: 600; font-family: "Google Sans", Roboto, Arial, sans-serif; }
  .psty-cf { position: absolute; top: -20px; width: 8px; height: 12px; border-radius: 2px; animation: psty-fall var(--t) cubic-bezier(.3,.6,.6,1) var(--d) forwards; }
  .psty-coin { position: absolute; left: 50%; top: 40%; width: 26px; height: 26px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff3c4, #f9ab00 55%, #b06000); box-shadow: inset 0 0 0 2px #e8a317; animation: psty-coin var(--t) cubic-bezier(.25,.6,.5,1) var(--d) forwards; opacity: 0; }
  @keyframes psty-fade { from { opacity: 0; } }
  @keyframes psty-rise { from { opacity: 0; transform: translateY(24px) scale(.96); } }
  @keyframes psty-pop { 0% { transform: scale(.7); opacity: 0; } 60% { transform: scale(1.06); opacity: 1; } }
  @keyframes psty-fall { to { transform: translate(var(--dx), 110vh) rotate(720deg); opacity: .3; } }
  @keyframes psty-coin { 0% { transform: translate(0, 0) scale(.5); opacity: 0; } 10% { opacity: 1; } 45% { transform: translate(var(--dx), var(--up)) scale(1); opacity: 1; } 100% { transform: translate(calc(var(--dx) * 1.6), 60vh); opacity: 0; } }
  @keyframes psty-pulse { 0% { box-shadow: 0 0 0 0 rgba(253,214,99,.7); } 100% { box-shadow: 0 0 0 18px rgba(253,214,99,0); } }
  /* PSTY-030 slot machine */
  .ps-slot { position: relative; width: 500px; }
  .ps-marq { background: linear-gradient(#7a1022, #4a0613); border-radius: 26px 26px 8px 8px; padding: 12px 16px 8px; box-shadow: inset 0 0 0 3px #d4a52c, 0 10px 30px rgba(0,0,0,.5); }
  .ps-bulbs { display: flex; justify-content: space-between; padding: 0 4px 8px; }
  .ps-bulbs i { width: 12px; height: 12px; border-radius: 50%; background: #8a6d1a; animation: psty-chase .6s infinite; }
  .ps-bulbs i:nth-child(4n+2) { animation-delay: .15s; } .ps-bulbs i:nth-child(4n+3) { animation-delay: .3s; } .ps-bulbs i:nth-child(4n) { animation-delay: .45s; }
  .ps-slot.won .ps-bulbs i { animation-duration: .3s; }
  .ps-title { font-family: Impact, "Arial Black", sans-serif; font-size: 30px; letter-spacing: 3px; text-align: center; color: #fdd663; text-shadow: 0 2px 0 #7a4a00, 0 0 18px rgba(253,214,99,.6); }
  .ps-body { margin-top: 6px; background: linear-gradient(#2b2b33, #17171c); border-radius: 10px 10px 20px 20px; padding: 14px; box-shadow: inset 0 0 0 3px #d4a52c, 0 14px 40px rgba(0,0,0,.6); }
  .ps-win { position: relative; display: flex; gap: 8px; padding: 10px; background: #0a0a0d; border-radius: 12px; box-shadow: inset 0 0 0 3px #d4a52c; }
  .ps-slot.won .ps-win { animation: psty-flash .6s infinite; }
  .ps-reel { flex: 1; min-width: 0; height: 192px; overflow: hidden; background: #fff; border-radius: 8px; }
  .ps-reel.av { flex: none; width: 84px; }
  .ps-strip { transition: transform var(--t, 0ms) cubic-bezier(.12,.72,.22,1.04); }
  .ps-row { height: 64px; display: flex; align-items: center; justify-content: center; color: #1f1f1f; font-size: 22px; font-weight: 800; padding: 0 8px; }
  .ps-row > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ps-win::before, .ps-win::after { content: ""; position: absolute; left: 10px; right: 10px; height: 64px; pointer-events: none; z-index: 1; }
  .ps-win::before { top: 10px; background: linear-gradient(rgba(10,10,13,.85), rgba(10,10,13,0)); border-radius: 8px 8px 0 0; }
  .ps-win::after { bottom: 10px; background: linear-gradient(rgba(10,10,13,0), rgba(10,10,13,.85)); border-radius: 0 0 8px 8px; }
  .ps-line { position: absolute; left: 10px; right: 10px; top: 74px; height: 64px; border-radius: 8px; box-shadow: inset 0 0 0 3px #fdd663; pointer-events: none; z-index: 2; }
  .ps-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; }
  .ps-led { background: #0a0a0d; border-radius: 8px; padding: 6px 12px; box-shadow: inset 0 0 0 2px #3c3c44; }
  .ps-led small { display: block; font-size: 10px; font-weight: 700; letter-spacing: 1.2px; color: #9aa0a6; }
  .ps-led b { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 20px; color: #ff6d5e; text-shadow: 0 0 8px rgba(255,109,94,.7); }
  .ps-note { font-family: Impact, "Arial Black", sans-serif; font-size: 18px; letter-spacing: 2px; color: #fdd663; }
  .ps-lever { position: absolute; right: -34px; top: 110px; width: 24px; height: 170px; }
  .ps-lever::after { content: ""; position: absolute; left: 2px; bottom: 0; width: 20px; height: 40px; border-radius: 6px; background: linear-gradient(90deg, #8a8f98, #d6d9de, #8a8f98); }
  .ps-lever i { position: absolute; left: 9px; bottom: 30px; width: 6px; height: 120px; border-radius: 3px; background: linear-gradient(90deg, #8a8f98, #e8eaed, #8a8f98); transform-origin: 50% 100%; transition: transform .5s cubic-bezier(.3,1.6,.5,1); }
  .ps-lever i::before { content: ""; position: absolute; left: -9px; top: -20px; width: 24px; height: 24px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #ff8a80, #d93025 60%, #8c1c13); }
  .ps-slot.pull .ps-lever i { transform: scaleY(-.5); transition-duration: .15s; }
  @keyframes psty-chase { 50% { background: #fff3c4; box-shadow: 0 0 10px 3px rgba(253,214,99,.9); } }
  @keyframes psty-flash { 50% { box-shadow: inset 0 0 0 3px #fff, 0 0 30px 8px rgba(253,214,99,.7); } }
  /* PSTY-031 wheel */
  .ps-wheelbox { position: relative; width: 340px; height: 360px; }
  .ps-ptr { position: absolute; left: 50%; top: 0; margin-left: -16px; border-left: 16px solid transparent; border-right: 16px solid transparent; border-top: 28px solid #fff; z-index: 2; filter: drop-shadow(0 2px 3px rgba(0,0,0,.4)); }
  .ps-wheel { position: absolute; left: 0; top: 18px; width: 340px; height: 340px; border-radius: 50%; box-shadow: 0 0 0 8px #3c4043, 0 10px 30px rgba(0,0,0,.5); transition: transform 4s cubic-bezier(.1,.75,.12,1); }
  .ps-wl { position: absolute; left: 50%; top: 50%; color: #fff; font-size: 15px; font-weight: 700; white-space: nowrap; max-width: 104px; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 1px 2px rgba(0,0,0,.35); }
  .ps-hub { position: absolute; left: 50%; top: 188px; width: 64px; height: 64px; margin: -32px 0 0 -32px; border-radius: 50%; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.4); display: grid; place-items: center; color: #0b57d0; }
  /* PSTY-032 spotlight */
  .ps-spot { width: 600px; display: flex; flex-direction: column; align-items: center; gap: 14px; }
  .ps-grid { display: grid; justify-content: center; align-content: center; width: 600px; height: 310px; background: rgba(255,255,255,.06); border-radius: 16px; }
  .ps-cell { display: grid; place-items: center; position: relative; }
  .ps-face { border-radius: 50%; color: #fff; display: grid; place-items: center; font-weight: 600; transition: transform .12s, box-shadow .12s, opacity .2s; }
  .ps-spot.rolling .ps-face { opacity: .55; }
  .ps-cell.lit { z-index: 2; }
  .ps-cell.lit .ps-face { opacity: 1; transform: scale(var(--z)); box-shadow: 0 0 0 2px #fff, 0 0 0 5px #fdd663, 0 0 20px 6px rgba(253,214,99,.8); }
  .ps-cell.won .ps-face { animation: psty-pulse 1s ease-out 2; }
  .ps-tick { height: 36px; max-width: 560px; font-size: 24px; font-weight: 600; color: #c4c7c5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  /* PSTY-033 cards */
  .ps-cards { position: relative; width: 600px; height: 380px; perspective: 1200px; }
  .ps-card { position: absolute; left: 50%; top: 22px; width: 240px; height: 336px; margin-left: -120px; border-radius: 20px; transition: transform .3s ease-in-out, opacity .4s; }
  .ps-back { background: #0842a0 repeating-linear-gradient(45deg, rgba(255,255,255,.08) 0 12px, transparent 12px 24px); display: grid; place-items: center; color: #fff; box-shadow: 0 6px 20px rgba(0,0,0,.35); }
  .ps-back.b0 { transform: translateX(-14px) rotate(-5deg); } .ps-back.b2 { transform: translateX(14px) rotate(5deg); }
  .ps-cards.s1 .b0, .ps-cards.s2 .b2 { transform: translateX(-130px) rotate(-14deg); }
  .ps-cards.s1 .b2, .ps-cards.s2 .b0 { transform: translateX(130px) rotate(14deg); }
  .ps-cards.flip .ps-back { opacity: 0; }
  .ps-topcard { transition: transform .45s cubic-bezier(.3,1.4,.5,1); }
  .ps-cards.s1 .ps-topcard { transform: translateX(-60px); } .ps-cards.s2 .ps-topcard { transform: translateX(60px); }
  .ps-cards.flip .ps-topcard { transform: translateY(-10px) scale(1.08); }
  .ps-cards.party .ps-topcard { box-shadow: 0 0 0 10px rgba(253,214,99,.3), 0 0 60px 20px rgba(168,199,250,.5); }
  .ps-in { position: absolute; inset: 0; transform-style: preserve-3d; transition: transform .7s cubic-bezier(.3,1.4,.5,1); }
  .ps-cards.flip .ps-in { transform: rotateY(180deg); }
  .ps-f { position: absolute; inset: 0; border-radius: 20px; backface-visibility: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
  .ps-f.front { background: #0b57d0 repeating-linear-gradient(45deg, rgba(255,255,255,.08) 0 12px, transparent 12px 24px); color: #fff; }
  .ps-f.face { background: #fff; color: #1f1f1f; transform: rotateY(180deg); box-shadow: inset 0 0 0 3px #fdd663; padding: 0 16px; text-align: center; }
  .ps-f.face b { max-width: 100%; font-size: 24px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ps-f.face small { font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #0b57d0; }
  .ps-rays { position: absolute; left: 50%; top: 50%; width: 560px; height: 560px; margin: -280px 0 0 -280px; border-radius: 50%; background: repeating-conic-gradient(rgba(253,214,99,.18) 0 10deg, transparent 10deg 24deg); -webkit-mask: radial-gradient(circle, #000 30%, transparent 70%); mask: radial-gradient(circle, #000 30%, transparent 70%); opacity: 0; transition: opacity .4s; animation: rot 14s linear infinite; }
  .ps-cards.party .ps-rays { opacity: 1; }
  /* PSTY-034 departure board */
  .ps-board { width: 580px; background: #111214; border-radius: 16px; padding: 22px 18px; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 10px 30px rgba(0,0,0,.5), inset 0 0 0 1px #3c4043; }
  .ps-bhead { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; letter-spacing: 1.4px; color: #fdd663; }
  .ps-brow { display: grid; grid-template-columns: repeat(11, minmax(0, 1fr)); gap: 4px; }
  .ps-tile { height: 60px; border-radius: 5px; background: linear-gradient(#3c4043 0 49%, #202124 49% 51%, #35363a 51%); color: #9aa0a6; font-family: ui-monospace, Menlo, Consolas, monospace; font-weight: 700; font-size: 30px; display: grid; place-items: center; }
  .ps-tile.set { color: #fff; }
  /* PSTY-035 countdown */
  .ps-count { position: relative; width: 220px; height: 220px; display: grid; place-items: center; }
  .ps-ring { position: absolute; inset: 0; border-radius: 50%; -webkit-mask: radial-gradient(circle, transparent 92px, #000 93px); mask: radial-gradient(circle, transparent 92px, #000 93px); }
  .ps-num { position: relative; font-size: 120px; font-weight: 800; color: #fff; animation: psty-num .8s ease-out; }
  .ps-pop { animation: psty-pop .5s ease-out; }
  .ps-pop .psty-av { box-shadow: 0 0 0 8px rgba(168,199,250,.5); }
  @keyframes psty-num { 0% { transform: scale(1.6); opacity: 0; } 30% { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .psty, .psty-dlg, .psty-name, .psty-acts, .ps-pop { animation: none; } }
</style>

<div class="ui">
  <button class="launcher" id="launcher" title="Meet Spark (Alt+S)">${icon("spark", 18)}<span>Spark</span></button>

  <section class="panel" id="panel" role="dialog" aria-label="Meet Spark">
    <div class="header">
      <h2 class="title">Meet Spark</h2>
      <button class="iconbtn" id="close" title="Close">${icon("close")}</button>
    </div>

    <nav class="nav">
      <button data-v="ice" class="active">${icon("chat")}Icebreakers</button>
      <button data-v="wyr">${icon("split")}This or that</button>
      <button data-v="bingo">${icon("grid")}Bingo</button>
      <button data-v="people">${icon("people")}Speakers<span class="badge" id="navCount">0</span></button>
    </nav>

    <div class="content">
      <!-- Icebreakers -->
      <div class="view active" data-v="ice">
        <div class="chips" id="cats"></div>
        <div class="card" id="iceCard">
          <div class="to" id="iceTo"></div>
          <div class="q placeholder" id="iceQ">Choose a category and draw a question to get the conversation going.</div>
        </div>
        <div class="counter" id="iceCounter"></div>
        <div class="actions">
          <button class="btn primary grow" id="iceNext">${icon("next", 18)}Next question</button>
          <button class="btn tonal" id="iceAsk" title="Pick a participant to answer">${icon("person", 18)}Ask</button>
          <button class="iconbtn" id="iceCopy" title="Copy for chat">${icon("copy")}</button>
        </div>
      </div>

      <!-- This or that -->
      <div class="view" data-v="wyr">
        <div class="eyebrow">Would you rather</div>
        <div class="vs">
          <div class="option a"><span class="tag">A</span><span class="txt" id="wyrA">Draw a prompt to start</span></div>
          <div class="divider">OR</div>
          <div class="option b"><span class="tag">B</span><span class="txt" id="wyrB">—</span></div>
        </div>
        <div class="actions">
          <button class="btn primary grow" id="wyrNext">${icon("next", 18)}Next prompt</button>
          <button class="btn tonal" id="wyrCopy">${icon("copy", 18)}Copy for chat</button>
        </div>
        <p class="muted" style="margin-top:16px">Ask everyone to vote with Meet reactions — 👍 for A, ❤️ for B.</p>
      </div>

      <!-- Bingo -->
      <div class="view" data-v="bingo">
        <div class="bingo-head">
          <div class="eyebrow" style="margin:0">Meeting bingo</div>
          <div class="score" id="bingoScore"></div>
        </div>
        <div class="grid" id="grid"></div>
        <div class="actions">
          <button class="btn tonal grow" id="bingoNew">New card</button>
          <button class="btn text" id="bingoCopy">${icon("copy", 18)}Invite</button>
        </div>
      </div>

      <!-- Speakers -->
      <div class="view" data-v="people">
        <div class="picker" id="picker">
          <div class="picked-avatar" id="pickedAvatar">${icon("person", 32)}</div>
          <div class="picked-name" id="pickedName">Who's next?</div>
          <div class="picked-sub" id="pickedSub"></div>
        </div>
        <div class="seg" id="mode">
          <button data-m="round" class="active">Everyone once</button>
          <button data-m="random">Fully random</button>
        </div>
        <div class="psty-set">
          <label for="pickStyle">Animation</label>
          <select id="pickStyle"></select>
        </div>
        <div class="muted" style="margin-top:4px">Surprise me picks a different animation each time.</div>
        <div class="actions">
          <button class="btn primary grow" id="pickBtn">Pick next speaker</button>
          <button class="btn text" id="resetRound">Reset</button>
        </div>

        <div class="section">
          <div class="eyebrow" style="margin:0" id="peopleHead">Participants</div>
          <div style="display:flex;align-items:center;gap:4px">
            <span class="live" id="liveState">Live</span>
            <button class="iconbtn" id="syncBtn" title="Sync now">${icon("sync")}</button>
            <button class="btn text" id="clearAll" style="height:32px;padding:0 10px">Clear all</button>
          </div>
        </div>
        <ul class="people" id="people"></ul>
        <div class="add">
          <input id="addName" placeholder="Add a name" maxlength="60" />
          <button class="btn tonal" id="addBtn">${icon("plus", 18)}Add</button>
        </div>
        <div class="setting">
          <div>
            <div style="font-size:14px;color:#1f1f1f">Auto-add participants</div>
            <div class="muted">Keeps the list in sync as people join or leave. May briefly open the People panel.</div>
          </div>
          <button class="switch" id="autoSync" aria-label="Auto-add participants"></button>
        </div>
        <div class="setting" style="border-top:none;margin-top:8px;padding-top:0">
          <div class="muted">Someone missing? Copy a diagnostic report (names are masked) and share it with support.</div>
          <button class="btn text" id="diagBtn">Diagnose</button>
        </div>
      </div>
    </div>
  </section>

  <div class="psty" id="psty" hidden>
    <div class="psty-fx" id="pstyFx"></div>
    <div class="psty-dlg" id="pstyDlg" role="dialog" aria-modal="true" aria-label="Picking the next speaker" tabindex="-1">
      <button class="psty-x" id="pstyClose" aria-label="Close" title="Close">${icon("close", 22)}</button>
      <div class="psty-style" id="pstyStyle"></div>
      <div class="psty-stage" id="pstyStage"></div>
      <div class="psty-win" id="pstyWin" hidden></div>
      <div class="psty-acts" id="pstyActs" hidden>
        <button class="psty-b ghost" id="pstySkip">Skip, not here</button>
        <button class="psty-b soft" id="pstyAgain">Pick again</button>
        <button class="psty-b main" id="pstyDone">Done</button>
      </div>
      <div class="psty-live" id="pstyLive" aria-live="polite"></div>
    </div>
  </div>

  <div class="snackbar" id="snack"></div>
</div>`);

  const $ = (s) => root.querySelector(s);
  const $$ = (s) => [...root.querySelectorAll(s)];

  /* ---------- Shell ---------- */
  const panel = $("#panel"), launcher = $("#launcher");
  const setOpen = (open) => { panel.classList.toggle("open", open); launcher.classList.toggle("on", open); };
  launcher.addEventListener("click", () => setOpen(!panel.classList.contains("open")));
  $("#close").addEventListener("click", () => setOpen(false));
  // KEYS-001: Alt+S only — never while typing (Meet chat, inputs, contenteditable), never with Ctrl/Cmd
  // (AltGr is Ctrl+Alt on Windows), never on key repeat. If it isn't ours, don't block the keystroke.
  document.addEventListener("keydown", (e) => {
    if (!e.altKey || e.ctrlKey || e.metaKey || e.repeat || e.code !== "KeyS") return;
    const t = e.composedPath()[0];
    if (t && t.nodeType === 1 && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    setOpen(!panel.classList.contains("open"));
  });

  const showView = (v) => {
    $$(".nav button").forEach((b) => b.classList.toggle("active", b.dataset.v === v));
    $$(".view").forEach((el) => el.classList.toggle("active", el.dataset.v === v));
    store.set("tab", v);
  };
  $$(".nav button").forEach((b) => b.addEventListener("click", () => showView(b.dataset.v)));
  const VIEWS = ["ice", "wyr", "bingo", "people"];
  const savedTab = store.get("tab", "ice");
  showView(VIEWS.includes(savedTab) ? savedTab : "ice"); // ROSTER-004

  const toast = (msg) => {
    const s = $("#snack"); s.textContent = msg; s.classList.add("show");
    clearTimeout(s._t); s._t = setTimeout(() => s.classList.remove("show"), 2200);
  };
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast("Copied — paste it into the Meet chat"); }
    catch { toast("Copy failed — please copy manually"); }
  };
  const celebrate = () => {
    const colors = ["#0b57d0", "#a8c7fa", "#1e8e3e", "#fbbc04", "#d3e3fd"];
    const r = panel.getBoundingClientRect();
    for (let i = 0; i < 40; i++) {
      const c = document.createElement("div");
      c.className = "burst";
      c.style.left = r.left + Math.random() * r.width + "px";
      c.style.top = r.top + 40 + "px";
      c.style.background = pick(colors);
      c.style.setProperty("--dx", (Math.random() - 0.5) * 160 + "px");
      c.style.animationDuration = 1.2 + Math.random() * 0.8 + "s";
      root.appendChild(c);
      setTimeout(() => c.remove(), 2200);
    }
  };

  /* ---------- Icebreakers ---------- */
  const cats = Object.keys(ICEBREAKERS);
  let cat = store.get("cat", cats[0]); // validated just below (ROSTER-004)
  if (!cats.includes(cat)) cat = cats[0];
  const decks = {};
  let iceCurrent = null;
  const renderCats = () => {
    setHTML($("#cats"), cats.map((c) => `<button class="chip ${c === cat ? "active" : ""}" data-c="${c}">${c}</button>`).join(""));
    $$("#cats .chip").forEach((b) => b.addEventListener("click", () => { cat = b.dataset.c; store.set("cat", cat); renderCats(); nextIce(); }));
  };
  const nextIce = () => {
    if (!decks[cat] || !decks[cat].length) decks[cat] = shuffle(ICEBREAKERS[cat]);
    iceCurrent = decks[cat].pop();
    $("#iceQ").textContent = iceCurrent;
    $("#iceQ").classList.remove("placeholder");
    $("#iceTo").textContent = "";
    const total = ICEBREAKERS[cat].length;
    $("#iceCounter").textContent = `${cat} · ${total - decks[cat].length} of ${total}`;
  };
  $("#iceNext").addEventListener("click", nextIce);
  $("#iceAsk").addEventListener("click", () => {
    if (!iceCurrent) nextIce();
    const who = pickSpeaker({ announce: false });
    if (who) $("#iceTo").textContent = `Question for ${who}`;
  });
  $("#iceCopy").addEventListener("click", () => {
    if (!iceCurrent) return toast("Draw a question first");
    const to = $("#iceTo").textContent.replace("Question for ", "");
    copy(to ? `Icebreaker for ${to}: ${iceCurrent}` : `Icebreaker: ${iceCurrent}`);
  });
  renderCats();

  /* ---------- This or that ---------- */
  let wyrDeck = [], wyr = null;
  $("#wyrNext").addEventListener("click", () => {
    if (!wyrDeck.length) wyrDeck = shuffle(WYR);
    wyr = wyrDeck.pop();
    $("#wyrA").textContent = wyr[0];
    $("#wyrB").textContent = wyr[1];
  });
  $("#wyrCopy").addEventListener("click", () => {
    if (!wyr) return toast("Draw a prompt first");
    copy(`Would you rather…\nA) ${wyr[0]}\nB) ${wyr[1]}\nReact 👍 for A or ❤️ for B`);
  });

  /* ---------- Bingo ---------- */
  const LINES = [];
  for (let i = 0; i < 5; i++) {
    LINES.push([0, 1, 2, 3, 4].map((j) => i * 5 + j));
    LINES.push([0, 1, 2, 3, 4].map((j) => j * 5 + i));
  }
  LINES.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);
  let bingo = store.get("bingo_in", null);
  const newBingo = () => {
    const items = shuffle(BINGO).slice(0, 24);
    items.splice(12, 0, "FREE");
    bingo = { items, marked: [12], won: [] };
    store.set("bingo_in", bingo); renderBingo();
  };
  const renderBingo = () => {
    const win = new Set(bingo.won.flatMap((l) => LINES[l]));
    setHTML($("#grid"), bingo.items.map((t, i) => {
      const cls = i === 12 ? "free" : win.has(i) ? "win" : bingo.marked.includes(i) ? "on" : "";
      return `<div class="cell ${cls}" data-i="${i}">${i === 12 ? "FREE" : esc(t)}</div>`;
    }).join(""));
    $$("#grid .cell").forEach((c) => { const i = +c.dataset.i; if (i !== 12) c.addEventListener("click", () => toggleCell(i)); });
    setHTML($("#bingoScore"), `<b>${bingo.marked.length - 1}</b> marked · <b>${bingo.won.length}</b> line${bingo.won.length === 1 ? "" : "s"}`);
  };
  const toggleCell = (i) => {
    bingo.marked = bingo.marked.includes(i) ? bingo.marked.filter((x) => x !== i) : [...bingo.marked, i];
    const now = LINES.map((l, k) => (l.every((x) => bingo.marked.includes(x)) ? k : -1)).filter((k) => k >= 0);
    const fresh = now.some((k) => !bingo.won.includes(k));
    bingo.won = now; store.set("bingo_in", bingo); renderBingo();
    if (fresh) { celebrate(); toast("Bingo! Call it out in the meeting"); }
  };
  $("#bingoNew").addEventListener("click", newBingo);
  $("#bingoCopy").addEventListener("click", () => copy("Meeting Bingo is on — open Meet Spark → Bingo and mark squares as they happen. First to five in a row wins."));
  // ROSTER-004: only restore a stored card of the right shape.
  const isIdx = (max) => (x) => Number.isInteger(x) && x >= 0 && x < max;
  const validBingo = (b) => !!b && Array.isArray(b.items) && b.items.length === 25 && b.items.every((t) => typeof t === "string") &&
    Array.isArray(b.marked) && b.marked.every(isIdx(25)) && b.marked.includes(12) && Array.isArray(b.won) && b.won.every(isIdx(LINES.length));
  if (!validBingo(bingo)) newBingo(); else renderBingo();

  /* ---------- Speakers ---------- */
  let mode = store.get("mode", "round");
  if (mode !== "round" && mode !== "random") mode = "round"; // ROSTER-004
  // "Already spoken" is per meeting (ROSTER-001) and never saved outside a meeting (ROSTER-002).
  let spoken = new Set();
  function loadSpoken() { spoken = new Set(currentMeeting ? validNames(store.get(`spoken:${currentMeeting}`, [])) : []); }
  loadSpoken();
  const saveSpoken = () => { if (currentMeeting) store.set(`spoken:${currentMeeting}`, [...spoken]); };
  const setMode = (m) => { mode = m; store.set("mode", m); $$("#mode button").forEach((b) => b.classList.toggle("active", b.dataset.m === m)); renderPeople(); };
  $$("#mode button").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.m)));

  function renderPeople() {
    const all = roster.all();
    const list = $("#people");
    if (!all.length) {
    setHTML(list, `<li class="empty muted">No participants yet.<br>Open Meet's People panel and tap sync — or add names below.</li>`);
    } else {
    setHTML(list, all.map((n) => {
        const out = roster.excluded.has(n);
        const done = mode === "round" && spoken.has(n);
        const me = n === selfName();
        const src = roster.manual.has(n) && !roster.live.has(n) ? "Added manually" : me ? "You" : "";
        return `<li class="person ${out ? "out" : ""} ${done && !out ? "done" : ""}" data-n="${esc(n)}">
          <button class="toggle ${out ? "" : "on"}" title="${out ? "Include" : "Exclude"}">${out ? "" : icon("check", 14)}</button>
          <span class="avatar" style="background:${avatarColor(n)}">${esc(initials(n))}</span>
          <span class="nm">${esc(n)}</span>
          ${src ? `<span class="meta">${src}</span>` : ""}
          <button class="iconbtn rm" title="Remove ${esc(n)}" aria-label="Remove ${esc(n)}">${icon("close", 18)}</button>
        </li>`;
      }).join(""));
      $$("#people .person").forEach((li) => {
        const n = li.dataset.n;
        li.querySelector(".toggle").addEventListener("click", () => {
          roster.excluded.has(n) ? roster.excluded.delete(n) : roster.excluded.add(n);
          roster.save(); renderPeople();
        });
        li.querySelector(".rm").addEventListener("click", () => {
          roster.remove(n); spoken.delete(n); saveSpoken(); renderPeople();
          toast(`Removed ${n}`);
        });
      });
    }
    const active = roster.active();
    const left = active.filter((n) => !spoken.has(n)).length;
    $("#peopleHead").textContent = `Participants (${all.length})`;
    $("#pickedSub").textContent = !active.length ? "" : mode === "round" ? `${left} of ${active.length} still to speak` : `${active.length} in the draw`;
    updateCount();
  }
  function updateCount() {
    $("#navCount").textContent = roster.all().length;
    const joined = inCall();
    const live = $("#liveState");
    live.classList.toggle("off", !joined);
    live.textContent = joined ? (store.get("autoSync", true) !== false ? "Live" : "Manual") : "Not in call";
  }
  function setSyncState(on) {
    const b = $("#syncBtn");
    setHTML(b, on ? `<span class="spin" style="display:grid">${icon("sync")}</span>` : icon("sync"));
    b.disabled = on;
  }

  /* ---------- Picker popup (docs/specs/picker-styles.md, PSTY-001…035) ---------- */
  // The winner is always chosen first by pickSpeaker() (SPK-010…013); the popup only reveals it (PSTY-011).
  const PSTY = { surprise: "Surprise me", slot: "Slot machine", wheel: "Wheel", spotlight: "Spotlight", cards: "Cards", board: "Departure board", countdown: "Countdown" };
  const PSTY_STYLES = ["slot", "wheel", "spotlight", "cards", "board", "countdown"];
  let pickStyle = store.get("pickStyle", "surprise");
  if (pickStyle !== "surprise" && !PSTY_STYLES.includes(pickStyle)) pickStyle = "surprise"; // PSTY-002
  const pop = { open: false, revealed: false, winner: null, style: null, last: null, inCall: false, timers: [] };
  const popLater = (fn, ms) => { pop.timers.push(setTimeout(fn, ms)); };
  const popStop = () => { pop.timers.forEach(clearTimeout); pop.timers = []; };
  const reducedMotion = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };
  const nameParts = (n) => { const p = n.trim().split(/\s+/); return [p[0] || "", p.slice(1).join(" ")]; };
  const avHTML = (n, size) => `<span class="psty-av" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.36)}px;background:${avatarColor(n)}">${esc(initials(n))}</span>`;
  // PSTY-013: at most k names, always including the winner, in random order.
  const sampleWith = (list, k, must) => {
    const out = shuffle(list.filter((n) => n !== must)).slice(0, Math.max(0, k - 1));
    out.splice(Math.floor(Math.random() * (out.length + 1)), 0, must);
    return out;
  };
  // PSTY-003 / PSTY-004: a fixed style, or a random one that never repeats the previous pick's style.
  // PSTY-006: styles already shown in this meeting. Surprise me shows every style once before going random.
  let styleSeen = new Set();
  function loadStyleSeen() {
    const v = currentMeeting ? store.get(`styleSeen:${currentMeeting}`, []) : [];
    styleSeen = new Set(Array.isArray(v) ? v.filter((x) => PSTY_STYLES.includes(x)) : []);
  }
  loadStyleSeen();
  const markStyleSeen = (style) => { styleSeen.add(style); if (currentMeeting) store.set(`styleSeen:${currentMeeting}`, [...styleSeen]); };
  const nextStyle = () => {
    if (pickStyle !== "surprise") return pickStyle;
    const unseen = PSTY_STYLES.filter((x) => !styleSeen.has(x) && x !== pop.last);
    return pick(unseen.length ? unseen : PSTY_STYLES.filter((x) => x !== pop.last));
  };

  // Each renderer draws its animation into the stage, schedules it with popLater() and returns
  // { ms: time until the reveal (≤ 5000, PSTY-012), head: reveal headline, avatar?: false, reveal?: fn }.
  const RENDER = {
    slot(stage, w, draw, info) { // PSTY-030: 3 reels from a random sample, ≤ 40 rows each (PSTY-013)
      const T = [26, 32, 38];
      const strips = T.map((t) => { const a = []; for (let i = 0; i < t; i++) a.push(pick(draw)); a.push(w, pick(draw)); return a; });
      const row = (n, k) => `<div class="ps-row" data-n="${esc(n)}">${k === 0 ? avHTML(n, 48) : `<span>${esc(nameParts(n)[k - 1]) || "&nbsp;"}</span>`}</div>`;
      setHTML(stage, `<div class="ps-slot"><div class="ps-marq"><div class="ps-bulbs">${"<i></i>".repeat(16)}</div><div class="ps-title">SPARK JACKPOT</div></div>
        <div class="ps-body"><div class="ps-win">${strips.map((s, k) => `<div class="ps-reel${k === 0 ? " av" : ""}"><div class="ps-strip">${s.map((n) => row(n, k)).join("")}</div></div>`).join("")}<div class="ps-line"></div></div>
        <div class="ps-foot"><div class="ps-led"><small>${info.label}</small><b>${info.value}</b></div><div class="ps-note">GOOD LUCK!</div></div></div>
        <div class="ps-lever"><i></i></div></div>`);
      const box = stage.firstElementChild, durs = [1700, 2300, 2900];
      box.classList.add("pull");
      popLater(() => box.classList.remove("pull"), 350);
      popLater(() => stage.querySelectorAll(".ps-strip").forEach((el, i) => {
        el.style.setProperty("--t", durs[i] + "ms");
        el.style.transform = `translateY(${-(T[i] - 1) * 64}px)`; // row T (the winner) on the payline
      }), 40);
      return { ms: 3000, head: `Jackpot! ${nameParts(w)[0]}, you're up`, reveal: () => box.classList.add("won") };
    },
    wheel(stage, w, draw) { // PSTY-031: ≤ 12 slices; bigger draws get a shortlist that always holds the winner
      const COLORS = ["#1a73e8", "#188038", "#e37400", "#a142f4", "#d93025", "#007b83"];
      const big = draw.length > 12;
      const slots = big ? sampleWith(draw, 12, w) : shuffle(draw);
      const m = slots.length, deg = 360 / m;
      const col = (i) => COLORS[(i + (m % 6 === 1 && i === m - 1 ? 1 : 0)) % 6];
      const stops = slots.map((_, i) => `${col(i)} ${i * deg}deg ${(i + 1) * deg}deg`).join(",");
      const r = m > 8 ? 110 : 100;
      const turn = 360 * 7 - (slots.indexOf(w) * deg + deg / 2); // final rotation: the winner's slice under the pointer
      const place = (i) => { // labels that end up on the left half are turned 180° so no name reads upside down at rest
        const a = i * deg + deg / 2 - 90, end = (a + turn) % 360;
        return end > 90 && end < 270 ? `rotate(${a - 180}deg) translateX(${-r}px)` : `rotate(${a}deg) translateX(${r}px)`;
      };
      setHTML(stage, `<div class="ps-wheelbox"><div class="ps-ptr"></div><div class="ps-wheel" style="background:conic-gradient(${stops})">${slots.map((n, i) =>
        `<span class="ps-wl" data-n="${esc(n)}" style="transform:translate(-50%,-50%) ${place(i)}">${esc(nameParts(n)[0])}</span>`).join("")}</div><div class="ps-hub">${icon("spark", 28)}</div></div>`);
      const wheel = stage.querySelector(".ps-wheel"), labels = [...stage.querySelectorAll(".ps-wl")];
      const label = (el, n) => { el.textContent = nameParts(n)[0]; el.dataset.n = n; };
      let start = 40;
      if (big) { // shuffle names onto the wheel, then settle on the shortlist
        for (let k = 0; k < 8; k++) popLater(() => labels.forEach((el) => label(el, pick(draw))), k * 90);
        popLater(() => labels.forEach((el, i) => label(el, slots[i])), 760);
        start = 800;
      }
      popLater(() => { wheel.style.transform = `rotate(${turn}deg)`; }, start);
      return { ms: start + 4100, head: "The wheel has spoken" };
    },
    spotlight(stage, w, draw) { // PSTY-032: ≤ 200 faces in a grid that shrinks to fit
      const faces = draw.length > 200 ? sampleWith(draw, 200, w) : draw;
      const n = faces.length, W = 576, H = 290;
      let c = 1;
      while (Math.ceil(n / c) * (W / c) > H) c++;
      const cell = Math.floor(W / c), size = Math.min(96, cell - (cell > 34 ? 8 : 3));
      setHTML(stage, `<div class="ps-spot"><div class="ps-grid" style="grid-template-columns:repeat(${c},${cell}px)">${faces.map((f) =>
        `<div class="ps-cell" data-n="${esc(f)}" style="width:${cell}px;height:${cell}px;--z:${size > 60 ? 1.15 : 1.9}"><span class="ps-face" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.36)}px;background:${avatarColor(f)}">${size >= 26 ? esc(initials(f)) : ""}</span></div>`).join("")}</div><div class="ps-tick"></div></div>`);
      const box = stage.firstElementChild, cells = [...stage.querySelectorAll(".ps-cell")], tickEl = stage.querySelector(".ps-tick");
      let lit = null;
      const light = (i) => { if (lit) lit.classList.remove("lit"); lit = cells[i]; lit.classList.add("lit"); tickEl.textContent = faces[i]; };
      const steps = n > 6 ? 20 : 16, grow = n > 6 ? 1.13 : 1.17;
      let delay = n > 6 ? 35 : 60, at = 0, cur = -1;
      box.classList.add("rolling");
      for (let s = 0; s < steps; s++) {
        const i = n > 1 && cur >= 0 ? (cur + 1 + Math.floor(Math.random() * (n - 1))) % n : Math.floor(Math.random() * n); // never the same face twice in a row
        cur = i;
        popLater(() => light(i), at);
        at += delay; delay *= grow;
      }
      const wi = faces.indexOf(w);
      return { ms: Math.round(at), head: "The mic goes to", reveal: () => { box.classList.remove("rolling"); light(wi); cells[wi].classList.add("won"); } };
    },
    cards(stage, w) { // PSTY-033
      setHTML(stage, `<div class="ps-cards"><div class="ps-rays"></div>${[0, 1, 2].map((i) => `<div class="ps-card ps-back b${i}">${icon("spark", 56)}</div>`).join("")}
        <div class="ps-card ps-topcard"><div class="ps-in"><div class="ps-f front">${icon("spark", 72)}</div>
        <div class="ps-f face">${avHTML(w, 104)}<b data-n="${esc(w)}">${esc(w)}</b><small>You're up!</small></div></div></div></div>`);
      const box = stage.firstElementChild;
      [["s1", 300], ["s2", 650], ["s3", 1000], ["flip", 1250]].forEach(([c, t]) => popLater(() => { box.classList.remove("s1", "s2", "s3"); box.classList.add(c); }, t));
      return { ms: 1900, head: "Next speaker", avatar: false, reveal: () => box.classList.add("party") };
    },
    board(stage, w) { // PSTY-034: split-flap letters settle left to right
      const rows = nameParts(w).map((t) => [...t.toUpperCase().padEnd(11, " ")].slice(0, 11));
      setHTML(stage, `<div class="ps-board"><div class="ps-bhead"><span>NOW SPEAKING</span><span>GATE 1</span></div>${rows.map(() => `<div class="ps-brow">${'<div class="ps-tile"></div>'.repeat(11)}</div>`).join("")}</div>`);
      const tiles = [...stage.querySelectorAll(".ps-brow")].map((r) => [...r.children]);
      const A = "ABCDEFGHIJKLMNOPRSTUVWXYZ";
      const paint = (t) => rows.forEach((chars, r) => chars.forEach((ch, i) => {
        const done = t >= (r ? 16 : 6) + i * 2;
        tiles[r][i].textContent = done ? ch : A[(t * 7 + i * 3 + r * 5) % A.length];
        tiles[r][i].classList.toggle("set", done);
      }));
      for (let t = 0; t <= 40; t++) popLater(() => paint(t), t * 50);
      return { ms: 2050, head: "Now speaking" };
    },
    countdown(stage, w) { // PSTY-035
      setHTML(stage, `<div class="ps-count"><div class="ps-ring"></div><div class="ps-num"></div></div>`);
      const ring = stage.querySelector(".ps-ring"), num = stage.querySelector(".ps-num");
      const set = (k) => {
        num.textContent = k;
        num.style.animation = "none"; num.getBoundingClientRect(); num.style.animation = ""; // restart the pop-in
        ring.style.background = `conic-gradient(#a8c7fa ${(4 - k) * 120}deg, rgba(255,255,255,.15) 0)`;
      };
      set(3);
      popLater(() => set(2), 800);
      popLater(() => set(1), 1600);
      return { ms: 2400, head: "Take it away!", avatar: false, reveal: () => setHTML(stage, `<div class="ps-pop">${avHTML(w, 140)}</div>`) };
    },
  };

  const fitPicker = () => { // PSTY decision 4: scale down to fit small windows, never scroll
    const k = Math.min(1, (innerWidth - 32) / 660, (innerHeight - 32) / 620);
    $("#pstyDlg").style.zoom = k < 1 ? String(Math.max(0.4, k)) : "";
  };
  function confetti(coins) { // PSTY-015
    const PAL = ["#fdd663", "#ff6d5e", "#a8c7fa", "#81c995", "#ffffff", "#c58af9"], bits = [];
    for (let i = 0; i < 70; i++) bits.push(`<i class="psty-cf" style="left:${(i * 53) % 100}%;background:${PAL[i % 6]};--dx:${((i * 29) % 160) - 80}px;--t:${(1.6 + (i % 7) * 0.22).toFixed(2)}s;--d:${((i % 10) * 0.06).toFixed(2)}s${i % 5 === 0 ? ";border-radius:50%" : ""}"></i>`);
    if (coins) for (let i = 0; i < 24; i++) bits.push(`<i class="psty-coin" style="--dx:${((i * 47) % 360) - 180}px;--up:${-120 - (i % 5) * 40}px;--t:${(1.6 + (i % 4) * 0.2).toFixed(2)}s;--d:${((i % 6) * 0.05).toFixed(2)}s"></i>`);
    setHTML($("#pstyFx"), bits.join(""));
  }
  const markPicked = (w) => { // the panel's picker card shows the winner (PSTY-019, PSTY-020)
    showPicked(w);
    $("#picker").classList.remove("rolling"); $("#picker").classList.add("done");
    renderPeople();
  };

  function openPicker(winner, active) { // PSTY-010
    popStop();
    const style = nextStyle();
    markStyleSeen(style); // PSTY-006
    Object.assign(pop, { style, last: style, winner, revealed: false });
    if (!pop.open) { pop.open = true; pop.inCall = inCall(); $("#psty").hidden = false; }
    $("#pickBtn").disabled = true;
    $("#picker").classList.remove("done"); $("#picker").classList.add("rolling");
    // PSTY-014: in Everyone once only people still to speak (plus the winner) appear in the animation.
    const draw = mode === "round" ? active.filter((n) => n === winner || !spoken.has(n)) : active;
    const left = active.filter((n) => !spoken.has(n)).length;
    const info = mode === "round" ? { label: "STILL TO SPEAK", value: `${left} / ${active.length}` } : { label: "IN THE DRAW", value: String(active.length) };
    const dlg = $("#pstyDlg");
    dlg.dataset.style = style;
    $("#pstyStyle").textContent = PSTY[style]; // PSTY-005
    $("#pstyWin").hidden = true; $("#pstyActs").hidden = true; $("#pstyLive").textContent = "";
    $("#pstyFx").replaceChildren();
    const stage = $("#pstyStage");
    stage.replaceChildren();
    fitPicker();
    dlg.focus();
    if (reducedMotion()) { revealPicker({ head: "Next speaker" }, true); return; } // PSTY-022
    const r = RENDER[style](stage, winner, draw, info);
    popLater(() => revealPicker(r, false), r.ms);
  }
  function revealPicker(r, still) { // PSTY-015, PSTY-016, PSTY-023
    pop.revealed = true;
    const w = pop.winner;
    if (r.reveal) r.reveal();
    markPicked(w);
    const win = $("#pstyWin");
    setHTML(win, `${r.avatar === false ? "" : avHTML(w, 72)}<div><div class="psty-head"></div><div class="psty-name"></div></div>`);
    win.querySelector(".psty-head").textContent = r.head;
    win.querySelector(".psty-name").textContent = w;
    win.hidden = false;
    $("#pstyLive").textContent = `Next speaker: ${w}`;
    if (!still) confetti(pop.style === "slot");
    $("#pstyActs").hidden = false;
    $("#pstyDone").focus();
  }
  function closePicker({ keep = true } = {}) { // PSTY-019, PSTY-020, PSTY-026
    if (!pop.open) return;
    popStop();
    if (keep && !pop.revealed) markPicked(pop.winner);
    $("#picker").classList.remove("rolling");
    pop.open = false; pop.revealed = false;
    $("#psty").hidden = true;
    $("#pstyStage").replaceChildren(); $("#pstyFx").replaceChildren();
    $("#pickBtn").disabled = false;
    if (keep) $("#pickBtn").focus(); // PSTY-023
  }
  // PSTY-026: leaving the call (the popup was opened in it) or switching meeting closes the popup.
  function pickerLeft({ meetingChanged = false } = {}) { if (pop.open && (meetingChanged || pop.inCall)) closePicker({ keep: false }); }

  $("#pstyClose").addEventListener("click", () => closePicker());
  $("#pstyDone").addEventListener("click", () => closePicker());
  $("#pstyAgain").addEventListener("click", () => { if (pop.revealed) pickSpeaker(); }); // PSTY-018
  $("#pstySkip").addEventListener("click", () => { // PSTY-017: the skipped person isn't counted as spoken
    if (!pop.revealed) return;
    const w = pop.winner;
    if (!roster.active().some((n) => n !== w)) { toast("No one else to pick"); return; }
    spoken.delete(w); saveSpoken();
    pickSpeaker({ avoid: w });
  });
  // PSTY-023 / PSTY-025: keys are handled only inside the open popup and never reach Meet.
  $("#pstyDlg").addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Escape") { e.preventDefault(); closePicker(); return; }
    if (e.key !== "Tab") return;
    const f = [...$("#pstyDlg").querySelectorAll("button")].filter((b) => !b.closest("[hidden]"));
    const i = f.indexOf(root.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  });
  $("#pstyDlg").addEventListener("keyup", (e) => e.stopPropagation());

  const styleSel = $("#pickStyle"); // PSTY-001, PSTY-002
  setHTML(styleSel, Object.entries(PSTY).map(([k, v]) => `<option value="${k}">${v}</option>`).join(""));
  styleSel.value = pickStyle;
  styleSel.addEventListener("change", () => { pickStyle = PSTY[styleSel.value] ? styleSel.value : "surprise"; store.set("pickStyle", pickStyle); });
  ["keydown", "keyup"].forEach((t) => styleSel.addEventListener(t, (e) => e.stopPropagation()));

  function pickSpeaker({ announce = true, avoid = null } = {}) {
    if (announce && pop.open && !pop.revealed) return null; // PSTY-021: one pick at a time
    const active = roster.active();
    if (!active.length) { toast("No participants yet — sync or add names"); showView("people"); return null; }
    const cands = avoid && active.length > 1 ? active.filter((n) => n !== avoid) : active; // PSTY-017
    let pool = mode === "round" ? cands.filter((n) => !spoken.has(n)) : cands;
    if (!pool.length) { spoken.clear(); saveSpoken(); pool = cands; toast("Everyone has spoken — starting a new round"); }
    const winner = pick(pool);
    if (mode === "round") { spoken.add(winner); saveSpoken(); }
    if (announce) openPicker(winner, active); else { showPicked(winner); renderPeople(); }
    return winner;
  }
  function showPicked(n) {
    $("#pickedAvatar").style.background = avatarColor(n);
    $("#pickedAvatar").textContent = initials(n);
    $("#pickedName").textContent = n;
  }
  $("#pickBtn").addEventListener("click", () => pickSpeaker());
  $("#resetRound").addEventListener("click", () => {
    spoken.clear(); saveSpoken();
    $("#picker").classList.remove("done");
    $("#pickedAvatar").style.background = ""; setHTML($("#pickedAvatar"), icon("person", 32));
    $("#pickedName").textContent = "Who's next?";
    renderPeople();
  });
  $("#syncBtn").addEventListener("click", () => { syncPaused = false; fullSync(); });
  $("#clearAll").addEventListener("click", () => {
    roster.clear(); spoken.clear(); saveSpoken(); renderPeople();
    toast("List cleared — tap sync to re-read who's in the call");
  });
  $("#diagBtn").addEventListener("click", () => { const r = diagnose(); console.log("[Meet Spark] diagnostics", r); copy(r); });
  const addName = () => {
    const n = cleanName($("#addName").value) || $("#addName").value.trim();
    if (!n) return;
    roster.manual.add(n); roster.excluded.delete(n); roster.save();
    $("#addName").value = ""; renderPeople();
  };
  $("#addBtn").addEventListener("click", addName);
  $("#addName").addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") addName(); });
  $("#addName").addEventListener("keyup", (e) => e.stopPropagation());

  const auto = $("#autoSync");
  const autoOn = () => store.get("autoSync", true) !== false;
  const renderAuto = () => { auto.classList.toggle("on", autoOn()); updateCount(); };
  auto.addEventListener("click", () => { store.set("autoSync", !autoOn()); renderAuto(); if (autoOn()) fullSync({ silent: true }); });
  renderAuto();
  setMode(mode);
})();
