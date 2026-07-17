/* =========================================================
   signature.js — drawable canvas signature pad.
   Supports mouse, touch, and stylus.
========================================================= */

const canvas = document.getElementById('signaturePad');
const ctx    = canvas.getContext('2d');
let hasSignature = false;
let drawing      = false;

function resizeCanvas(){
  canvas.width  = canvas.offsetWidth;
  canvas.height = 150;
  ctx.lineWidth = 2;
  ctx.lineCap   = 'round';
  ctx.lineJoin  = 'round';
  ctx.strokeStyle = '#000';
}
window.addEventListener('load', resizeCanvas);
setTimeout(resizeCanvas, 80);

function getPosFromEvent(e){
  const rect = canvas.getBoundingClientRect();
  const src  = e.touches ? e.touches[0] : e;
  return { x: src.clientX - rect.left, y: src.clientY - rect.top };
}

function startDraw(e){
  drawing = true; hasSignature = true;
  const p = getPosFromEvent(e);
  ctx.beginPath(); ctx.moveTo(p.x, p.y);
  document.getElementById('fSig').classList.remove('has-error');
}
function continueDraw(e){
  if(!drawing) return;
  e.preventDefault();
  const p = getPosFromEvent(e);
  ctx.lineTo(p.x, p.y); ctx.stroke();
}
function stopDraw(){ drawing = false; }

canvas.addEventListener('mousedown',  startDraw);
canvas.addEventListener('mousemove',  continueDraw);
canvas.addEventListener('mouseup',    stopDraw);
canvas.addEventListener('mouseleave', stopDraw);
canvas.addEventListener('touchstart', startDraw,    { passive: false });
canvas.addEventListener('touchmove',  continueDraw, { passive: false });
canvas.addEventListener('touchend',   stopDraw);

function clearSignature(){
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hasSignature = false;
}
