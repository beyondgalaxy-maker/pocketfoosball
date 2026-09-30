export const MAX_PIXELS=32000000, MAX_ARCHIVE=120000000;
export const sizeText=n=>n<1000?`${n} B`:n<1000000?`${(n/1000).toFixed(1)} KB`:`${(n/1000000).toFixed(2)} MB`;
export const stem=n=>String(n).replace(/\.[^.]+$/,'');
export function safeName(n,fallback='file'){return [...String(n||fallback).normalize('NFC')].map(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127||'/\\:*?"<>|'.includes(c)?'-':c).join('').replace(/^[. ]+|[. ]+$/g,'').slice(0,180)||fallback;}
export function outputName(item,ext){return safeName(stem(item.settings.name||item.file.name))+'.'+ext;}
export function uniqueNames(names){const used=new Set();return names.map(n=>{n=safeName(n);let out=n,i=2;const p=n.lastIndexOf('.'),base=p>0?n.slice(0,p):n,ext=p>0?n.slice(p):'';while(used.has(out.toLowerCase()))out=`${base} (${i++})${ext}`;used.add(out.toLowerCase());return out;});}
export function pageList(value,count){if(!value.trim())return Array.from({length:count},(_,i)=>i);const out=[];for(const group of value.split(',')){const m=group.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);if(!m)throw Error('Use page numbers such as 1, 3-5.');const a=+m[1],b=+(m[2]||a);if(a<1||b>count||a>b)throw Error(`Choose pages between 1 and ${count}.`);for(let i=a;i<=b;i++)out.push(i-1);}if(out.length>400)throw Error('Choose no more than 400 pages.');return out;}
export function parseRules(text){const r={},notes=[];const t=text.trim();const size=t.match(/(?:under|below|less than|max(?:imum)?(?:\s+file)?(?:\s+size)?\s*[:=]?|up to|<)\s*(\d+(?:\.\d+)?)\s*(MiB|KiB|MB|KB|bytes?)/i);if(size){const unit=size[2].toLowerCase();r.limit=+size[1]*({mib:1048576,kib:1024,mb:1000000,kb:1000}[unit]||1);if(!(r.limit>0))throw Error('The size limit must be greater than zero.');}const dims=t.match(/(\d{2,5})\s*[x×]\s*(\d{2,5})/i);if(dims){if(/minimum|at least/i.test(t))notes.push('Minimum dimensions need your review; no resizing was chosen.');else{r.width=+dims[1];r.height=+dims[2];r.dimensionMode=/max(?:imum)?\s+(?:dimensions|width|height)|up to\s+\d+\s*[x×]/i.test(t)?'maximum':'exact';}}
const formats=[...t.matchAll(/\b(jpe?g|png|webp|tiff?|pdf|mp4|webm|mp3|wav)\b/ig)].map(m=>m[1].toLowerCase().replace('jpeg','jpg').replace(/^tif$/,'tiff'));const allowed=[...new Set(formats)];if(allowed.length===1)r.format=allowed[0];else if(allowed.length>1)notes.push(`Choose one allowed format: ${allowed.join(', ').toUpperCase()}.`);
if(/PDF\s*\/?A|accessible|accessibility|searchable|OCR|encrypt|password|sign(?:ed|ature)|remove.*(?:name|address)|DPI|CMYK|sRGB|codec|frame rate/i.test(t))notes.push('Special document, privacy, print or media rules need a separate check; these were not applied automatically.');if(!Object.keys(r).length)notes.push('No clear size, format or dimensions found. Choose the settings below.');return{rules:r,notes};}
export function defaults(kind){return{format:kind==='image'?'jpg':kind==='pdf'?'pdf':kind==='video'?'mp4':kind==='audio'?'mp3':'original',limit:0,name:'',width:0,height:0,dimensionMode:'exact',fit:'contain',rotation:0,flip:false,brightness:100,contrast:100,grayscale:false,crop:null,marks:[],speed:1,start:0,end:0,mute:false,pages:'',flatten:false,signatureOK:false,clean:true};}
export async function identify(file) {
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const starts = (...signature) => signature.every((value, index) => bytes[index] === value);
  const ext = file.name.split('.').pop().toLowerCase();
  if (starts(37, 80, 68, 70, 45)) return 'pdf';
  if (starts(80, 75)) {
    if (['docx', 'docm'].includes(ext)) return 'docx';
    if (['xlsx', 'xlsm'].includes(ext)) return 'sheet';
    return 'zip';
  }
  const picture = starts(137,80,78,71) || starts(255,216) || starts(71,73,70,56) || starts(66,77) || starts(73,73,42,0) || starts(77,77,0,42) || starts(82,73,70,70) && bytes[8] === 87 && bytes[9] === 69;
  if (picture || ['jpg','jpeg','png','gif','bmp','webp','tif','tiff','heic','heif','avif','ico'].includes(ext)) return 'image';
  if (['mp4','mov','m4v','webm','mkv','avi','mpeg','mpg'].includes(ext)) return 'video';
  if (['mp3','wav','m4a','aac','flac','ogg','aiff'].includes(ext)) return 'audio';
  if (['txt','csv','tsv','md','json','xml','yaml','yml','log','html','css','js','py'].includes(ext)) return 'text';
  return 'other';
}
export function inspectZip(bytes){const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(v.getUint32(i,true)===0x06054b50){end=i;break;}}if(end<0)throw Error('This ZIP is incomplete or unsupported.');const n=v.getUint16(end+10,true),start=v.getUint32(end+16,true);if(n>500||n===65535)throw Error('This ZIP has too many entries or uses ZIP64.');let p=start,total=0;const entries=[];for(let i=0;i<n;i++){if(p+46>bytes.length||v.getUint32(p,true)!==0x02014b50)throw Error('The ZIP directory is damaged.');const flags=v.getUint16(p+8,true),method=v.getUint16(p+10,true),size=v.getUint32(p+24,true),nl=v.getUint16(p+28,true),el=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),mode=v.getUint32(p+38,true)>>>16;const name=new TextDecoder().decode(bytes.subarray(p+46,p+46+nl));if(flags&1)throw Error('Password-protected ZIPs are not supported here.');if(![0,8].includes(method))throw Error('This ZIP uses an unsupported compression method.');if(size===0xffffffff||(total+=size)>MAX_ARCHIVE)throw Error('The expanded ZIP must be under 120 MB.');if(/(^[\\/]|^[a-z]:|(^|[\\/])\.\.([\\/]|$))/i.test(name)||(mode&0xf000)===0xa000)throw Error('This ZIP contains unsafe paths or links.');entries.push({name,size,directory:name.endsWith('/')});p+=46+nl+el+cl;}return entries;}
