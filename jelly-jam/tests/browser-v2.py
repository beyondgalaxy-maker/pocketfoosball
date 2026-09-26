"""Browser interaction and native multitouch; no game state is modified by tests."""
from pathlib import Path
import json, os, shutil, subprocess, time
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/v2';OUT.mkdir(exist_ok=True)
URL=os.getenv('JELLY_TEST_URL');server=None
if os.getenv('JELLY_TEST_HTTP') and not URL:
 server=subprocess.Popen(['python3','-m','http.server','8798','--bind','127.0.0.1'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);URL='http://127.0.0.1:8798';time.sleep(.4)
checks=[];errors=[]
def check(name,condition):
 assert condition,name
 checks.append(name)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=shutil.which('chromium') or None,args=['--no-sandbox'],headless=True)
  def page_new(**kwargs):
   c=browser.new_context(**kwargs);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(URL) if URL else page.set_content((ROOT/'jelly-jam.html').read_text());return c,page
  c,page=page_new(viewport={'width':1440,'height':1000})
  check('Desktop auto hides touch controls',page.get_attribute('body','data-touch')=='off')
  page.select_option('#touchMode','on');page.click('#local')
  check('Start-screen toggle enables touch on desktop',page.locator('#touchControls').is_visible())
  page.click('#touchToggle');check('Header can hide controls',not page.locator('#touchControls').is_visible())
  before=page.evaluate('JellyJam.state.players.map(p=>p.x)');page.keyboard.down('KeyD');page.wait_for_timeout(350);page.keyboard.up('KeyD');after=page.evaluate('JellyJam.state.players.map(p=>p.x)')
  check('Independent keyboard movement',after[0]>before[0]+40 and after[1]==before[1])
  page.click('#levels');check('Four chapter tabs',page.locator('[data-chapter]').count()==4)
  all_ids=[]
  for chapter in range(4):
   page.click(f'[data-chapter="{chapter}"]');all_ids+=page.locator('[data-level]').evaluate_all('(els)=>els.map(e=>Number(e.dataset.level))')
  check('40 distinct selectable levels',len(set(all_ids))==40)
  page.screenshot(path=str(OUT/'map-expert.png'));page.click('[data-level="39"]');page.click('#playSelected');check('Atlas starts selected level',page.evaluate('JellyJam.state.level')==39)
  page.click('#hint');page.click('#revealSolution');check('Two-stage in-level hints',len(page.inner_text('#solutionText'))>50);page.click('#hintBack')
  page.click('#restart');check('Restart preserves selected stage',page.evaluate('JellyJam.state.level')==39)
  page.click('#levels');page.click('[data-chapter="1"]');page.click('[data-level="16"]');page.click('#playSelected')
  page.keyboard.down('KeyD');page.wait_for_timeout(550);page.keyboard.up('KeyD');check('Crystal unlocks dash through gameplay',page.evaluate('JellyJam.state.players[0].dashUnlocked'))
  page.keyboard.down('KeyW');page.wait_for_timeout(190);x=page.evaluate('JellyJam.state.players[0].x');page.keyboard.down('KeyD');page.keyboard.press('KeyS');page.wait_for_timeout(130);page.keyboard.up('KeyD');page.keyboard.up('KeyW');check('Keyboard dash moves quickly',page.evaluate('JellyJam.state.players[0].x')>x+70)
  # Shared death in the actual browser: deliberately walk into the dash-school gap.
  page.click('#restart');page.keyboard.down('KeyD');page.wait_for_timeout(1700);page.keyboard.up('KeyD');page.wait_for_timeout(1100)
  check('Death restarts both in browser',page.evaluate('JellyJam.state.rescues>=1 && !JellyJam.state.stars.some(Boolean) && JellyJam.state.players[1].x===115'))
  page.click('#pause');t=page.evaluate('JellyJam.state.t');page.wait_for_timeout(220);check('Pause stops simulation',page.evaluate('JellyJam.state.t')==t);page.click('#resume')
  page.click('#brand');page.click('#leave');page.click('#solo');page.keyboard.press('Tab');check('Solo can switch', 'Mint selected' in page.inner_text('#peachKeys'))
  # Native simultaneous movement and jump touches, at narrow portrait and landscape sizes.
  for width,height in [(390,844),(844,390)]:
   context,m=page_new(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,device_scale_factor=1)
   m.click('#local');m.wait_for_timeout(150)
   check(f'Mobile {width} auto touch',m.locator('#touchControls').is_visible())
   check(f'Mobile {width} no horizontal overflow',m.evaluate('document.documentElement.scrollWidth <= innerWidth'))
   for who in [0,1]:
    b=m.locator(f'[data-p="{who}"][data-key="right"]').bounding_box();check(f'{width} player {who} reachable touch button',b['width']>=38 and b['y']>=0 and b['y']+b['height']<=height)
   cdp=context.new_cdp_session(m);points=[]
   for who,key in [(0,'right'),(1,'right'),(0,'jump'),(1,'jump')]:
    box=m.locator(f'[data-p="{who}"][data-key="{key}"]').bounding_box();points.append({'x':box['x']+box['width']/2,'y':box['y']+box['height']/2,'id':len(points)+1})
   before=m.evaluate('JellyJam.state.players.map(p=>p.x)');cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':points});m.wait_for_timeout(230)
   result=m.evaluate('JellyJam.state.players.map(p=>({x:p.x,y:p.y}))');check(f'{width} native four-touch movement and jump',all(q['x']>before[i]+25 and q['y']<520 for i,q in enumerate(result)))
   cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});m.wait_for_timeout(220);stopped=m.evaluate('JellyJam.state.players.map(p=>p.x)');m.wait_for_timeout(220);check(f'{width} pointer cancellation clears held input',stopped==m.evaluate('JellyJam.state.players.map(p=>p.x)'))
   m.screenshot(path=str(OUT/f'mobile-{width}.png'));context.close()
  page.click('#brand');page.click('#leave');page.click('#online');page.fill('#roomInput','BAD');page.click('#joinForm button');check('Invalid room code is explained','8-character' in page.inner_text('#roomError'))
  check('No browser exceptions',not errors)
  report={'passed':True,'checks':checks,'page_errors':errors};(OUT/'browser-results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report));browser.close()
finally:
 if server:server.terminate();server.wait()
