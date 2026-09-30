import './interactions.css';
// Shared browser and desktop controls avoid unsupported browser prompt dialogs.
const get = id => document.getElementById(id);
const result = get('result');
const actionBar = document.querySelector('.batchbar');
const quickSave = document.createElement('button');
quickSave.id = 'quick-save';
quickSave.className = 'button primary';
quickSave.textContent = 'Save file ↓';
quickSave.hidden = true;
quickSave.addEventListener('click', () => get('save').click());
actionBar.append(quickSave);
function syncActions() {
  const working = !get('stop').hidden;
  quickSave.hidden = result.hidden || working;
  get('make').classList.toggle('primary', quickSave.hidden);
  get('make').classList.toggle('secondary', !quickSave.hidden);
  for (const id of ['add','browse','folder','all','clear','zip','combine','apply-rules','save-recipe','rules','recipes']) get(id).disabled = working;
}
new MutationObserver(syncActions).observe(result, {attributes:true, attributeFilter:['hidden']});
new MutationObserver(syncActions).observe(get('stop'), {attributes:true, attributeFilter:['hidden']});
syncActions();
get('save-recipe').addEventListener('click', event => {
  event.preventDefault(); event.stopImmediatePropagation();
  if (!get('rules').value.trim()) { get('rules-note').textContent = 'Type the requirements first, then save them.'; get('rules').focus(); return; }
  const dialog = get('modal'), body = get('modal-body');
  get('modal-title').textContent = 'Remember these rules';
  body.innerHTML = '<form id="recipe-form"><label>Name these rules<input id="recipe-title" maxlength="70" placeholder="For example: My job application" required autofocus></label><p class="help" style="margin-top:12px">Only the instructions are saved on this device, never your files.</p><div class="dialog-actions"><button type="button" id="recipe-cancel" class="button secondary">Cancel</button><button class="button primary" type="submit">Save rules</button></div></form>';
  if (!dialog.open) dialog.showModal();
  body.querySelector('#recipe-title').focus();
  body.querySelector('#recipe-cancel').onclick = () => dialog.close();
  body.querySelector('form').onsubmit = event => {
    event.preventDefault();
    try {
      let entries = JSON.parse(localStorage.getItem('miu-recipes') || '[]');
      if (!Array.isArray(entries)) entries = [];
      entries.push({name:body.querySelector('#recipe-title').value.trim(), text:get('rules').value.slice(0,1500)});
      entries = entries.slice(-20);
      localStorage.setItem('miu-recipes', JSON.stringify(entries));
      const select = get('recipes'); select.replaceChildren(new Option('Saved rules',''));
      entries.forEach((entry,index) => select.append(new Option(entry.name,String(index))));
      dialog.close(); get('rules-note').textContent = 'Rules saved. Choose them from Saved rules next time.';
    } catch { get('rules-note').textContent = 'This device did not allow saving these rules.'; dialog.close(); }
  };
}, true);
