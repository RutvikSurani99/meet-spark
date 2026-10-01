const assert = require('assert');
const { chromium } = require('playwright');
(async()=>{
 for (const csp of ["require-trusted-types-for 'script'", "require-trusted-types-for 'script'; trusted-types goog#html"]) {
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:820}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.route('https://meet.google.com/**', r=>r.fulfill({contentType:'text/html', headers:{'content-security-policy':csp}, body:'<body style="background:#202124;height:100vh"></body>'}));
 await p.goto('https://meet.google.com/abc-defg-hij');
 let res; try { await p.evaluate(require('fs').readFileSync(require('path').join(__dirname,'../extension/content.js'),'utf8'));
 res=await p.evaluate(async()=>{const r=document.getElementById('meet-spark-host').shadowRoot; r.querySelector('#launcher').click();
   r.querySelector('.nav [data-v=bingo]').click(); r.querySelectorAll('.cell')[0].click(); r.querySelector('.nav [data-v=people]').click();
   r.querySelector('#addName').value='Asha'; r.querySelector('#addBtn').click();
   return {cells:r.querySelectorAll('.cell').length, people:[...r.querySelectorAll('.person .nm')].map(e=>e.textContent), open:r.querySelector('#panel').classList.contains('open')};});
 } catch(e){res='FAIL '+e.message.slice(0,150)}
 assert.deepStrictEqual(res,{cells:25,people:['Asha'],open:true},csp); console.log('PASS trusted-types:',csp);
  await b.close(); }})();
