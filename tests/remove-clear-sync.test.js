const assert = require('assert');
const { chromium } = require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:820}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.route('**/*googleusercontent.com/**', r=>r.fulfill({status:200, contentType:'image/png', body:''}));
 const row=n=>`<div class="r"><img src="https://lh3.googleusercontent.com/a/x" width="32" height="32"><div><div>${n}</div><div>Meeting host</div></div></div>`;
 await p.setContent(`<body style="background:#202124"><button aria-label="Leave call">call_end</button><button aria-label="Let participants send messages" onclick="window.bad=1">x</button>
  <section id="pp" style="background:#fff;width:300px"><h2>People</h2><div>In the meeting</div>${['Rutvik Bharat (You)','Asha Rao','Vikram Singh','Priya Nair'].map(row).join('')}</section></body>`);
 await p.addScriptTag({path:require('path').join(__dirname,'../extension/content.js')});
 const R=f=>p.evaluate(f);
 const names=()=>R(()=>[...document.getElementById('meet-spark-host').shadowRoot.querySelectorAll('.person .nm')].map(e=>e.textContent));
 await p.waitForTimeout(3000);
 console.log('passive:', await names());
 // Vikram leaves, then user taps sync
 await R(()=>{document.querySelectorAll('.r')[2].remove(); const r=document.getElementById('meet-spark-host').shadowRoot; r.querySelector('#launcher').click(); r.querySelector('.nav [data-v=people]').click(); r.querySelector('#syncBtn').click();});
 await p.waitForTimeout(500); assert.deepStrictEqual(await names(),['Asha Rao','Priya Nair','Rutvik Bharat']);
 await R(()=>{const r=document.getElementById('meet-spark-host').shadowRoot; r.querySelector('#addName').value='Guest One'; r.querySelector('#addBtn').click(); r.querySelector('.person[data-n="Asha Rao"] .rm').click();});
 await p.waitForTimeout(3000); assert.deepStrictEqual(await names(),['Guest One','Priya Nair','Rutvik Bharat']);
 await p.evaluate(()=>{const r=document.getElementById('meet-spark-host').shadowRoot; r.querySelector('.person:last-child').dispatchEvent(new MouseEvent('mouseover'));});
 await p.screenshot({path:'/tmp/meet-spark-s8.png', clip:{x:880,y:0,width:400,height:820}});
 await R(()=>document.getElementById('meet-spark-host').shadowRoot.querySelector('#clearAll').click());
 await p.waitForTimeout(200); assert.deepStrictEqual(await names(),[]);
 await p.waitForTimeout(3000); assert.deepStrictEqual(await names(),[]);
 await R(()=>document.getElementById('meet-spark-host').shadowRoot.querySelector('#syncBtn').click());
 await p.waitForTimeout(300); assert.deepStrictEqual(await names(),['Asha Rao','Priya Nair','Rutvik Bharat']); assert.strictEqual(await R(()=>window.bad||0),0); assert.deepStrictEqual(errs,[]); console.log('PASS remove-clear-sync');
 await b.close();})();
