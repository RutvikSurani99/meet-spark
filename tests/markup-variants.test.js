const assert = require('assert');
const { chromium } = require('playwright');
const variants = {
 A: `<div><button aria-label="Show everyone"><i>people</i></button><div class="badge">4</div></div>`,
 B: `<div><button data-tooltip="People"><i class="google-symbols">people</i></button><div>4</div></div>`,
};
(async()=>{
 for (const [k,btn] of Object.entries(variants)) for (const rowStyle of ['aria','text']) {
 const b=await chromium.launch(); const p=await b.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 const body=`<body style="background:#202124;height:100vh">
  <div data-participant-id="x1"><div class="notranslate">Rutvik Bharat</div></div>
  <div style="position:fixed;bottom:10px;right:10px">${btn}<button aria-label="Leave call"><i>call_end</i></button></div>
  <aside id="side"></aside>
  <script>
   const pol=trustedTypes.createPolicy('goog#html',{createHTML:x=>x}); const P=['Rutvik Bharat (You)','Asha Rao','Vikram Singh','Priya Nair'];
   const pb=document.querySelector('button'); pb.addEventListener('click',()=>{const s=document.getElementById('side');
    if(s.childElementCount){s.replaceChildren();return;}
    s.innerHTML=pol.createHTML('<h2>People</h2><div role="list">'+P.map(n=>${rowStyle==='aria'?`'<div role="listitem" aria-label="'+n+'"><span>'+n+'</span><i>mic_off</i></div>'`:`'<div role="listitem"><img><div><span class="notranslate">'+n+'</span></div><i>more_vert</i></div>'`}).join('')+'</div>');});
  </script></body>`;
 await p.route('https://meet.google.com/**', r=>r.fulfill({contentType:'text/html', headers:{'content-security-policy':"require-trusted-types-for 'script'; trusted-types goog#html"}, body}));
 await p.goto('https://meet.google.com/abc-defg-hij');
 // inline <script> blocked by TT? no, TT doesn't block inline scripts; fine
 await p.evaluate(require('fs').readFileSync(require('path').join(__dirname,'../extension/content.js'),'utf8'));
 await p.waitForTimeout(9000);
 const names=await p.evaluate(()=>[...document.getElementById('meet-spark-host').shadowRoot.querySelectorAll('.person .nm')].map(e=>e.textContent));
 assert.deepStrictEqual(names,['Asha Rao','Priya Nair','Rutvik Bharat','Vikram Singh']); assert.strictEqual(errs.length,0); console.log(k,rowStyle,names,'panelLeftOpen',await p.evaluate(()=>document.getElementById('side').childElementCount>0),errs);
 await b.close(); } console.log('PASS markup-variants'); })();
