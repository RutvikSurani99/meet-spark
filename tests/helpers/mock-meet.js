// PROTECTED FILE — mock Google Meet pages shared by the browser tests (GR-8).
// Everything here is fake markup that imitates Meet's public structure (aria labels, roles, data-*).

const FIRST = ["Asha", "Vikram", "Priya", "Karthik", "Meera", "Arjun", "Divya", "Rahul", "Sneha", "Rohan", "Kavya", "Aditya", "Ananya", "Siddharth", "Pooja"];
const LAST = ["Rao", "Singh", "Nair", "Iyer", "Sharma", "Menon", "Reddy", "Das", "Patel", "Kulkarni"];
// n unique, realistic display names ("Asha Rao", "Vikram Singh", …), always sorted the same way.
function peopleNames(n) {
  const out = [];
  for (let i = 0; out.length < n; i++) out.push(`${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}${i >= FIRST.length * LAST.length ? " " + i : ""}`);
  return out;
}

// A Meet-like page with a People button that toggles a side panel holding the participants list.
//   people:     names in the call (the first one is "you")
//   virtual:    render only the rows in view (like Meet's virtualised list), rowHeight 56 px, viewport 336 px
//   count:      show the headcount badge next to the People button (default true)
//   group:      put everyone after the first `hosts` people in a collapsed "Contributors" group
//   delegated:  handle the People button with a document-level listener (like Meet's jsaction), so a
//               click on a detached button does nothing
//   openDelay:  ms before the list renders after the People button is pressed (Meet animates the panel in)
//   selfScroll: with virtual, the role=list element itself is the scroll container (no wrapper)
function panelPage({ people, virtual = false, count = true, group = false, hosts = 1, delegated = false, openDelay = 0, selfScroll = false, extraBody = "" }) {
  const cfg = { people, virtual, group, hosts, delegated, openDelay, selfScroll };
  return `<body style="margin:0;background:#202124;height:100vh;font-family:Arial">
  <div data-participant-id="me"><span class="notranslate">${people[0]}</span><div data-self-name="${people[0]}"></div></div>
  <button aria-label="Leave call">call_end</button>
  <div id="toolbar"><button aria-label="People" id="pb">people</button>${count ? `<span id="cnt">${people.length}</span>` : ""}</div>
  <aside id="side" style="width:320px"></aside>
  ${extraBody}
  <script>
  (() => {
    const CFG = ${JSON.stringify(cfg)};
    window.PEOPLE = CFG.people.map((n, i) => i === 0 ? n + " (You)" : n);
    window.setCount = (n) => { const c = document.getElementById("cnt"); if (c) c.textContent = String(n); };
    const H = 56, VIEW = 336;
    let expanded = !CFG.group;
    const row = (n, top) => '<div role="listitem" aria-label="' + n + '" style="height:' + H + 'px' + (top != null ? ';position:absolute;left:0;right:0;top:' + top + 'px' : '') + '">' + n + '</div>';
    function rows() {
      if (!CFG.group) return PEOPLE.map((n) => ({ n }));
      const head = PEOPLE.slice(0, CFG.hosts).map((n) => ({ n }));
      const rest = PEOPLE.slice(CFG.hosts);
      return [...head, { header: true, n: "Contributors" }, ...(expanded ? rest.map((n) => ({ n })) : [])];
    }
    const html = (r, top) => r.header
      ? '<div role="button" aria-expanded="' + expanded + '" aria-label="Contributors" id="grp" style="height:' + H + 'px' + (top != null ? ';position:absolute;left:0;right:0;top:' + top + 'px' : '') + '">Contributors</div>'
      : row(r.n, top);
    function render() {
      const list = document.querySelector('#side [role="list"]'); if (!list) return;
      const all = rows();
      if (!CFG.virtual) { list.innerHTML = all.map((r) => html(r)).join(""); }
      else {
        const inner = CFG.selfScroll ? document.getElementById("inner") : list;
        inner.style.height = all.length * H + "px";
        const sc = document.getElementById("sc"), first = Math.floor(sc.scrollTop / H), last = Math.min(all.length, first + Math.ceil(VIEW / H) + 1);
        inner.innerHTML = all.slice(first, last).map((r, i) => html(r, (first + i) * H)).join("");
      }
      const g = document.getElementById("grp"); if (g) g.onclick = () => { expanded = !expanded; render(); };
    }
    window.renderPeople = render;
    function open() {
      const side = document.getElementById("side");
      if (CFG.virtual) {
        side.innerHTML = CFG.selfScroll
          ? '<div id="sc" role="list" aria-label="Participants" style="height:' + VIEW + 'px;overflow-y:auto"><div id="inner" style="position:relative"></div></div>'
          : '<div id="sc" style="height:' + VIEW + 'px;overflow-y:auto"><div role="list" aria-label="Participants" style="position:relative"></div></div>';
        const sc = document.getElementById("sc");
        const d = Object.getOwnPropertyDescriptor(Element.prototype, "scrollTop");
        Object.defineProperty(sc, "scrollTop", { get() { return d.get.call(this); }, set(v) { d.set.call(this, v); render(); } });
        sc.addEventListener("scroll", render);
      } else side.innerHTML = '<div role="list" aria-label="Participants"></div>';
      expanded = !CFG.group; render();
    }
    let pressed = false, timer = null;
    window.peopleToggles = 0;
    window.togglePeople = () => {
      window.peopleToggles++;
      pressed = !pressed; clearTimeout(timer);
      if (!pressed) { document.getElementById("side").replaceChildren(); return; }
      if (CFG.openDelay) timer = setTimeout(open, CFG.openDelay); else open();
    };
    if (CFG.delegated) document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("#pb")) window.togglePeople(); });
    else document.getElementById("pb").onclick = () => window.togglePeople();
  })();
  </script></body>`;
}

module.exports = { peopleNames, panelPage };
