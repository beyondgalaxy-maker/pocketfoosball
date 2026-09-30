import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require = createRequire(process.env.RUNNER_TEMP + '/miu-live/package.json');
const {chromium} = require('@playwright/test');
const base='https://beyondgalaxy-maker.github.io/pocketfoosball/makeituploadable/';
const expected=process.env.TARGET_TAG;
await mkdir('live-check',{recursive:true});
let manifest,lastError;
for(let attempt=0;attempt<40;attempt++){
  try{
    const response=await fetch(base+'release.json?check='+Date.now(),{signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw Error('Release metadata HTTP '+response.status);
    manifest=await response.json();
    if(expected&&!expected.endsWith('-')&&manifest.tag!==expected)throw Error('Waiting for this release to reach GitHub Pages.');
    if(Object.keys(manifest.assets||{}).length!==3)throw Error('Three desktop downloads were expected.');
    break;
  }catch(error){manifest=null;lastError=error.message;await new Promise(resolve=>setTimeout(resolve,12000));}
}
if(!manifest)throw Error(lastError||'The website did not finish publishing.');
const downloads=[];
for(const [platform,asset]of Object.entries(manifest.assets)){
  if(!asset.tested||!asset.url.startsWith('https://github.com/beyondgalaxy-maker/pocketfoosball/releases/download/'))throw Error('Unexpected installer link.');
  const response=await fetch(asset.url,{method:'HEAD',signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw Error(platform+' download HTTP '+response.status);
  const size=Number(response.headers.get('content-length'));
  if(size&&size!==asset.bytes)throw Error(platform+' published size mismatch.');
  downloads.push({platform,status:response.status,bytes:asset.bytes,url:asset.url});
}
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:980}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const response=await page.goto(base,{waitUntil:'networkidle'});
  if(!response.ok())throw Error('Homepage HTTP '+response.status());
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-build]')].length===3&&[...document.querySelectorAll('[data-build]')].every(a=>a.hasAttribute('href')&&!a.hasAttribute('aria-disabled')));
  await page.screenshot({path:'live-check/website.png',fullPage:true,animations:'disabled'});
  await page.goto(base+'app.html?test=1',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>typeof window.miuTest==='function');
  const checks=await page.evaluate(()=>window.miuTest());
  await page.screenshot({path:'live-check/workspace.png',animations:'disabled'});
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const text='BT /F1 24 Tf 60 700 Td (PDF preview check) Tj ET';
  objects.push('<< /Length '+text.length+' >>\nstream\n'+text+'\nendstream');
  let pdf='%PDF-1.4\n';const offsets=[0];
  objects.forEach((object,index)=>{offsets.push(Buffer.byteLength(pdf));pdf+=(index+1)+' 0 obj\n'+object+'\nendobj\n';});
  const xref=Buffer.byteLength(pdf);pdf+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
  await page.locator('#file-input').setInputFiles({name:'Preview check.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf)});
  await page.getByRole('button',{name:'Select Preview check.pdf',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#page-label').textContent==='Page 1 of 1'&&!document.querySelector('#canvas').hidden);
  await page.screenshot({path:'live-check/pdf-preview.png',animations:'disabled'});
  if(errors.length)throw Error(errors.join('\n'));
  const game=await fetch('https://beyondgalaxy-maker.github.io/pocketfoosball/');
  if(!game.ok)throw Error('The existing Pocket Foosball homepage is not reachable.');
  await writeFile('live-check/result.json',JSON.stringify({ok:true,website:base,tag:manifest.tag,downloads,checks:[...checks,'Three active installer links','Public PDF upload and preview','Existing game homepage HTTP 200'],errors},null,2));
}catch(error){await writeFile('live-check/error.txt',error.stack);throw error;}finally{await browser.close();}
