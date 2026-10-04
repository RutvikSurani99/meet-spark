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
  const MEETING_PATH = /^\/(?:([a-z]{3}-[a-z]{4}-[a-z]{3})|lookup\/([\w-]+))(?:[/?#]|$)/i;
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
  const JUNK = /^(you|me|presentation|presenting|host|meeting host|co-host|more options|more actions|pin|unpin|mute|remove|keep|keep_outline|more_vert|mic|mic_off|mic_none|frame_person|visual_effects|in the meeting|contributors|waiting to join|people|participants)$/i;
  function cleanName(raw) {
    if (!raw) return null;
    let n = String(raw).split("\n")[0]
      .replace(/\s*\((you|presenting|presentation|host|meeting host|co-host)\)\s*/gi, " ")
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
      const inPanel = /people|participants|in the meeting|in call|contributors/i.test(
        (l.closest("aside, [role=complementary], [role=dialog], [role=region]") || l.parentElement || l).getAttribute?.("aria-label") ||
        (l.closest("aside, [role=complementary], [role=dialog], [role=region]") || {}).innerText?.slice(0, 200) || "");
      const score = named * 2 + (inPanel ? 5 : 0);
      if (named && inPanel && score > bestScore) { best = l; bestScore = score; }
    });
    return best;
  }
  function selfName() {
    const el = q("[data-self-name]");
    return el ? cleanName(el.getAttribute("data-self-name")) : null;
  }
  function nameFrom(el) {
    if (!el) return null;
    const self = el.hasAttribute?.("data-self-name") ? el : q("[data-self-name]", el);
    const direct = (self && cleanName(self.getAttribute("data-self-name"))) || cleanName(el.getAttribute?.("aria-label"));
    if (direct) return direct;
    for (const sel of [".notranslate", '[translate="no"]', "[data-tooltip]"]) {
      for (const c of qa(sel, el)) {
        const n = cleanName(c.textContent) || cleanName(c.getAttribute("data-tooltip"));
        if (n) return n;
      }
    }
    const line = (el.innerText || "").split("\n").map((x) => x.trim()).find((x) => cleanName(x));
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
        const lines = (el.innerText || "").split("\n").map((x) => x.trim()).filter(Boolean);
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
    currentMeeting = id;
    roster.live.clear(); roster.dismissed.clear();
    roster.manual = new Set(id ? validNames(store.get(`manual:${id}`, [])) : []);
    roster.excluded = new Set(id ? validNames(store.get(`excluded:${id}`, [])) : []);
    roster.lastFullSync = 0; roster.lastSyncCount = undefined;
    syncPaused = false; joinedAt = 0;
    loadSpoken();
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
    const scrolledAll = sc === list ? list.scrollHeight <= list.clientHeight + 2 || atBottom(list) : sc.scrollTop <= 1 && atBottom(sc);
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
      if (sc === list || atBottom(sc)) { bottom = true; break; }
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
    let clicked = false, appeared = wasOpen;
    try {
      if (!wasOpen) {
        clicked = safeClick(btn, "open People panel");
        if (!clicked) { screenSync(silent); return; }
      }
      for (let i = 0; i < 30 && !participantsList(); i++) await sleep(100);
      if (participantsList()) appeared = true;
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
      if (clicked) undoOpen({ appeared, silent });
      syncing = false;
      setSyncState(false);
    }
  }

  // SAFE-003: close the panel WE opened — but only while our People list is still the one showing,
  // using a freshly found People button. If something else (Chat, Activities) replaced it, don't click.
  function undoOpen({ appeared, silent }) {
    const listShowing = !!participantsList();
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
    if (!inCall()) { joinedAt = 0; updateCount(); return; }
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

  let rolling = false;
  function pickSpeaker({ announce = true } = {}) {
    const active = roster.active();
    if (!active.length) { toast("No participants yet — sync or add names"); showView("people"); return null; }
    let pool = mode === "round" ? active.filter((n) => !spoken.has(n)) : active;
    if (!pool.length) { spoken.clear(); saveSpoken(); pool = active; toast("Everyone has spoken — starting a new round"); }
    const winner = pick(pool);
    if (mode === "round") { spoken.add(winner); saveSpoken(); }
    if (announce) animatePick(winner, active); else { showPicked(winner); renderPeople(); }
    return winner;
  }
  function showPicked(n) {
    $("#pickedAvatar").style.background = avatarColor(n);
    $("#pickedAvatar").textContent = initials(n);
    $("#pickedName").textContent = n;
  }
  function animatePick(winner, pool) {
    if (rolling) return;
    rolling = true;
    const p = $("#picker"); p.classList.remove("done"); p.classList.add("rolling");
    $("#pickBtn").disabled = true;
    let delay = 50, i = 0;
    const steps = 16;
    const tick = () => {
      if (i++ < steps) {
        showPicked(pool.length > 1 ? pick(pool) : winner);
        delay *= 1.14;
        return setTimeout(tick, delay);
      }
      showPicked(winner);
      p.classList.remove("rolling"); p.classList.add("done");
      $("#pickBtn").disabled = false;
      rolling = false;
      renderPeople();
    };
    tick();
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
