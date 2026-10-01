/* global PEOPLE */ // defined by the mock page's inline script
const assert = require('assert');
const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:820}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.setContent(`<body style="margin:0;background:#202124;height:100vh;font-family:Arial">
 <div id="tiles" style="display:flex;gap:8px;padding:20px">
  <div data-participant-id="a" style="width:200px;height:120px;background:#3c4043;color:#fff"><span class="notranslate">Rutvik Bharat</span><div data-self-name="Rutvik Bharat"></div></div>
  <div data-participant-id="b" style="width:200px;height:120px;background:#3c4043;color:#fff"><span class="notranslate">Asha Rao</span></div>
 </div>
 <div style="position:fixed;bottom:20px;right:20px"><button data-panel-id="1" aria-label="People">people</button><span id="cnt">5</span></div>
 <div id="side"></div>
 <script>
  window.PEOPLE=['Rutvik Bharat (You)','Asha Rao','Vikram Singh','Priya Nair','Karthik M'];
  document.querySelector('[data-panel-id="1"]').onclick=()=>{const s=document.getElementById('side'); if(s.innerHTML){s.innerHTML='';return;}
   s.innerHTML='<div role="list" aria-label="Participants">'+PEOPLE.map(n=>'<div role="listitem" aria-label="'+n+'">'+n+'</div>').join('')+'</div>';};
 </script></body>`);
 await p.addScriptTag({path:require('path').join(__dirname,'../extension/content.js')});
 await p.waitForTimeout(8000);
 await p.evaluate(()=>{const r=document.getElementById('meet-spark-host').shadowRoot; r.querySelector('#launcher').click(); r.querySelector('[data-v=people]').click();});
 // someone joins
 await p.evaluate(()=>{PEOPLE.push('Meera Iyer'); document.getElementById('cnt').textContent='6';});
 await p.waitForTimeout(12000);
 const names=await p.evaluate(()=>[...document.getElementById('meet-spark-host').shadowRoot.querySelectorAll('.person .nm')].map(e=>e.textContent));
 assert.deepStrictEqual(names,['Asha Rao','Karthik M','Meera Iyer','Priya Nair','Rutvik Bharat','Vikram Singh']); console.log('roster',names, 'side panel left open?', await p.evaluate(()=>!!document.getElementById('side').innerHTML));
 await p.evaluate(()=>document.getElementById('meet-spark-host').shadowRoot.querySelector('#pickBtn').click());
 await p.waitForTimeout(2500); await p.screenshot({path:'/tmp/meet-spark-s1.png'});
 for (const v of ['ice','wyr','bingo']) {
   await p.evaluate(v=>{const r=document.getElementById('meet-spark-host').shadowRoot; r.querySelector('.nav [data-v='+v+']').click();
     if(v=='ice'){r.querySelector('#iceNext').click(); r.querySelector('#iceAsk').click();}
     if(v=='wyr') r.querySelector('#wyrNext').click();
     if(v=='bingo') [0,6,18,24,3].forEach(i=>r.querySelectorAll('.cell')[i].click());},v);
   await p.waitForTimeout(300); await p.screenshot({path:`/tmp/meet-spark-s_${v}.png`, clip:{x:880,y:0,width:400,height:760}});
 }
 assert.deepStrictEqual(errs,[]); console.log('PASS roster-sync'); await b.close();})();
