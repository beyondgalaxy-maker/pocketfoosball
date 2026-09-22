/* Pocket Foosball input: saved physical-key bindings and original pointer intent.
 * The small adapter translates configured keys into the app's stable action
 * codes. It does not change rod motors, touch sensitivity, or shot timing.
 */
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else {root.TouchlineInput=api;api.install();}
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const DEFAULTS=Object.freeze({move:.23,boost:.85,power:.85,turn:1,slide:1});
  const STORAGE='touchline.bindings.v9';
  const ROWS=[{rod:0,name:'Keeper',up:'KeyQ',down:'KeyA',shoot:'KeyZ',select:'Digit1'},
    {rod:1,name:'Defense',up:'KeyW',down:'KeyS',shoot:'KeyX',select:'Digit2'},
    {rod:3,name:'Midfield',up:'KeyE',down:'KeyD',shoot:'KeyC',select:'Digit3'},
    {rod:5,name:'Attack',up:'KeyR',down:'KeyF',shoot:'KeyV',select:'Digit4'}];
  const definitions=[];
  for(const row of ROWS)for(const action of ['up','down','shoot','select'])
    definitions.push({id:row.rod+'.'+action,code:row[action],label:row.name+' '+action,group:'rows'});
  const extra=[
    ['boost','ShiftLeft','Fast slide'],['boostRight','ShiftRight','Fast slide · alternate'],['boostSpace','Space','Fast slide · second alternate'],
    ['soft','AltLeft','Soft-pass modifier'],['softRight','AltRight','Soft pass · alternate'],
    ['pin','KeyG','Mint pin / release'],['raise','KeyB','Mint raise / lower'],['pause','KeyP','Pause'],
    ['selectedUp','ArrowUp','Selected row · up'],['selectedDown','ArrowDown','Selected row · down'],
    ['selectedForward','ArrowLeft','Selected row · rotate forward'],['selectedBack','ArrowRight','Selected row · rotate back'],
    ['selectedShoot','Enter','Selected row · shoot'],['coralPin','Slash','Coral pin / release'],['rollover','Period','Selected row · rollover'],
    ['coralKeeper','Digit7','Select Coral keeper'],['coralDefense','Digit8','Select Coral defense'],
    ['coralMidfield','Digit9','Select Coral midfield'],['coralAttack','Digit0','Select Coral attack']
  ];
  for(const [id,code,label]of extra)definitions.push({id,code,label,group:'other'});
  definitions.forEach(Object.freeze);Object.freeze(definitions);
  const byId=new Map(definitions.map(d=>[d.id,d]));
  const canonical=new Set(definitions.map(d=>d.code));
  const symbols={Space:'Space',ShiftLeft:'L Shift',ShiftRight:'R Shift',AltLeft:'L Alt',AltRight:'R Alt',
    ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',Enter:'Enter',Minus:'−',Equal:'=',BracketLeft:'[',BracketRight:']',
    Backslash:'\\',Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/',Backquote:'`'};
  function label(code){if(!code)return '—';return symbols[code]||code.replace(/^Key/,'').replace(/^Digit/,'').replace(/^Numpad/,'Num ');}
  function validCode(code){return typeof code==='string'&&/^(Key[A-Z]|Digit[0-9]|Numpad(?:[0-9]|Add|Subtract|Multiply|Divide|Decimal|Enter)|Arrow(?:Up|Down|Left|Right)|Shift(?:Left|Right)|Alt(?:Left|Right)|Space|Enter|Insert|Home|End|PageUp|PageDown|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Comma|Period|Slash|Backquote)$/.test(code);}
  function eventCode(event){
    if(event.code&&event.code!=='Unidentified')return event.code;
    if(/^[a-z]$/i.test(event.key||''))return 'Key'+event.key.toUpperCase();
    if(/^[0-9]$/.test(event.key||''))return 'Digit'+event.key;
    if(event.key===' ')return 'Space';
    return event.key||'';
  }
  function eventLabel(event,code){
    // Keep the printed letter for AZERTY/Dvorak, but store its physical code.
    return code.startsWith('Key')&&event.key?.length===1?event.key.toUpperCase():label(code);
  }
  class BindingStore {
    constructor(storage){this.storage=storage;this.map={};this.reset(false);this.load();}
    reset(save=true){this.map=Object.fromEntries(definitions.map(d=>[d.id,{code:d.code,label:label(d.code)}]));return save?this.save():true;}
    load(){
      try {
        const data=JSON.parse(this.storage?.getItem(STORAGE)||'null');
        if(!data||data.version!==1||!data.bindings)return;
        const next={};const used=new Set();
        // Validate the entire snapshot; never accept duplicate actions after corruption.
        for(const def of definitions){
          const item=data.bindings[def.id];
          if(!item||!(item.code===null||validCode(item.code))||item.code&&used.has(item.code))return;
          if(item.code)used.add(item.code);
          next[def.id]={code:item.code,label:typeof item.label==='string'&&item.label.length<=16?item.label:label(item.code)};
        }
        this.map=next;
      }catch(error){/* Storage denied or malformed: safe defaults, never a broken game. */}
    }
    save(){try{if(!this.storage)return false;this.storage.setItem(STORAGE,JSON.stringify({version:1,bindings:this.map}));return true;}catch(error){return false;}}
    get(id){const value=this.map[id];return value?{...value}:null;}
    resolve(code){const d=definitions.find(d=>this.map[d.id].code===code);return d||null;}
    assign(id,code,display){
      if(!byId.has(id))return {ok:false,message:'Unknown action.'};
      if(code!==null&&!validCode(code))return {ok:false,message:'Use a letter, number, arrow, modifier, or punctuation key. Escape and Tab stay available for navigation.'};
      const other=code&&this.resolve(code);
      if(other&&other.id!==id)return {ok:false,conflict:other.id,message:label(code)+' is already assigned to '+other.label+'. Clear that binding first.'};
      this.map[id]={code,label:code?(String(display||label(code)).slice(0,16)):'—'};
      return {ok:true,saved:this.save()};
    }
    snapshot(){return JSON.parse(JSON.stringify(this.map));}
  }
  let storage;try{storage=root.localStorage;}catch(error){}
  const bindings=new BindingStore(storage);
  const ROW_KEYS=Object.freeze(ROWS.map(row=>Object.freeze({rod:row.rod,up:row.up,down:row.down,shoot:row.shoot,
    get label(){return bindings.get(row.rod+'.up').label+' / '+bindings.get(row.rod+'.down').label+' · '+bindings.get(row.rod+'.shoot').label;}})));
  class StrokeIntent {
    constructor(v=0,t=0){this.samples=[{v,t}];this.lastMovement=t;this.lastTurn=v;this.lastWhip=-Infinity;this.whipDirection=0;}
    add(v,t){const old=this.samples[this.samples.length-1];t=Math.max(old.t,Number.isFinite(t)?t:old.t);const delta=v-this.lastTurn;
      if(Math.abs(delta)>.3)this.lastMovement=t;
      if(this.whipDirection&&delta*this.whipDirection<-1)this.lastWhip=-Infinity;
      this.lastTurn=v;if(t===old.t)old.v=v;else this.samples.push({v,t});
      while(this.samples.length>2&&this.samples[1].t<t-110)this.samples.shift();
      let first=this.samples[0],last=this.samples[this.samples.length-1];const cutoff=t-100;
      if(first.t<cutoff&&this.samples.length>1){const next=this.samples[1],f=clamp((cutoff-first.t)/(next.t-first.t||1),0,1);first={t:cutoff,v:first.v+(next.v-first.v)*f};}
      const duration=last.t-first.t,distance=last.v-first.v;
      if(duration>=12&&Math.abs(distance)>=36&&Math.abs(distance)/duration>=.8&&delta*distance>0){this.lastWhip=t;this.whipDirection=Math.sign(distance);}
      return this;
    }
    fastRelease(t){return t-this.lastWhip<=150&&t-this.lastMovement<=150;}
  }
  function readPreferences(storage){try{const p=JSON.parse(storage.getItem('touchline.controls.v6')||'{}');return {
    move:clamp(Number(p.move)||DEFAULTS.move,.08,.65),boost:clamp(Number(p.boost)||DEFAULTS.boost,.3,1.6),
    power:clamp(Number(p.power)||DEFAULTS.power,.25,1),turn:clamp(Number(p.turn)||DEFAULTS.turn,.55,1.6),slide:clamp(Number(p.slide)||DEFAULTS.slide,.55,1.6)
  };}catch(error){return {...DEFAULTS};}}
  const emitted=new WeakSet(),routes=new Map(),physical=new Set();let capture=null,installed=false,renderUI=()=>{};
  function emit(type,code,source,target){
    const alt=[...physical].some(k=>bindings.resolve(k)?.code.startsWith('Alt'));
    const shift=[...physical].some(k=>bindings.resolve(k)?.code.startsWith('Shift'));
    const e=new root.KeyboardEvent(type,{code,key:source?.key||label(code),bubbles:true,cancelable:true,repeat:!!source?.repeat,altKey:alt,shiftKey:shift});
    emitted.add(e);(target||root.document).dispatchEvent(e);
  }
  function releaseAll(){for(const logical of routes.values())emit('keyup',logical);routes.clear();physical.clear();}
  function status(text,error=false){const e=root.document?.getElementById('bindingStatus');if(e){e.textContent=text;e.dataset.error=String(error);}}
  function cancelCapture(){capture=null;renderUI();}
  function beginCapture(id){releaseAll();capture=id;renderUI();status('Press a key for '+byId.get(id).label+'. Escape cancels; Backspace clears this binding.');}
  function active(){const g=root.touchline;return !!g&&!root.document.body.classList.contains('menu-open')&&!root.document.getElementById('guideDialog')?.open;}
  function onDown(e){
    if(emitted.has(e)||e.isComposing)return;
    const code=eventCode(e);
    if(capture){
      if(code==='Tab'){cancelCapture();return;}
      e.preventDefault();e.stopImmediatePropagation();
      if(e.repeat)return;
      if(code==='Escape'){cancelCapture();status('No changes made.');return;}
      if(e.ctrlKey||e.metaKey){status('Browser shortcuts are reserved. Press one unmodified key.',true);return;}
      const id=capture,result=bindings.assign(id,code==='Backspace'||code==='Delete'?null:code,eventLabel(e,code));
      if(result.ok){cancelCapture();status(byId.get(id).label+' updated. '+(result.saved?'Saved on this browser.':'Storage is unavailable; kept for this tab only.'));}
      else status(result.message,true);
      return;
    }
    if(e.ctrlKey||e.metaKey)return;
    if(!active()||/^(INPUT|SELECT|TEXTAREA)$/.test(e.target?.tagName)||e.target?.isContentEditable)return;
    physical.add(code);
    const definition=bindings.resolve(code);
    if(!definition){if(canonical.has(code)){e.preventDefault();e.stopImmediatePropagation();}return;}
    if(definition.code==='Enter'&&e.target?.tagName==='BUTTON'&&!e.target.classList.contains('dock-pad'))return;
    e.preventDefault();e.stopImmediatePropagation();
    const logical=routes.get(code)||definition.code;routes.set(code,logical);
    emit('keydown',logical,e,e.target);
  }
  function onUp(e){
    if(emitted.has(e))return;
    const code=eventCode(e);physical.delete(code);
    const logical=routes.get(code);
    if(logical){routes.delete(code);e.preventDefault();e.stopImmediatePropagation();emit('keyup',logical,e,e.target);}
    else if(capture){e.preventDefault();e.stopImmediatePropagation();}
  }
  function mount(){
    const doc=root.document,section=doc.querySelector('.keyboard-settings');if(!section)return;
    const old=section.querySelector('.keymap');if(!old)return;
    section.querySelector('summary').textContent='Keyboard · remap keys & sensitivity';
    const panel=doc.createElement('div');panel.id='bindingEditor';
    panel.innerHTML='<p class="binding-intro">Click a key, then press its replacement. Mouse and touch keep working.</p><div class="binding-rows" role="group" aria-label="Mint row keybindings"></div><details class="binding-other"><summary>Selection, modifiers & second player</summary><div class="binding-extras"></div></details><div class="binding-footer"><button type="button" id="resetBindings">Restore default keys</button><button type="button" id="cancelBinding" hidden>Cancel</button></div><p id="bindingStatus" role="status" aria-live="polite">Saved on this browser. Escape cancels; Backspace clears a selected binding.</p>';
    old.replaceWith(panel);
    const grid=panel.querySelector('.binding-rows');
    for(const title of ['Your row','Up','Down','Shoot']){const h=doc.createElement('b');h.className='binding-heading';h.textContent=title;grid.appendChild(h);}
    const makeButton=(id)=>{const button=doc.createElement('button');button.type='button';button.className='binding-key';button.dataset.binding=id;button.onclick=()=>beginCapture(id);return button;};
    for(const row of ROWS){const name=doc.createElement('span');name.className='binding-row-name';name.textContent=row.name;grid.appendChild(name);for(const action of ['up','down','shoot'])grid.appendChild(makeButton(row.rod+'.'+action));}
    const extraGrid=panel.querySelector('.binding-extras');
    for(const definition of definitions.filter(d=>d.group==='other'||d.id.endsWith('.select'))){const text=doc.createElement('span');text.textContent=definition.label;extraGrid.append(text,makeButton(definition.id));}
    panel.querySelector('#resetBindings').onclick=()=>{releaseAll();const saved=bindings.reset();cancelCapture();status(saved?'Default keys restored and saved.':'Default keys restored for this tab.');};
    panel.querySelector('#cancelBinding').onclick=()=>{cancelCapture();status('No changes made.');};
    const paragraphs=[...section.children].filter(e=>e.tagName==='P');
    if(paragraphs[0])paragraphs[0].textContent='The first two keys slide each row along the rod; the third shoots. Movement directions follow the table, including portrait mode. Change speeds below independently of your key layout.';
    if(paragraphs[1])paragraphs[1].textContent='The extra bindings control row selection, fast sliding, soft passes, pin/release, raising, and Coral’s selected row. Escape always opens the menu; Tab remains available for navigation.';
    renderUI=()=>{
      for(const button of panel.querySelectorAll('[data-binding]')){const id=button.dataset.binding,item=bindings.get(id),waiting=capture===id;button.textContent=waiting?'…':item.label;button.classList.toggle('listening',waiting);button.setAttribute('aria-pressed',String(waiting));button.setAttribute('aria-label',byId.get(id).label+': '+(item.code?item.label:'unassigned')+'. Click to rebind.');button.title=item.code||'Unassigned';}
      panel.querySelector('#cancelBinding').hidden=!capture;
      const help=[...doc.querySelectorAll('#guideDialog .guide-grid section')].find(e=>e.querySelector('h3')?.textContent.includes('Keyboard'));
      if(help){const ps=help.querySelectorAll('p');if(ps[0])ps[0].textContent='Keyboard and mouse work together. Your row keys: '+ROWS.map(r=>r.name+' '+ROW_KEYS.find(k=>k.rod===r.rod).label).join('; ')+'. Rebind them in Menu → Controls → Keyboard. Fine speed, fast speed, and shot power have separate sliders.';if(ps[1])ps[1].textContent='All selection, rotation, pin, raise, boost, soft-pass, and second-player keys appear in the same editor. A mouse-held rod has priority over its keys. Slow manual positioning keeps its angle; only a fast released whip asks for auto-ready.';}
    };
    renderUI();
    const style=doc.createElement('style');style.id='bindingStyles';style.textContent=`
      .binding-intro{color:var(--muted,#acb7b3);font-size:12px;line-height:1.6;margin:12px 0}
      .binding-rows{display:grid;grid-template-columns:minmax(76px,1.4fr) repeat(3,minmax(44px,1fr));gap:7px;align-items:center}
      .binding-heading{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#a7b8b2;font-weight:500}
      .binding-row-name{font-size:12px;color:#e5eee7}.binding-key{min-height:40px;min-width:0;border:1px solid #465951;border-radius:9px;background:#263831;color:#e5f5ec;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;overflow-wrap:anywhere;padding:5px}
      .binding-key:hover,.binding-key:focus-visible{border-color:#a1e3bf;outline:2px solid #a1e3bf;outline-offset:1px}.binding-key.listening{background:#9cdfbc;color:#10201a;outline:2px solid #e0fce9}
      .binding-other{margin-top:14px;border-top:1px solid #3b4c44;padding-top:12px}.binding-other>summary{font-size:12px;cursor:pointer;color:#d2dfd8}
      .binding-extras{display:grid;grid-template-columns:minmax(0,1fr) 95px;gap:7px;align-items:center;padding:12px 0;font-size:12px;color:#c3d1c9}
      .binding-footer{display:flex;gap:8px;align-items:center;margin-top:14px;flex-wrap:wrap}.binding-footer button{font:inherit;font-size:11px;padding:9px 12px;border:1px solid #536259;border-radius:8px;background:transparent;color:#d8e4dc;cursor:pointer}
      #bindingStatus{font-size:11px!important;line-height:1.6;color:#b9cdbf;min-height:35px;margin:10px 0}#bindingStatus[data-error=true]{color:#ffb3a7}
      @media(max-width:380px){.binding-rows{grid-template-columns:minmax(63px,1.2fr) repeat(3,minmax(38px,1fr));gap:5px}.binding-key{min-height:42px;font-size:11px}.binding-row-name{font-size:11px}}
    `;doc.head.appendChild(style);
    // Keep the release label accurate without requiring a second HTML entrypoint.
    doc.title='Pocket Foosball — Touchline 09';
    for(const e of doc.querySelectorAll('.top-title,.menu-edition,.edition'))e.innerHTML=e.innerHTML.replace(/\b08\b/g,'09');
    root.touchline&&(root.touchline.bindings={get:()=>bindings.snapshot(),begin:beginCapture,cancel:cancelCapture,releaseAll});
    new MutationObserver(()=>{if(capture&&doc.querySelector('#panel-controls')?.hidden){cancelCapture();releaseAll();}}).observe(doc.body,{attributes:true,attributeFilter:['class']});
  }
  function install(){
    if(installed||!root.document)return false;installed=true;
    root.addEventListener('keydown',onDown,{capture:true});root.addEventListener('keyup',onUp,{capture:true});
    root.addEventListener('pointerdown',e=>{if(capture&&!root.document.getElementById('bindingEditor')?.contains(e.target)){cancelCapture();status('No changes made.');}},{capture:true});
    root.addEventListener('blur',()=>{releaseAll();cancelCapture();});
    root.document.addEventListener('visibilitychange',()=>{if(root.document.hidden){releaseAll();cancelCapture();}});
    if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
    return true;
  }
  return {ROW_KEYS,DEFAULTS,StrokeIntent,readPreferences,BindingStore,bindings,definitions,validCode,eventCode,label,install,STORAGE};
});
