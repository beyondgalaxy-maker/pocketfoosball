import { PDFDocument, PDFName, PDFDict, PDFRef } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
import workerURL from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { zipSync, unzipSync } from 'fflate';
import DOMPurify from 'dompurify';
import mammoth from 'mammoth/mammoth.browser';
import { MAX_PIXELS, MAX_ARCHIVE, pageList, outputName, inspectZip, uniqueNames } from './core.js';
pdfjs.GlobalWorkerOptions.workerSrc = workerURL;
export { PDFDocument };
const next = () => new Promise(resolve => setTimeout(resolve, 0));

export function canvas(width, height) {
  width = Math.max(1, Math.round(width));
  height = Math.max(1, Math.round(height));
  if (width * height > MAX_PIXELS) throw Error('Use a picture below 32 megapixels. This one needs too much editing memory.');
  const result = document.createElement('canvas');
  result.width = width;
  result.height = height;
  return result;
}
export function blobCanvas(source, type = 'image/jpeg', quality = .92) {
  let surface = source;
  if (typeof surface.toBlob !== 'function') {
    surface = canvas(source.width, source.height);
    surface.getContext('2d').drawImage(source, 0, 0);
  }
  return new Promise((resolve, reject) => surface.toBlob(blob => blob ? resolve(blob) : reject(Error('The picture could not be saved.')), type, quality));
}
export async function image(file) {
  let source = file;
  const ext = file.type === 'image/tiff' ? 'tiff' : file.name?.split('.').pop().toLowerCase();
  if (['tif', 'tiff'].includes(ext)) {
    const module = await import('utif');
    const decoder = module.default || module;
    const bytes = await file.arrayBuffer();
    const pages = decoder.decode(bytes);
    if (!pages.length) throw Error('This TIFF has no readable pages.');
    const page = pages[0];
    if ((page.t256?.[0] || 0) * (page.t257?.[0] || 0) > MAX_PIXELS) throw Error('This TIFF is larger than 32 megapixels.');
    decoder.decodeImage(bytes, page);
    const output = canvas(page.width, page.height);
    output.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(decoder.toRGBA8(page)), page.width, page.height), 0, 0);
    return output;
  }
  if (['heic', 'heif'].includes(ext)) {
    try {
      const bitmap = await createImageBitmap(source);
      if (bitmap.width * bitmap.height > MAX_PIXELS) { bitmap.close(); throw Error('This image is larger than 32 megapixels.'); }
      return bitmap;
    } catch (error) {
      if (error.message.includes('32 megapixels')) throw error;
      const { default: decode } = await import('heic2any');
      source = await decode({ blob: file, toType: 'image/png' });
      if (Array.isArray(source)) source = source[0];
    }
  }
  try {
    const bitmap = await createImageBitmap(source);
    if (bitmap.width * bitmap.height > MAX_PIXELS) { bitmap.close(); throw Error('This image is larger than 32 megapixels.'); }
    return bitmap;
  } catch (error) {
    throw Error(error.message.includes('32 megapixels') ? error.message : 'This image variant could not be decoded. Try a JPG, PNG or flattened TIFF copy.');
  }
}
export function edited(source, settings) {
  const crop = settings.crop || { x: 0, y: 0, w: 1, h: 1 };
  const width = Math.round(source.width * crop.w), height = Math.round(source.height * crop.h);
  const rotated = settings.rotation % 180 !== 0;
  const surface = canvas(rotated ? height : width, rotated ? width : height);
  const context = surface.getContext('2d');
  context.translate(surface.width / 2, surface.height / 2);
  context.rotate(settings.rotation * Math.PI / 180);
  context.scale(settings.flip ? -1 : 1, 1);
  context.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) grayscale(${settings.grayscale ? 1 : 0})`;
  context.drawImage(source, source.width * crop.x, source.height * crop.y, width, height, -width / 2, -height / 2, width, height);
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.filter = 'none';
  drawMarks(surface, settings.marks || []);
  if (!settings.width || !settings.height) return surface;
  let w = settings.width, h = settings.height;
  if (w < 16 || h < 16 || w > 10000 || h > 10000) throw Error('Choose dimensions from 16 to 10,000 pixels.');
  if (settings.dimensionMode === 'maximum') {
    const ratio = Math.min(1, w / surface.width, h / surface.height);
    w = Math.round(surface.width * ratio); h = Math.round(surface.height * ratio);
  }
  const output = canvas(w, h), target = output.getContext('2d');
  target.fillStyle = '#fff'; target.fillRect(0, 0, w, h);
  const scale = settings.fit === 'cover' ? Math.max(w / surface.width, h / surface.height) : Math.min(w / surface.width, h / surface.height);
  target.imageSmoothingQuality = 'high';
  target.drawImage(surface, (w - surface.width * scale) / 2, (h - surface.height * scale) / 2, surface.width * scale, surface.height * scale);
  return output;
}
export function drawMarks(surface, marks) {
  const context = surface.getContext('2d');
  for (const mark of marks) {
    context.save();
    context.strokeStyle = mark.color || '#db4437';
    context.fillStyle = mark.tool === 'hide' ? '#000' : mark.color || '#db4437';
    context.lineWidth = Math.max(2, surface.width * .003);
    context.lineCap = 'round'; context.lineJoin = 'round';
    if (mark.tool === 'text') {
      context.font = `${Math.max(14, surface.width * .028)}px sans-serif`;
      context.fillText(mark.text, mark.x * surface.width, mark.y * surface.height);
    } else if (mark.tool === 'pen') {
      context.beginPath();
      mark.points.forEach((point, index) => context[index ? 'lineTo' : 'moveTo'](point.x * surface.width, point.y * surface.height));
      context.stroke();
    } else {
      const x = mark.x * surface.width, y = mark.y * surface.height, w = mark.w * surface.width, h = mark.h * surface.height;
      if (mark.tool === 'highlight') context.globalAlpha = .3;
      if (['hide', 'highlight'].includes(mark.tool)) context.fillRect(x, y, w, h); else context.strokeRect(x, y, w, h);
    }
    context.restore();
  }
}
export async function pdfOpen(item) {
  if (!item.pdf) item.pdf = await pdfjs.getDocument({ data: new Uint8Array(await item.file.arrayBuffer()), isEvalSupported: false, enableXfa: false, useSystemFonts: true }).promise;
  return item.pdf;
}
export async function pdfPage(item, index = 0, scale = 2) {
  const document = await pdfOpen(item), page = await document.getPage(index + 1);
  const viewport = page.getViewport({ scale: Math.min(3, scale) });
  const output = canvas(viewport.width, viewport.height);
  await page.render({ canvasContext: output.getContext('2d'), viewport }).promise;
  return output;
}
export async function word(file) {
  const raw = new Uint8Array(await file.arrayBuffer());
  inspectZip(raw);
  const parts = unzipSync(raw);
  const xml = parts['word/document.xml'] ? new TextDecoder().decode(parts['word/document.xml']) : '';
  if (/<w:(ins|del|moveFrom|moveTo)(?:\s|>)/.test(xml)) throw Error('This Word file has tracked changes. Accept or reject them in Word before converting; we will not choose for you.');
  const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  const html = DOMPurify.sanitize(result.value, { ALLOWED_TAGS: ['p','h1','h2','h3','h4','strong','em','u','s','br','ul','ol','li','table','tr','td','th','thead','tbody','a','img','blockquote','sup','sub'], ALLOWED_ATTR: ['src','colspan','rowspan'], ALLOW_DATA_ATTR: false });
  const element = document.createElement('div'); element.innerHTML = html;
  element.querySelectorAll('img').forEach(img => { if (!/^data:image\/(png|jpeg|gif|webp);base64,/i.test(img.getAttribute('src') || '')) img.remove(); });
  return element.innerHTML;
}
export async function workbook(file) {
  inspectZip(new Uint8Array(await file.arrayBuffer()));
  const { default: Excel } = await import('exceljs');
  const book = new Excel.Workbook(); await book.xlsx.load(await file.arrayBuffer()); return book;
}
export function readZip(bytes) { inspectZip(bytes); return unzipSync(bytes); }
export async function makeZip(entries) {
  const total = entries.reduce((size, entry) => size + entry.blob.size, 0);
  if (total > MAX_ARCHIVE) throw Error('Choose files totaling less than 120 MB for this ZIP.');
  const names = uniqueNames(entries.map(entry => entry.name)), map = Object.create(null);
  for (let i = 0; i < entries.length; i++) {
    map[names[i]] = [new Uint8Array(await entries[i].blob.arrayBuffer()), { level: entries[i].compress ? 6 : 0 }];
    await next();
  }
  const bytes = zipSync(map), opened = unzipSync(bytes);
  for (const [name, [original]] of Object.entries(map)) {
    if (opened[name]?.length !== original.length || !original.every((byte, i) => byte === opened[name][i])) throw Error('The ZIP verification failed.');
  }
  return new Blob([bytes], { type: 'application/zip' });
}
export function hasSignature(doc) {
  return doc.context.enumerateIndirectObjects().some(([, value]) => value instanceof PDFDict && (value.has(PDFName.of('ByteRange')) || String(value.get(PDFName.of('FT'))) === '/Sig'));
}
function cleanPDF(doc) {
  const info = doc.context.lookup(doc.context.trailerInfo.Info);
  if (info instanceof PDFDict) for (const key of info.keys()) info.delete(key);
  const metadata = doc.catalog.get(PDFName.of('Metadata'));
  doc.catalog.delete(PDFName.of('Metadata'));
  if (metadata instanceof PDFRef) doc.context.delete(metadata);
}
export async function imagePDF(images) {
  const doc = await PDFDocument.create();
  for (const surface of images) {
    const jpg = await blobCanvas(surface, 'image/jpeg', .91), picture = await doc.embedJpg(await jpg.arrayBuffer());
    const scale = Math.min(1, 540 / surface.width, 720 / surface.height);
    const page = doc.addPage([surface.width * scale, surface.height * scale]);
    page.drawImage(picture, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
  }
  cleanPDF(doc); return new Blob([await doc.save()], { type: 'application/pdf' });
}
async function encodeImage(surface, format, quality) {
  if (format === 'pdf') return imagePDF([surface]);
  if (format === 'tiff') {
    const module = await import('utif'), encoder = module.default || module;
    return new Blob([encoder.encodeImage(surface.getContext('2d').getImageData(0, 0, surface.width, surface.height).data, surface.width, surface.height)], { type: 'image/tiff' });
  }
  const type = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[format];
  if (!type) throw Error('Choose a supported picture format.');
  if (format === 'jpg') {
    const background = canvas(surface.width, surface.height), context = background.getContext('2d');
    context.fillStyle = '#fff'; context.fillRect(0, 0, background.width, background.height); context.drawImage(surface, 0, 0); surface = background;
  }
  return blobCanvas(surface, type, quality);
}
export async function processImage(item, signal, progress) {
  const settings = item.settings;
  let surface = edited(item.image || await image(item.file), settings), output;
  for (let round = 0; round < 10; round++) {
    if (signal.aborted) throw Error('Stopped.');
    output = await encodeImage(surface, settings.format, .96);
    if (!settings.limit || output.size < settings.limit) break;
    if (['jpg', 'webp'].includes(settings.format)) {
      let low = .08, high = .96, best = null;
      for (let i = 0; i < 8; i++) {
        if (signal.aborted) throw Error('Stopped.');
        const quality = (low + high) / 2, blob = await encodeImage(surface, settings.format, quality);
        if (blob.size < settings.limit) { low = quality; best = blob; } else high = quality;
        progress?.(.05 + round * .06 + i * .01); await next();
      }
      if (best) { output = best; break; }
    }
    if (settings.width && settings.height && settings.dimensionMode === 'exact') throw Error('That size limit is too small at these exact dimensions. Increase the limit or choose a smaller size.');
    const ratio = Math.max(.45, Math.min(.85, Math.sqrt(settings.limit / output.size) * .9));
    const smaller = canvas(Math.max(16, surface.width * ratio), Math.max(16, surface.height * ratio));
    smaller.getContext('2d').drawImage(surface, 0, 0, smaller.width, smaller.height); surface = smaller;
  }
  if (settings.limit && output.size >= settings.limit) throw Error('The file cannot meet this size limit. Choose a larger limit.');
  if (['jpg', 'png', 'webp'].includes(settings.format)) {
    const check = await createImageBitmap(output);
    if (check.width !== surface.width || check.height !== surface.height) throw Error('The saved picture could not be verified.');
    check.close();
  }
  return { blob: output, name: outputName(item, settings.format), note: `${surface.width} × ${surface.height} pixels · original photo tags not copied` };
}
export async function processPDF(item, signal, progress) {
  const settings = item.settings, source = await PDFDocument.load(await item.file.arrayBuffer(), { updateMetadata: false });
  if (hasSignature(source) && !settings.signatureOK) throw Error('This PDF contains signature fields. Approve changing signatures before creating a modified copy.');
  const pages = pageList(settings.pages, source.getPageCount());
  let output;
  if (settings.flatten) {
    let scale = 2;
    for (let attempt = 0; attempt < 6; attempt++) {
      const document = await PDFDocument.create();
      for (let i = 0; i < pages.length; i++) {
        if (signal.aborted) throw Error('Stopped.');
        const surface = await pdfPage(item, pages[i], scale);
        drawMarks(surface, (settings.marks || []).filter(mark => mark.page === pages[i]));
        const jpg = await blobCanvas(surface, 'image/jpeg', Math.max(.38, .88 - attempt * .09));
        const picture = await document.embedJpg(await jpg.arrayBuffer());
        const box = source.getPage(pages[i]).getSize(), page = document.addPage([box.width, box.height]);
        page.drawImage(picture, { x: 0, y: 0, ...box });
        progress?.((i + 1) / pages.length); await next();
      }
      cleanPDF(document); output = new Blob([await document.save()], { type: 'application/pdf' });
      if (!settings.limit || output.size < settings.limit) break;
      scale *= .78;
    }
  } else {
    if (settings.marks?.length) throw Error('Drawing on a PDF requires approving a picture-only copy.');
    const samePages = pages.length === source.getPageCount() && pages.every((value, index) => value === index);
    const document = samePages ? source : await PDFDocument.create();
    if (!samePages) {
      (await document.copyPages(source, pages)).forEach(page => document.addPage(page));
      if (!settings.clean) { document.setTitle(source.getTitle() || ''); document.setAuthor(source.getAuthor() || ''); }
    }
    if (settings.clean) cleanPDF(document);
    output = new Blob([await document.save()], { type: 'application/pdf' });
  }
  if (settings.limit && output.size >= settings.limit) throw Error('This PDF is still above the limit. Approve a picture-only copy for stronger reduction, or raise the limit.');
  const check = await PDFDocument.load(await output.arrayBuffer());
  if (check.getPageCount() !== pages.length) throw Error('The saved page count did not match.');
  return { blob: output, name: outputName(item, 'pdf'), note: `${pages.length} pages · ${settings.flatten ? 'picture-only: text, forms and links removed' : 'page content retained; review document features before submitting'}` };
}
export async function combine(items) {
  const output = await PDFDocument.create();
  for (const item of items) {
    const blob = item.result?.blob || item.file;
    if (blob.type === 'application/pdf' || item.kind === 'pdf') {
      const document = await PDFDocument.load(await blob.arrayBuffer());
      if (hasSignature(document)) throw Error('Combine copies without digital signatures. Combining would change their signature validity.');
      (await output.copyPages(document, document.getPageIndices())).forEach(page => output.addPage(page));
    } else if (item.kind === 'image') {
      const picture = await image(blob), jpg = await blobCanvas(picture);
      const embedded = await output.embedJpg(await jpg.arrayBuffer());
      const scale = Math.min(1, 540 / picture.width, 720 / picture.height);
      const page = output.addPage([picture.width * scale, picture.height * scale]);
      page.drawImage(embedded, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
      picture.close?.();
    } else throw Error('Choose only pictures and PDFs to combine.');
  }
  cleanPDF(output); return new Blob([await output.save()], { type: 'application/pdf' });
}
