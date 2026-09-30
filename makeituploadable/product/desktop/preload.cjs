const{contextBridge,ipcRenderer,webUtils}=require('electron');
contextBridge.exposeInMainWorld('miuDesktop',{
 importFile:async file=>{const path=webUtils.getPathForFile(file);return path?ipcRenderer.invoke('import-path',path):ipcRenderer.invoke('import-bytes',new Uint8Array(await file.arrayBuffer()),file.name);},
 media:(token,settings)=>ipcRenderer.invoke('media',token,JSON.parse(JSON.stringify(settings))),
 printPDF:html=>ipcRenderer.invoke('print-pdf',String(html)),
 save:(bytes,name)=>ipcRenderer.invoke('save',bytes,String(name)),
 cancel:()=>ipcRenderer.invoke('cancel')
});
