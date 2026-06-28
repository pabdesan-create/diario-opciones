import { useState, useEffect, useRef } from 'react'

// ── Paleta ──────────────────────────────────────────────────────
const C = {
  bg: '#0a0e1a', surf: '#111827', surf2: '#1a2235', brd: '#1e2d45',
  acc: '#3b82f6', accL: '#60a5fa', gold: '#f59e0b', grn: '#10b981',
  red: '#ef4444', mut: '#4b6080', txt: '#e2e8f0', dim: '#7a95b0',
  pablo: '#3b82f6', maria: '#a855f7',
  VPUT: '#10b981', VCALL: '#f59e0b', CPUT: '#ef4444', CCALL: '#ec4899', COMBO: '#8b5cf6'
}
const estratColor = e => C[e] || C.mut

// ── Utils ────────────────────────────────────────────────────────
const LS = {
  get: k => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
}
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'2-digit' }) : '—'
const fmtNum = n => n == null ? '—' : n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtPct = n => n == null ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
const mesLabel = d => d ? new Date(d).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : ''
const mesKey = d => d ? d.slice(0, 7) : ''
const dias = (a, b) => a && b ? Math.round((new Date(b) - new Date(a)) / 86400000) : null

function calcOp(op) {
  const exposicion = (op.strike || 0) * 100
  const obj_precio = op.prima && op.objetivo_pct ? parseFloat((op.prima * (1 - op.objetivo_pct / 100)).toFixed(2)) : null
  let beneficio = op.beneficio != null ? op.beneficio : null
  let precio_cierre = op.precio_cierre != null ? op.precio_cierre : null
  if (op.estado === 'CERRADA' && op.prima != null) {
    if (beneficio == null && precio_cierre != null)
      beneficio = parseFloat((op.prima - precio_cierre).toFixed(2))
    if (beneficio != null)
      precio_cierre = parseFloat((op.prima - beneficio).toFixed(2))
  }
  const d = dias(op.fecha_apertura, op.fecha_cierre)
  const rent_total = beneficio != null && exposicion ? parseFloat((beneficio / exposicion * 100).toFixed(4)) : null
  const rent_anual = rent_total != null && d > 0 ? parseFloat((rent_total * 365 / d).toFixed(2)) : null
  return { ...op, exposicion, obj_precio, beneficio, precio_cierre, dias: d, rent_total, rent_anual }
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

async function fileToB64(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(file) })
}

// ── Seed data (importado del Excel) ─────────────────────────────
function excelDate(n) {
  if (!n) return null
  const d = new Date((n - 25569) * 86400 * 1000)
  return d.toISOString().slice(0, 10)
}

function buildSeed() {
  const pRaw = [
    { mes:'Mayo', estado:'CERRADA', fecha:46148, estrategia:'VPUT', ticker:'ZTS', venc:46157, strike:110, prima:430, obj_pct:45, adj:-2800, cierre:46151, benef:-2371.06, precio100:11000, dias:3 },
    { mes:'Mayo', estado:'CERRADA', fecha:46153, estrategia:'VPUT', ticker:'ZTS', venc:46191, strike:75, prima:935, obj_pct:45, cierre:46155, benef:94.74, precio100:7500, dias:2 },
    { mes:'Mayo', estado:'CERRADA', fecha:46153, estrategia:'VCALL', ticker:'ZTS', venc:46191, strike:90, prima:135, obj_pct:45, cierre:46155, benef:81, precio100:9000, dias:2 },
    { mes:'Mayo', estado:'CERRADA', fecha:46128, estrategia:'VCALL', ticker:'CMCSA', venc:46157, strike:32, prima:31, obj_pct:45, cierre:46147, benef:27.9, precio100:3200, dias:20 },
    { mes:'Mayo', estado:'CERRADA', fecha:46122, estrategia:'VCALL', ticker:'ACN', venc:46157, strike:195, prima:340, obj_pct:45, cierre:46157, benef:338.94, precio100:19500, dias:35 },
    { mes:'Mayo', estado:'CERRADA', fecha:46143, estrategia:'VCALL', ticker:'GIS', venc:46157, strike:37.5, prima:15, obj_pct:45, cierre:46157, benef:14.95, precio100:3750, dias:14 },
    { mes:'Mayo', estado:'CERRADA', fecha:46079, estrategia:'CCALL', ticker:'NVDA', venc:46773, strike:120, prima:0, obj_pct:45, cierre:46153, benef:2687, precio100:12000, dias:75 },
    { mes:'Mayo', estado:'CERRADA', fecha:46153, estrategia:'VPUT', ticker:'SOXX', venc:46157, strike:505, prima:360, obj_pct:45, cierre:46155, benef:171, precio100:50500, dias:2 },
    { mes:'Mayo', estado:'CERRADA', fecha:46153, estrategia:'VPUT', ticker:'ZTS', venc:46191, strike:75, prima:315, obj_pct:45, cierre:46161, benef:159.94, precio100:7500, dias:8 },
    { mes:'Mayo', estado:'CERRADA', fecha:46162, estrategia:'VPUT', ticker:'BKNG', venc:46191, strike:145, prima:415, obj_pct:45, cierre:46164, benef:214.69, precio100:14500, dias:2 },
    { mes:'Mayo', estado:'CERRADA', fecha:46153, estrategia:'VPUT', ticker:'DELL', venc:46191, strike:200, prima:563, obj_pct:45, cierre:46164, benef:413.14, precio100:20000, dias:11 },
    { mes:'Mayo', estado:'CERRADA', fecha:46162, estrategia:'VPUT', ticker:'NU', venc:46171, strike:12.5, prima:26, obj_pct:45, cierre:46163, benef:17.9, precio100:1250, dias:1 },
    { mes:'Mayo', estado:'CERRADA', fecha:46160, estrategia:'VPUT', ticker:'BLK', venc:46191, strike:930, prima:509, obj_pct:45, cierre:46164, benef:247.89, precio100:93000, dias:4 },
    { mes:'Mayo', estado:'CERRADA', fecha:46153, estrategia:'VPUT', ticker:'NTAP', venc:46191, strike:105, prima:220, obj_pct:45, cierre:46164, benef:120.95, precio100:10500, dias:11 },
    { mes:'Mayo', estado:'CERRADA', fecha:46153, estrategia:'VPUT', ticker:'QCOM', venc:46191, strike:200, prima:765, obj_pct:45, cierre:46164, benef:218.44, precio100:20000, dias:11 },
    { mes:'Mayo', estado:'CERRADA', fecha:46163, estrategia:'VPUT', ticker:'INTU', venc:46191, strike:300, prima:1500, obj_pct:45, cierre:46164, benef:637.87, precio100:30000, dias:1 },
    { mes:'Mayo', estado:'CERRADA', fecha:46168, estrategia:'VPUT', ticker:'RACE', venc:46191, strike:300, prima:240, obj_pct:45, cierre:46170, benef:140, precio100:30000, dias:2 },
    { mes:'Mayo', estado:'CERRADA', fecha:46161, estrategia:'VPUT', ticker:'TTD', venc:46191, strike:20, prima:77, obj_pct:45, cierre:46169, benef:39.9, precio100:2000, dias:8 },
    { mes:'Mayo', estado:'CERRADA', fecha:46162, estrategia:'VPUT', ticker:'AMS', venc:46191, strike:48, prima:57, obj_pct:45, cierre:46171, benef:30, precio100:4800, dias:9 },
    { mes:'Mayo', estado:'CERRADA', fecha:46161, estrategia:'VPUT', ticker:'SPGI', venc:46191, strike:375, prima:300, obj_pct:45, cierre:46171, benef:151.49, precio100:37500, dias:10 },
    { mes:'Mayo', estado:'CERRADA', fecha:46160, estrategia:'VPUT', ticker:'HD', venc:46191, strike:265, prima:108, obj_pct:45, cierre:46171, benef:54.15, precio100:26500, dias:11 },
    { mes:'Mayo', estado:'CERRADA', fecha:46170, estrategia:'VPUT', ticker:'INTU', venc:46191, strike:270, prima:378, obj_pct:45, cierre:46171, benef:206.89, precio100:27000, dias:1 },
    { mes:'Mayo', estado:'CERRADA', fecha:46163, estrategia:'VPUT', ticker:'NU', venc:46171, strike:13, prima:18, obj_pct:45, cierre:46171, benef:8.9, precio100:1300, dias:8 },
    // Operaciones Mayo Pablo adicionales (faltaban del seed original)
    { mes:'Mayo', estado:'CERRADA', fecha:46079, estrategia:'CCALL', ticker:'NFLX', venc:46220, strike:70, prima:null, obj_pct:45, cierre:46153, benef:450.85, precio100:7000, dias:74 },
    { mes:'Mayo', estado:'CERRADA', fecha:null,  estrategia:'VPUT', ticker:'PAYC', venc:null,  strike:null, prima:null, obj_pct:45, cierre:46161, benef:37.77, precio100:0, dias:null },
    { mes:'Mayo', estado:'CERRADA', fecha:46161, estrategia:'VPUT', ticker:'BAM',  venc:46191, strike:42.5, prima:48, obj_pct:45, cierre:46170, benef:26.95, precio100:4250, dias:9 },
    { mes:'Mayo', estado:'CERRADA', fecha:46164, estrategia:'VPUT', ticker:'CMCSA',venc:46171, strike:25,  prima:30, obj_pct:45, cierre:46170, benef:16.96, precio100:2500, dias:6 },
    { mes:'Junio', estado:'CERRADA', fecha:46161, estrategia:'VPUT', ticker:'MA', venc:46191, strike:470, prima:390, obj_pct:45, cierre:46177, benef:-65.69, precio100:47000, dias:15 },
    { mes:'Junio', estado:'CERRADA', fecha:46161, estrategia:'VPUT', ticker:'ACN', venc:46191, strike:157.5, prima:301, obj_pct:45, cierre:46174, benef:179.89, precio100:15750, dias:13 },
    { mes:'Junio', estado:'CERRADA', fecha:46161, estrategia:'VPUT', ticker:'ADBE', venc:46191, strike:225, prima:474, obj_pct:45, cierre:46174, benef:236.89, precio100:22500, dias:13 },
    { mes:'Junio', estado:'CERRADA', fecha:46155, estrategia:'VCALL', ticker:'CMCSA', venc:46191, strike:26, prima:60, obj_pct:45, cierre:46174, benef:63.2, precio100:2600, dias:35 },
    { mes:'Junio', estado:'CERRADA', fecha:46160, estrategia:'VPUT', ticker:'WKL', venc:46191, strike:55, prima:70, obj_pct:45, cierre:46174, benef:41, precio100:5500, dias:13 },
    { mes:'Junio', estado:'CERRADA', fecha:46160, estrategia:'VCALL', ticker:'GIS', venc:46191, strike:35, prima:57, obj_pct:45, cierre:46176, benef:30.95, precio100:3500, dias:15 },
    { mes:'Junio', estado:'CERRADA', fecha:46160, estrategia:'VCALL', ticker:'ZTS', venc:46191, strike:85, prima:87, obj_pct:45, cierre:46175, benef:46.95, precio100:8500, dias:14 },
    { mes:'Junio', estado:'CERRADA', fecha:46160, estrategia:'VCALL', ticker:'ACN', venc:46191, strike:195, prima:450, obj_pct:45, cierre:46177, benef:-54.94, precio100:19500, dias:16 },
    { mes:'Junio', estado:'CERRADA', fecha:46160, estrategia:'VPUT', ticker:'ICE', venc:46191, strike:142, prima:102, obj_pct:45, cierre:46184, benef:-316.3, precio100:14200, dias:null },
    { mes:'Junio', estado:'CERRADA', fecha:46162, estrategia:'VPUT', ticker:'CMCSA', venc:46178, strike:25, prima:37, obj_pct:45, cierre:46177, benef:-50.04, precio100:2500, dias:14 },
    { mes:'Junio', estado:'CERRADA', fecha:46170, estrategia:'VPUT', ticker:'PEP', venc:46191, strike:137, prima:91, obj_pct:45, cierre:46181, benef:41.9, precio100:13700, dias:null },
    { mes:'Junio', estado:'CERRADA', fecha:46170, estrategia:'VPUT', ticker:'PG', venc:46191, strike:135, prima:69, obj_pct:45, cierre:46178, benef:35.9, precio100:13500, dias:7 },
    { mes:'Junio', estado:'CERRADA', fecha:46170, estrategia:'VPUT', ticker:'MCD', venc:46191, strike:265, prima:140, obj_pct:45, cierre:46178, benef:72.9, precio100:26500, dias:7 },
    { mes:'Junio', estado:'CERRADA', fecha:46163, estrategia:'VPUT', ticker:'NVDA', venc:46191, strike:219, prima:920, obj_pct:45, cierre:46174, benef:219.88, precio100:21900, dias:10 },
    { mes:'Junio', estado:'CERRADA', fecha:46171, estrategia:'VCALL', ticker:'PYPL', venc:46178, strike:46, prima:30, obj_pct:45, cierre:46177, benef:24.9, precio100:4600, dias:5 },
    { mes:'Junio', estado:'CERRADA', fecha:46174, estrategia:'VPUT', ticker:'HD', venc:46191, strike:285, prima:197, obj_pct:45, cierre:46178, benef:104.9, precio100:28500, dias:null },
    { mes:'Junio', estado:'CERRADA', fecha:46174, estrategia:'VPUT', ticker:'BLK', venc:46191, strike:920, prima:360, obj_pct:45, cierre:46182, benef:177.89, precio100:92000, dias:null },
    { mes:'Junio', estado:'CERRADA', fecha:46174, estrategia:'VPUT', ticker:'ABBV', venc:46191, strike:200, prima:116, obj_pct:45, cierre:46177, benef:77.9, precio100:20000, dias:3 },
    { mes:'Junio', estado:'CERRADA', fecha:46174, estrategia:'VPUT', ticker:'BAM', venc:46191, strike:45, prima:50, obj_pct:45, cierre:46185, benef:23.55, precio100:4500, dias:null },
    { mes:'Junio', estado:'CERRADA', fecha:46174, estrategia:'VPUT', ticker:'META', venc:46191, strike:580, prima:590, obj_pct:45, cierre:46177, benef:368.45, precio100:58000, dias:3 },
    { mes:'Junio', estado:'CERRADA', fecha:46178, estrategia:'CCALL', ticker:'MSTR', venc:46374, strike:100, prima:3750, obj_pct:45, cierre:46181, benef:730.81, precio100:10000, dias:null },
    { mes:'Junio', estado:'CERRADA', fecha:46177, estrategia:'VCALL', ticker:'PYPL', venc:46185, strike:45, prima:39, obj_pct:45, cierre:46181, benef:32.38, precio100:4500, dias:null },
    { mes:'Junio', estado:'CERRADA', fecha:46182, estrategia:'VCALL', ticker:'CMCSA', venc:46191, strike:25, prima:30, obj_pct:45, cierre:46188, benef:9.49, precio100:2500, dias:null },
    { mes:'Junio', estado:'CERRADA', fecha:46177, estrategia:'VPUT', ticker:'MA', venc:46205, strike:460, prima:474, obj_pct:45, cierre:46182, benef:217.31, precio100:46000, dias:null },
    { mes:'Junio', estado:'CERRADA', fecha:46160, estrategia:'VCALL', ticker:'ACN', venc:46191, strike:200, prima:550, obj_pct:45, cierre:46182, benef:272.89, precio100:20000, dias:null },
    { mes:'Junio', estado:'CERRADA', fecha:46182, estrategia:'VCALL', ticker:'ACN', venc:46191, strike:182.5, prima:420, obj_pct:45, cierre:46188, benef:168.89, precio100:18250, dias:null },
    { mes:'Junio', estado:'CERRADA', fecha:46177, estrategia:'VCALL', ticker:'NU', venc:46185, strike:12.5, prima:20, obj_pct:45, cierre:46181, benef:13.38, precio100:1250, dias:null },
    { mes:'Junio', estado:'CERRADA', fecha:46177, estrategia:'VPUT', ticker:'TMUS', venc:46191, strike:170, prima:200, obj_pct:45, cierre:46182, benef:99.35, precio100:17000, dias:null },
    { mes:'Junio', estado:'CERRADA', fecha:46177, estrategia:'VCALL', ticker:'ZTS', venc:46220, strike:85, prima:247, obj_pct:45, cierre:46189, benef:124.9, precio100:8500, dias:null },
    { mes:'Junio', estado:'CERRADA', fecha:46178, estrategia:'VPUT', ticker:'NVDA', venc:46220, strike:180, prima:235, obj_pct:45, cierre:46188, benef:112.9, precio100:18000, dias:null },
    { mes:'Junio', estado:'CERRADA', fecha:46178, estrategia:'VPUT', ticker:'TSM', venc:46220, strike:380, prima:954, obj_pct:45, cierre:46188, benef:402.13, precio100:38000, dias:null },
    { mes:'Junio', estado:'CERRADA', fecha:46182, estrategia:'VCALL', ticker:'PYPL', venc:46191, strike:43.5, prima:24, obj_pct:45, cierre:46190, benef:10.9, precio100:4350, dias:null },
    { mes:'Junio', estado:'CERRADA', fecha:46182, estrategia:'VCALL', ticker:'NU', venc:46199, strike:12, prima:39, obj_pct:45, cierre:46190, benef:-93.1, precio100:1200, dias:null },
    // Operaciones Junio faltantes (reconciliadas vs Excel)
    { mes:'Junio', estado:'CERRADA', fecha:46161, estrategia:'VPUT', ticker:'AWK', venc:46191, strike:120, prima:152, obj_pct:45, cierre:46178, benef:82.94, precio100:12000 },
    { mes:'Junio', estado:'CERRADA', fecha:46177, estrategia:'VPUT', ticker:'ASTS', venc:46191, strike:null, prima:null, obj_pct:45, cierre:46189, benef:110.73, precio100:0 },
    { mes:'Junio', estado:'CERRADA', fecha:46170, estrategia:'VPUT', ticker:'OMC', venc:46191, strike:70, prima:104, obj_pct:45, cierre:46181, benef:62.00, precio100:7000 },
    { mes:'Junio', estado:'CERRADA', fecha:46177, estrategia:'VPUT', ticker:'ASML', venc:46220, strike:null, prima:null, obj_pct:45, cierre:46189, benef:598.32, precio100:0 },
    { mes:'Junio', estado:'CERRADA', fecha:46164, estrategia:'COMBO', ticker:'ASML', venc:46164, strike:null, prima:3899, obj_pct:45, cierre:46174, benef:1098.37, precio100:0 },
    { mes:'Junio', estado:'CERRADA', fecha:46164, estrategia:'COMBO', ticker:'ASTS', venc:46164, strike:null, prima:928, obj_pct:45, cierre:46174, benef:-0.28, precio100:0 },
    { mes:'Junio', estado:'CERRADA', fecha:46171, estrategia:'VPUT', ticker:'RMD', venc:46191, strike:185, prima:185, obj_pct:45, cierre:46182, benef:92.90, precio100:18500 },
    { mes:'Junio', estado:'CERRADA', fecha:46174, estrategia:'VPUT', ticker:'V', venc:46191, strike:295, prima:65, obj_pct:45, cierre:46178, benef:32.12, precio100:29500 },
    // Abiertas
    { mes:'A', estado:'ABIERTA', fecha:46178, estrategia:'VPUT', ticker:'NOW', venc:46220, strike:90, prima:145, obj_pct:45, precio100:9000 },
    { mes:'A', estado:'ABIERTA', fecha:46178, estrategia:'CCALL', ticker:'META', venc:46374, strike:580, prima:8520, obj_pct:45, precio100:58000 },
    { mes:'A', estado:'ABIERTA', fecha:46184, estrategia:'VPUT', ticker:'ICE', venc:46220, strike:140, prima:537, obj_pct:45, precio100:14000 },
    { mes:'A', estado:'ABIERTA', fecha:46177, estrategia:'VPUT', ticker:'INTU', venc:46220, strike:270, prima:690, obj_pct:45, precio100:27000 },
    { mes:'A', estado:'ABIERTA', fecha:46189, estrategia:'VPUT', ticker:'MA', venc:46220, strike:465, prima:475, obj_pct:45, precio100:46500 },
    { mes:'A', estado:'ABIERTA', fecha:46189, estrategia:'VPUT', ticker:'SPGI', venc:46220, strike:400, prima:394, obj_pct:45, precio100:40000 },
    { mes:'A', estado:'ABIERTA', fecha:46189, estrategia:'VPUT', ticker:'NFLX', venc:46220, strike:75, prima:192, obj_pct:45, precio100:7500 },
    { mes:'A', estado:'ABIERTA', fecha:46189, estrategia:'VPUT', ticker:'WKL', venc:46220, strike:58, prima:217, obj_pct:45, precio100:5800 },
    { mes:'A', estado:'ABIERTA', fecha:46189, estrategia:'VPUT', ticker:'NVDA', venc:46220, strike:190, prima:226, obj_pct:45, precio100:19000 },
    { mes:'A', estado:'ABIERTA', fecha:46189, estrategia:'VPUT', ticker:'MSFT', venc:46220, strike:365, prima:371, obj_pct:45, precio100:36500 },
    { mes:'A', estado:'ABIERTA', fecha:46189, estrategia:'VPUT', ticker:'SAP', venc:46220, strike:150, prima:220, obj_pct:45, precio100:15000 },
    { mes:'A', estado:'ABIERTA', fecha:46189, estrategia:'VPUT', ticker:'ADSK', venc:46220, strike:195, prima:611, obj_pct:45, precio100:19500 },
    { mes:'A', estado:'ABIERTA', fecha:46189, estrategia:'VPUT', ticker:'CPRT', venc:46220, strike:30, prima:75, obj_pct:45, precio100:3000 },
    { mes:'A', estado:'ABIERTA', fecha:46189, estrategia:'VPUT', ticker:'GOOGL', venc:46220, strike:310, prima:61, obj_pct:45, precio100:31000 },
    { mes:'A', estado:'ABIERTA', fecha:46177, estrategia:'VPUT', ticker:'CMCSA', venc:46191, strike:25, prima:127, obj_pct:45, precio100:2500 },
    { mes:'A', estado:'ABIERTA', fecha:46177, estrategia:'VPUT', ticker:'AVGO', venc:46220, strike:340, prima:375, obj_pct:45, precio100:34000 },
  ]

  const mRaw = [
    { mes:'Mayo', estado:'CERRADA', fecha:46157, estrategia:'VPUT', ticker:'OMC', venc:46191, strike:65, prima:95, obj_pct:45, cierre:46161, benef:42.9, precio100:6500, dias:4 },
    { mes:'Mayo', estado:'CERRADA', fecha:46157, estrategia:'VPUT', ticker:'NVDA', venc:46191, strike:190, prima:173, obj_pct:45, cierre:46170, benef:76.15, precio100:19000, dias:13 },
    { mes:'Mayo', estado:'CERRADA', fecha:46157, estrategia:'VPUT', ticker:'ACN', venc:46191, strike:145, prima:290, obj_pct:45, cierre:46161, benef:162.04, precio100:14500, dias:4 },
    { mes:'Mayo', estado:'CERRADA', fecha:46157, estrategia:'VPUT', ticker:'V', venc:46191, strike:280, prima:40, obj_pct:45, cierre:46163, benef:15.9, precio100:28000, dias:6 },
    { mes:'Mayo', estado:'CERRADA', fecha:46157, estrategia:'VPUT', ticker:'ABT', venc:46191, strike:75, prima:40, obj_pct:45, cierre:46161, benef:20.21, precio100:7500, dias:4 },
    { mes:'Mayo', estado:'CERRADA', fecha:46157, estrategia:'VPUT', ticker:'HD', venc:46191, strike:255, prima:102, obj_pct:45, cierre:46162, benef:51.9, precio100:25500, dias:5 },
    { mes:'Mayo', estado:'CERRADA', fecha:46157, estrategia:'VPUT', ticker:'ZTS', venc:46191, strike:65, prima:60, obj_pct:45, cierre:46160, benef:30.95, precio100:6500, dias:3 },
    { mes:'Mayo', estado:'CERRADA', fecha:46162, estrategia:'VPUT', ticker:'CMCSA', venc:46191, strike:25, prima:48, obj_pct:45, cierre:46164, benef:19.15, precio100:2500, dias:2 },
    { mes:'Mayo', estado:'CERRADA', fecha:46162, estrategia:'VPUT', ticker:'NU', venc:46171, strike:12.5, prima:26, obj_pct:45, cierre:46163, benef:17.25, precio100:1250, dias:1 },
    { mes:'Mayo', estado:'CERRADA', fecha:46162, estrategia:'VPUT', ticker:'VEEV', venc:46191, strike:140, prima:338, obj_pct:45, cierre:46171, benef:151.99, precio100:14000, dias:9 },
    { mes:'Mayo', estado:'CERRADA', fecha:46163, estrategia:'VPUT', ticker:'ACN', venc:46191, strike:157.5, prima:280, obj_pct:45, cierre:46171, benef:109.06, precio100:15750, dias:8 },
    { mes:'Mayo', estado:'CERRADA', fecha:46163, estrategia:'VPUT', ticker:'NOW', venc:46191, strike:82, prima:85, obj_pct:45, cierre:46170, benef:54.9, precio100:8200, dias:7 },
    { mes:'Mayo', estado:'CERRADA', fecha:46163, estrategia:'VPUT', ticker:'ADBE', venc:46191, strike:225, prima:654, obj_pct:45, cierre:46171, benef:236.39, precio100:22500, dias:8 },
    { mes:'Mayo', estado:'CERRADA', fecha:46164, estrategia:'VPUT', ticker:'CMCSA', venc:46191, strike:25, prima:30, obj_pct:45, cierre:46170, benef:16.5, precio100:2500, dias:6 },
    { mes:'Mayo', estado:'CERRADA', fecha:46163, estrategia:'VPUT', ticker:'NU', venc:46171, strike:13, prima:20, obj_pct:45, cierre:46171, benef:14.25, precio100:1300, dias:8 },
    // Operaciones Mayo María adicionales (faltaban del seed original)
    { mes:'Mayo', estado:'CERRADA', fecha:46171, estrategia:'VPUT', ticker:'NU',   venc:46178, strike:13, prima:21, obj_pct:45, cierre:46178, benef:-33.0, precio100:1300, dias:7 },
    { mes:'Mayo', estado:'CERRADA', fecha:null,  estrategia:'VPUT', ticker:'PAYX', venc:46283, strike:null, prima:null, obj_pct:45, cierre:46171, benef:-52.5, precio100:0, dias:null },
    { mes:'Junio', estado:'CERRADA', fecha:46171, estrategia:'VCALL', ticker:'PYPL', venc:46191, strike:47, prima:55, obj_pct:45, cierre:46182, benef:47.15, precio100:4700, dias:10 },
    { mes:'Junio', estado:'CERRADA', fecha:46157, estrategia:'VPUT', ticker:'AWK', venc:46191, strike:115, prima:75, obj_pct:45, cierre:46176, benef:32.95, precio100:11500, dias:15 },
    { mes:'Junio', estado:'CERRADA', fecha:46170, estrategia:'VPUT', ticker:'CMCSA', venc:46191, strike:25, prima:38, obj_pct:45, cierre:46177, benef:-116.5, precio100:2500, dias:6 },
    { mes:'Junio', estado:'CERRADA', fecha:46177, estrategia:'VCALL', ticker:'NU', venc:46185, strike:12, prima:32, obj_pct:45, cierre:46182, benef:14.9, precio100:1200, dias:5 },
    { mes:'Junio', estado:'CERRADA', fecha:46182, estrategia:'VCALL', ticker:'CMCSA', venc:46199, strike:25, prima:30, obj_pct:45, cierre:46189, benef:14.9, precio100:2500, dias:7 },
    { mes:'Junio', estado:'CERRADA', fecha:46177, estrategia:'VPUT', ticker:'INTU', venc:46191, strike:272.5, prima:338, obj_pct:45, cierre:46185, benef:-673.31, precio100:27250, dias:8 },
    { mes:'Junio', estado:'CERRADA', fecha:46185, estrategia:'VPUT', ticker:'INTU', venc:46220, strike:260, prima:1413, obj_pct:45, cierre:46188, benef:681.67, precio100:26000, dias:3 },
    // Abiertas
    { mes:'Junio', estado:'ABIERTA', fecha:46177, estrategia:'VPUT', ticker:'CMCSA', venc:46220, strike:24, prima:32, obj_pct:45, precio100:2400 },
    { mes:'Junio', estado:'ABIERTA', fecha:46182, estrategia:'VCALL', ticker:'PYPL', venc:46191, strike:44, prima:17, obj_pct:45, precio100:4400 },
    { mes:'Junio', estado:'ABIERTA', fecha:46190, estrategia:'VPUT', ticker:'SPGI', venc:46220, strike:390, prima:310, obj_pct:45, precio100:39000 },
    { mes:'Junio', estado:'ABIERTA', fecha:46190, estrategia:'VPUT', ticker:'MCO', venc:46220, strike:420, prima:280, obj_pct:45, precio100:42000 },
    { mes:'Junio', estado:'ABIERTA', fecha:46190, estrategia:'VPUT', ticker:'MA', venc:46220, strike:465, prima:320, obj_pct:45, precio100:46500 },
    { mes:'Junio', estado:'ABIERTA', fecha:46182, estrategia:'VCALL', ticker:'NU', venc:46199, strike:13, prima:9, obj_pct:45, precio100:1300 },
  ]

  const toOp = (r, cuenta) => calcOp({
    id: uid(), cuenta,
    estado: r.estado,
    fecha_apertura: excelDate(r.fecha),
    estrategia: r.estrategia,
    ticker: r.ticker,
    vencimiento: excelDate(r.venc),
    strike: r.strike || null,
    prima: r.prima || null,      // total contrato en $
    objetivo_pct: r.obj_pct || 45,
    margen: null,
    fecha_cierre: r.cierre ? excelDate(r.cierre) : null,
    // precio_cierre = total pagado al cerrar = prima_total - beneficio
    precio_cierre: r.estado === 'CERRADA' && r.prima && r.benef != null
      ? parseFloat((r.prima - r.benef).toFixed(2))
      : null,
    beneficio: r.benef != null ? r.benef : null,
    adjudicacion: r.adj || null,
    notas: ''
  })

  return [
    ...pRaw.map(r => toOp(r, 'pablo')),
    ...mRaw.map(r => toOp(r, 'maria'))
  ]
}

// ── Estado vacío formulario ──────────────────────────────────────
const EMPTY = {
  cuenta: 'pablo', estado: 'ABIERTA', fecha_apertura: new Date().toISOString().slice(0,10),
  estrategia: 'VPUT', ticker: '', vencimiento: '', strike: '', prima: '', objetivo_pct: 45,
  contratos: 1, margen: '', comision: '', fecha_cierre: '', precio_cierre: '', adjudicacion: '', beneficio: '', notas: ''
}

// ══════════════════════════════════════
// COMPONENTES
// ══════════════════════════════════════
function Badge({ text, color, bg }) {
  return (
    <span style={{ background: bg || color + '22', color, border: `1px solid ${color}40`,
      borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {text}
    </span>
  )
}

function Input({ label, value, onChange, type = 'text', step, placeholder, small }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {label && <label style={{ fontSize: 10, color: C.dim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</label>}
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} step={step}
        placeholder={placeholder}
        style={{ background: C.bg, border: `1px solid ${C.brd}`, color: C.txt, borderRadius: 6,
          padding: '7px 10px', fontSize: small ? 12 : 13, outline: 'none', width: '100%', boxSizing: 'border-box' }}
        onFocus={e => e.target.style.borderColor = C.acc}
        onBlur={e => e.target.style.borderColor = C.brd} />
    </div>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {label && <label style={{ fontSize: 10, color: C.dim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ background: C.surf, border: `1px solid ${C.brd}`, color: C.txt, borderRadius: 6,
          padding: '7px 10px', fontSize: 13, outline: 'none', width: '100%' }}>
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  )
}

// Cuenta atrás a vencimiento
const diasVence = venc => {
  if (!venc) return null
  return Math.ceil((new Date(venc + 'T23:59:59') - new Date()) / 86400000)
}
const mesCierre = d => d ? new Date(d).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }).replace(' ', "'") : null

const GRID = '80px 55px 65px 75px 50px 60px 60px 75px 85px 75px 60px 75px 35px'

// Tabla de operaciones
function OpRow({ op, onEdit, onDelete, onClose, isNew }) {
  const [exp, setExp] = useState(false)
  const neg = op.beneficio != null && op.beneficio < 0
  const colBenef = op.beneficio == null ? C.dim : neg ? C.red : C.grn

  // Cuenta atrás a vencimiento
  const dv = op.estado === 'ABIERTA' ? diasVence(op.vencimiento) : null
  const alertaVence = dv != null && dv <= 15
  const colVence = dv == null ? null : dv <= 0 ? C.red : dv <= 15 ? '#f97316' : dv <= 30 ? C.gold : C.mut

  return (
    <div style={{ borderBottom: `1px solid ${C.brd}`, transition: 'background .1s',
      ...(isNew && { boxShadow: `inset 3px 0 0 ${C.grn}`, background: C.grn + '08' }),
      ...(alertaVence && !isNew && { boxShadow: `inset 3px 0 0 ${dv <= 0 ? C.red : '#f97316'}` }) }}
      onMouseEnter={e => e.currentTarget.style.background = isNew ? C.grn + '15' : C.surf2}
      onMouseLeave={e => e.currentTarget.style.background = isNew ? C.grn + '08' : 'transparent'}>
      <div onClick={() => setExp(e => !e)}
        style={{ display: 'grid', gridTemplateColumns: GRID,
          gap: 8, padding: '8px 12px', cursor: 'pointer', alignItems: 'center', fontSize: 12 }}>
        <span style={{ color: C.dim, fontSize: 11 }}>{fmtDate(op.fecha_apertura)}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Badge text={op.ticker} color={C.acc} />
          {op.contratos > 1 && <span style={{ fontSize: 9, color: C.gold, fontWeight: 700 }}>×{op.contratos}</span>}
          {isNew && <span style={{ fontSize: 8, background: C.grn, color: '#000', borderRadius: 3, padding: '1px 4px', fontWeight: 800 }}>NEW</span>}
        </span>
        <Badge text={op.estrategia} color={estratColor(op.estrategia)} />
        <span style={{ color: C.dim, fontSize: 11 }}>{fmtDate(op.vencimiento)}</span>
        <span style={{ color: C.txt, textAlign: 'right' }}>{op.strike ?? '—'}</span>
        <span style={{ color: C.gold, textAlign: 'right' }}>{op.prima != null ? fmtNum(op.prima) : '—'}</span>
        <span style={{ color: C.dim, textAlign: 'right', fontSize: 11 }}>{op.obj_precio != null ? fmtNum(op.obj_precio) : '—'}</span>
        <span style={{ color: colBenef, textAlign: 'right', fontWeight: op.beneficio != null ? 700 : 400 }}>
          {op.beneficio != null ? `${op.beneficio >= 0 ? '+' : ''}${fmtNum(op.beneficio)}` : '—'}
        </span>
        <span style={{ color: colBenef, textAlign: 'right', fontSize: 11 }}>
          {op.rent_anual != null ? fmtPct(op.rent_anual) : '—'}
        </span>
        {/* Fecha cierre */}
        <span style={{ color: C.dim, fontSize: 11, textAlign: 'center' }}>
          {op.fecha_cierre ? fmtDate(op.fecha_cierre) : '—'}
        </span>
        {/* Columna combinada: VENCE (abierta) o MES CIERRE (cerrada) */}
        {op.estado === 'ABIERTA' ? (
          dv != null ? (
            <span style={{ textAlign: 'center' }}>
              <span style={{ background: alertaVence ? colVence + '22' : 'transparent',
                border: alertaVence ? `1px solid ${colVence}` : 'none',
                color: colVence, borderRadius: 4, padding: alertaVence ? '1px 5px' : 0,
                fontSize: 11, fontWeight: alertaVence ? 700 : 400 }}>
                {dv <= 0 ? '⚠️ VENC' : `${dv}d`}
              </span>
            </span>
          ) : <span style={{ color: C.dim, textAlign: 'center' }}>—</span>
        ) : (
          <span style={{ color: C.dim, fontSize: 11, textAlign: 'center' }}>
            {mesCierre(op.fecha_cierre) ?? '—'}
          </span>
        )}
        <Badge text={op.estado === 'ABIERTA' ? '🟢 ABIERTA' : '⚫ CERRADA'}
          color={op.estado === 'ABIERTA' ? C.grn : C.mut} />
        <span style={{ color: C.dim }}>{exp ? '▲' : '▼'}</span>
      </div>

      {exp && (
        <div style={{ background: C.surf, margin: '0 8px 8px', borderRadius: 8, padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: 10, marginBottom: 10 }}>
            {[
              ['Fecha apertura', fmtDate(op.fecha_apertura)],
              ['Vencimiento', fmtDate(op.vencimiento)],
              ['Fecha cierre', fmtDate(op.fecha_cierre)],
              ['Strike', op.strike ?? '—'],
              ['Contratos', op.contratos > 1 ? `${op.contratos} contratos` : '1 contrato'],
              ['Comisión apertura', op.comision != null ? `${fmtNum(op.comision)} $` : '—'],
              ['Prima cobrada', op.prima != null ? `${fmtNum(op.prima)} $` : '—'],
              ...(op.contratos > 1 && op.prima != null ? [['Prima / contrato', `${fmtNum(parseFloat((op.prima / op.contratos).toFixed(2)))} $`]] : []),
              ['Precio cierre', op.precio_cierre != null ? `${fmtNum(op.precio_cierre)} $` : '—'],
              ['Objetivo cierre', op.obj_precio != null ? `${fmtNum(op.obj_precio)} $` : '—'],
              ['Margen req.', op.margen != null ? `${fmtNum(op.margen)} $` : '—'],
              ['Exposición (×100)', op.exposicion != null ? `${fmtNum(op.exposicion)} $` : '—'],
              ['Beneficio neto', op.beneficio != null ? `${op.beneficio >= 0 ? '+' : ''}${fmtNum(op.beneficio)} $` : '—'],
              ...(op.contratos > 1 && op.beneficio != null ? [['Beneficio / contrato', `${op.beneficio >= 0 ? '+' : ''}${fmtNum(parseFloat((op.beneficio / op.contratos).toFixed(2)))} $`]] : []),
              ['Rent. total', op.rent_total != null ? fmtPct(op.rent_total) : '—'],
              ['Rent. anualizada', op.rent_anual != null ? fmtPct(op.rent_anual) : '—'],
              ['Días', op.dias ?? '—'],
              ['Adjudicación', op.adjudicacion != null ? `${fmtNum(op.adjudicacion)} $` : '—'],
            ].map(([l, v]) => (
              <div key={l} style={{ background: C.surf2, borderRadius: 6, padding: '6px 10px' }}>
                <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.txt }}>{v}</div>
              </div>
            ))}
          </div>
          {op.notas && <div style={{ fontSize: 11, color: C.dim, fontStyle: 'italic', marginBottom: 10 }}>📝 {op.notas}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onEdit(op)} style={{ padding: '5px 12px', fontSize: 11, background: C.surf2, border: `1px solid ${C.brd}`, color: C.dim, borderRadius: 6, cursor: 'pointer' }}>✏️ Editar</button>
            {op.estado === 'ABIERTA' && (
              <button onClick={() => onClose(op)} style={{ padding: '5px 12px', fontSize: 11, background: C.accD || '#1e3a5f', border: `1px solid ${C.acc}`, color: C.accL || C.acc, borderRadius: 6, cursor: 'pointer' }}>✅ Cerrar</button>
            )}
            <button onClick={() => onDelete(op.id)} style={{ padding: '5px 12px', fontSize: 11, background: '#1c0a0a', border: `1px solid ${C.red}40`, color: C.red, borderRadius: 6, cursor: 'pointer' }}>🗑 Eliminar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Formulario
function OpForm({ initial, onSave, onCancel, titulo }) {
  const [f, setF] = useState(() => ({ ...EMPTY, ...initial }))
  const upd = k => v => setF(p => ({ ...p, [k]: v }))
  const calc = calcOp({ ...f, strike: +f.strike || null, prima: +f.prima || null, objetivo_pct: +f.objetivo_pct || 45,
    margen: +f.margen || null, precio_cierre: +f.precio_cierre || null,
    beneficio: f.beneficio !== '' && f.beneficio != null ? +f.beneficio : null,
    adjudicacion: +f.adjudicacion || null })

  return (
    <div style={{ background: C.surf, borderRadius: 12, padding: 20, maxWidth: 680 }}>
      <div style={{ fontWeight: 700, color: C.txt, marginBottom: 16, fontSize: 14 }}>{titulo}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Select label="Cuenta" value={f.cuenta} onChange={upd('cuenta')}
          options={[{ v: 'pablo', l: '👤 Pablo' }, { v: 'maria', l: '👤 María' }]} />
        <Select label="Estado" value={f.estado} onChange={upd('estado')}
          options={[{ v: 'ABIERTA', l: '🟢 Abierta' }, { v: 'CERRADA', l: '⚫ Cerrada' }]} />
        <Select label="Estrategia" value={f.estrategia} onChange={upd('estrategia')}
          options={[{ v: 'VPUT', l: 'Venta Put' }, { v: 'VCALL', l: 'Venta Call' }, { v: 'CPUT', l: 'Compra Put' }, { v: 'CCALL', l: 'Compra Call' }, { v: 'COMBO', l: 'Combo' }]} />
        <Input label="Ticker" value={f.ticker} onChange={upd('ticker')} placeholder="AAPL, NVDA..." />
        <Input label="Fecha apertura" value={f.fecha_apertura} onChange={upd('fecha_apertura')} type="date" />
        <Input label="Vencimiento" value={f.vencimiento} onChange={upd('vencimiento')} type="date" />
        <Input label="Strike" value={f.strike} onChange={upd('strike')} type="number" step="0.5" />
        <Input label="Prima total contrato ($)" value={f.prima} onChange={upd('prima')} type="number" step="0.01" />
        <Input label="Nº contratos" value={f.contratos ?? 1} onChange={upd('contratos')} type="number" step="1" />
        <Input label="Comisión apertura ($)" value={f.comision ?? ''} onChange={upd('comision')} type="number" step="0.01" placeholder="ej: 0.65" />
        <Input label="Objetivo cierre %" value={f.objetivo_pct} onChange={upd('objetivo_pct')} type="number" step="1" />
        <Input label="Margen requerido ($)" value={f.margen} onChange={upd('margen')} type="number" step="1" />
      </div>

      {/* Preview precio objetivo */}
      {calc.obj_precio != null && (
        <div style={{ background: C.bg, border: `1px solid ${C.gold}40`, borderRadius: 8, padding: '8px 12px', marginBottom: 12, display: 'flex', gap: 20 }}>
          <div><div style={{ fontSize: 9, color: C.dim }}>PRECIO OBJETIVO CIERRE</div><div style={{ fontSize: 16, fontWeight: 700, color: C.gold }}>{fmtNum(calc.obj_precio)}</div></div>
          <div><div style={{ fontSize: 9, color: C.dim }}>EXPOSICIÓN REAL</div><div style={{ fontSize: 16, fontWeight: 700, color: C.dim }}>{fmtNum(calc.exposicion)}</div></div>
        </div>
      )}

      {f.estado === 'CERRADA' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <Input label="Fecha cierre" value={f.fecha_cierre} onChange={upd('fecha_cierre')} type="date" />
          <Input label="Precio cierre total ($)" value={f.precio_cierre} onChange={upd('precio_cierre')} type="number" step="0.01" />
          <Input label="Beneficio neto ($) — opcional" value={f.beneficio} onChange={upd('beneficio')} type="number" step="0.01" />
          <Input label="Adjudicación ($)" value={f.adjudicacion} onChange={upd('adjudicacion')} type="number" step="0.01" />
        </div>
      )}

      {/* Preview resultados */}
      {f.estado === 'CERRADA' && calc.rent_anual != null && (
        <div style={{ background: C.bg, borderRadius: 8, padding: '8px 12px', marginBottom: 12, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[['Beneficio total', `${calc.beneficio >= 0 ? '+' : ''}${fmtNum(calc.beneficio)} $`, calc.beneficio >= 0 ? C.grn : C.red],
            ...((f.contratos > 1) ? [['Por contrato', `${calc.beneficio >= 0 ? '+' : ''}${fmtNum(parseFloat((calc.beneficio / f.contratos).toFixed(2)))} $`, calc.beneficio >= 0 ? C.grn : C.red]] : []),
            ['Rent. total', fmtPct(calc.rent_total), calc.rent_total >= 0 ? C.grn : C.red],
            ['Rent. anual', fmtPct(calc.rent_anual), calc.rent_anual >= 0 ? C.grn : C.red],
            ['Días', `${calc.dias}d`, C.dim]].map(([l, v, col]) => (
            <div key={l}><div style={{ fontSize: 9, color: C.dim }}>{l}</div><div style={{ fontSize: 15, fontWeight: 700, color: col }}>{v}</div></div>
          ))}
        </div>
      )}

      <Input label="Notas" value={f.notas} onChange={upd('notas')} placeholder="Roll, adjudicación, comentarios..." />

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={() => onSave(calcOp({ ...f, strike: +f.strike || null, prima: +f.prima || null,
          contratos: +f.contratos || 1,
          comision: +f.comision || null,
          objetivo_pct: +f.objetivo_pct || 45, margen: +f.margen || null,
          precio_cierre: +f.precio_cierre || null,
          beneficio: f.beneficio !== '' && f.beneficio != null ? +f.beneficio : null,
          adjudicacion: +f.adjudicacion || null }))}
          style={{ flex: 1, background: C.acc, color: '#fff', border: 'none', borderRadius: 8, padding: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          💾 Guardar
        </button>
        <button onClick={onCancel} style={{ padding: '12px 20px', background: C.surf2, border: `1px solid ${C.brd}`, color: C.dim, borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

// Tab resultados por mes
function ResultsTab({ ops, cuenta }) {
  const cerradas = ops.filter(o => o.cuenta === cuenta && o.estado === 'CERRADA' && o.beneficio != null)
  const byMes = {}
  cerradas.forEach(op => {
    // Usar fecha_cierre, y si no existe usar vencimiento como aproximación
    const fechaRef = op.fecha_cierre || op.vencimiento || op.fecha_apertura
    const k = mesKey(fechaRef)
    if (!k) return
    if (!byMes[k]) byMes[k] = { total: 0, count: 0, mes: mesLabel(fechaRef) }
    byMes[k].total = Math.round((byMes[k].total + op.beneficio) * 100) / 100
    byMes[k].count += 1
  })
  const meses = Object.entries(byMes).sort(([a], [b]) => a.localeCompare(b))
  const totalGeneral = meses.reduce((s, [, v]) => s + v.total, 0)
  const promedio = meses.length ? totalGeneral / meses.length : 0

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
        {[['Total acumulado', `${totalGeneral >= 0 ? '+' : ''}${fmtNum(totalGeneral)} $`, totalGeneral >= 0 ? C.grn : C.red],
          ['Promedio mensual', `${promedio >= 0 ? '+' : ''}${fmtNum(promedio)} $`, promedio >= 0 ? C.grn : C.red],
          ['Meses activos', `${meses.length}`, C.acc],
          ['Operaciones cerradas', `${cerradas.length}`, C.dim]].map(([l, v, col]) => (
          <div key={l} style={{ background: C.surf, border: `1px solid ${C.brd}`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: col }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ background: C.surf, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.brd}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px', gap: 8, padding: '10px 16px',
          background: C.surf2, fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase' }}>
          <span>Mes</span><span style={{ textAlign: 'right' }}>Operaciones</span>
          <span style={{ textAlign: 'right' }}>Beneficio</span><span style={{ textAlign: 'right' }}>vs. promedio</span>
        </div>
        {meses.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: C.mut }}>Sin datos todavía</div>}
        {meses.map(([k, v]) => {
          const diff = v.total - promedio
          return (
            <div key={k} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px', gap: 8,
              padding: '10px 16px', borderTop: `1px solid ${C.brd}`, fontSize: 13, alignItems: 'center' }}>
              <span style={{ color: C.txt, fontWeight: 600 }}>{v.mes}</span>
              <span style={{ textAlign: 'right', color: C.dim }}>{v.count}</span>
              <span style={{ textAlign: 'right', fontWeight: 700, color: v.total >= 0 ? C.grn : C.red }}>
                {v.total >= 0 ? '+' : ''}{fmtNum(v.total)} $
              </span>
              <span style={{ textAlign: 'right', fontSize: 11, color: diff >= 0 ? C.grn : C.red }}>
                {diff >= 0 ? '+' : ''}{fmtNum(diff)}
              </span>
            </div>
          )
        })}
        {meses.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px', gap: 8,
            padding: '12px 16px', borderTop: `2px solid ${C.brd}`, background: C.surf2, alignItems: 'center' }}>
            <span style={{ color: C.txt, fontWeight: 800 }}>Promedio mensual</span>
            <span />
            <span style={{ textAlign: 'right', fontWeight: 900, fontSize: 15, color: promedio >= 0 ? C.grn : C.red }}>
              {promedio >= 0 ? '+' : ''}{fmtNum(promedio)} $
            </span>
            <span />
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════
// APP PRINCIPAL
// ══════════════════════════════════════
export default function App() {
  const [ops, setOps] = useState([])
  const [tab, setTab] = useState('pablo')
  const [showForm, setShowForm] = useState(false)
  const [editOp, setEditOp] = useState(null)
  const [closeOp, setCloseOp] = useState(null)
  const [filtro, setFiltro] = useState('TODAS')
  const [mesFiltro, setMesFiltro] = useState('TODOS')
  const [busqueda, setBusqueda] = useState('')
  const [apiKey, setApiKey] = useState(LS.get('ib-api-key') || '')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeMsg, setAnalyzeMsg] = useState('')
  const [showCfg, setShowCfg] = useState(false)
  const [pendingCierres, setPendingCierres] = useState([])  // cola de cierres sin vincular
  const [sortCol, setSortCol] = useState('fecha_apertura')
  const [sortDir, setSortDir] = useState('desc')
  const [ibCuenta, setIbCuenta] = useState('pablo')
  const [eurUsd, setEurUsd] = useState(() => parseFloat(LS.get('eur-usd') || '1.09'))
  const [gbpUsd, setGbpUsd] = useState(() => parseFloat(LS.get('gbp-usd') || '1.27'))
  const [lastBatch, setLastBatch] = useState(new Set()) // IDs del último screenshot
  const [soloNuevas, setSoloNuevas] = useState(false)   // filtro "ver solo nuevas"
  const [githubToken, setGithubToken] = useState(LS.get('gh-token') || '')
  const [gistId, setGistId] = useState(LS.get('gist-id') || '')
  const [syncStatus, setSyncStatus] = useState('')
  const syncTimer = useRef(null)
  const fileRef = useRef()

  // Cargar datos
  // ── GitHub Gist sync (datos entre dispositivos) ──────────────────
  const loadFromGist = async () => {
    const tok = LS.get('gh-token'), id = LS.get('gist-id')
    if (!tok || !id) return null
    try {
      const r = await fetch(`https://api.github.com/gists/${id}`, { headers: { Authorization: `Bearer ${tok}` } })
      if (!r.ok) return null
      const data = await r.json()
      const content = data.files?.['diario-opciones.json']?.content
      return content ? JSON.parse(content) : null
    } catch { return null }
  }

  const syncToGist = async (arr) => {
    const tok = LS.get('gh-token')
    if (!tok) return
    const content = JSON.stringify(arr)
    try {
      let id = LS.get('gist-id')
      if (!id) {
        const r = await fetch('https://api.github.com/gists', {
          method: 'POST',
          headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: 'Diario de Opciones — sync automático', public: false,
            files: { 'diario-opciones.json': { content } } })
        })
        const data = await r.json()
        if (data.id) { LS.set('gist-id', data.id); setGistId(data.id); id = data.id }
      } else {
        await fetch(`https://api.github.com/gists/${id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: { 'diario-opciones.json': { content } } })
        })
      }
      setSyncStatus(`☁️ ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`)
    } catch { setSyncStatus('⚠️ Error sync') }
  }

  useEffect(() => {
    const init = async () => {
      const seed = buildSeed()
      const local = LS.get('diario-ops-v1')
      // Intentar cargar desde Gist (puede tener datos de otro dispositivo)
      const cloud = await loadFromGist()
      // Usar la versión con más ops (la más actualizada)
      let base = local
      if (cloud && Array.isArray(cloud) && cloud.length > (local?.length || 0)) {
        base = cloud
        LS.set('diario-ops-v1', cloud)
        setSyncStatus(`☁️ Cargado desde Gist (${cloud.length} ops)`)
      }
      if (!base || base.length === 0) {
        setOps(seed); LS.set('diario-ops-v1', seed); return
      }
      const fp = o => `${o.cuenta}|${o.estrategia}|${o.ticker}|${o.fecha_apertura}|${o.vencimiento}|${o.strike}`
      const baseSet = new Set(base.map(fp))
      const missing = seed.filter(o => !baseSet.has(fp(o)))
      const merged = [...base, ...missing].map(o => calcOp({ ...o }))
      setOps(merged); LS.set('diario-ops-v1', merged)
    }
    init()
  }, [])

  const persist = arr => {
    setOps(arr); LS.set('diario-ops-v1', arr)
    // Sync a GitHub Gist con debounce de 3s para no saturar la API
    if (syncTimer.current) clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => syncToGist(arr), 3000)
  }
  const cuenta = tab === 'pablo' || tab === 'res-pablo' ? 'pablo' : 'maria'

  // Filtrar operaciones
  const opsTab = ops.filter(o => {
    if (tab === 'pablo' || tab === 'res-pablo') { if (o.cuenta !== 'pablo') return false }
    else if (tab === 'maria' || tab === 'res-maria') { if (o.cuenta !== 'maria') return false }
    else return true
    if (filtro !== 'TODAS' && o.estado !== filtro) return false
    if (mesFiltro !== 'TODOS' && o.estado === 'CERRADA' && o.fecha_cierre?.slice(0,7) !== mesFiltro) return false
    if (busqueda && !o.ticker.toUpperCase().includes(busqueda.toUpperCase())) return false
    if (soloNuevas && !lastBatch.has(o.id)) return false
    return true
  }).sort((a, b) => {
    // Abiertas siempre primero (a menos que se ordene por un campo numérico)
    const numCols = ['beneficio', 'rent_anual', 'prima', 'strike']
    if (!numCols.includes(sortCol)) {
      if (a.estado === 'ABIERTA' && b.estado !== 'ABIERTA') return -1
      if (b.estado === 'ABIERTA' && a.estado !== 'ABIERTA') return 1
    }
    const aVal = a[sortCol], bVal = b[sortCol]
    if (aVal == null && bVal == null) return 0
    if (aVal == null) return 1
    if (bVal == null) return -1
    // Columnas de fecha: comparación directa de strings ISO (yyyy-mm-dd) — evita localeCompare numérico
    const isDateCol = ['fecha_apertura', 'fecha_cierre', 'vencimiento'].includes(sortCol)
    const cmp = isDateCol
      ? (aVal > bVal ? 1 : aVal < bVal ? -1 : 0)
      : typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal
    return sortDir === 'asc' ? cmp : -cmp
  })

  const saveOp = op => {
    const newOp = { ...op, id: op.id || uid() }
    const idx = ops.findIndex(o => o.id === newOp.id)
    const arr = idx >= 0 ? ops.map((o, i) => i === idx ? calcOp(newOp) : o) : [...ops, calcOp(newOp)]
    persist(arr)
    setShowForm(false); setEditOp(null); setCloseOp(null)
    // Avanzar cola de cierres pendientes (sin vincular del screenshot)
    setPendingCierres(prev => {
      const remaining = prev.slice(1)
      if (remaining.length > 0) {
        setEditOp(remaining[0])
        setShowForm(true)
        setAnalyzeMsg(`⚠️ Completar cierre ${remaining.length > 1 ? `(${remaining.length} pendientes)` : ''}: ${remaining[0].ticker} — ${remaining[0].estrategia}`)
      }
      return remaining
    })
  }

  const delOp = id => { if (confirm('¿Eliminar operación?')) persist(ops.filter(o => o.id !== id)) }

  // Analizar screenshot de IB
  const analyzeIB = async (file, cuentaParam) => {
    const key = apiKey || LS.get('ib-api-key')
    const cuentaTarget = cuentaParam || cuenta
    if (!key) { setAnalyzeMsg('❌ Añade la API key en ⚙️'); return }
    setAnalyzing(true); setAnalyzeMsg('Analizando screenshot...')
    try {
      const data = await fileToB64(file)
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 1000, temperature: 0,
          messages: [{ role: 'user', content: [
            { type: 'text', text: `INSTRUCCIONES CRÍTICAS — lee esto ANTES de ver la imagen.

Para cada card en el screenshot de IB mobile, sigue OBLIGATORIAMENTE estos 2 pasos:

PASO 1 — ¿Hay número con COLOR al final del card?
  Busca si existe una cifra en VERDE (ej: $118.59, $16.43, $0.9) o ROJO (ej: -$80.75) al final de la card.
  - SÍ existe color → es un CIERRE
  - NO existe color (solo precios en gris) → es una APERTURA

PASO 2 — Asigna la estrategia según la tabla:

  Acción   | PASO1    | tipo     | Put  | Call
  ---------|----------|----------|------|------
  Vendido  | NO color | APERTURA | VPUT | VCALL
  Comprado | NO color | APERTURA | CPUT | CCALL
  Vendido  | SÍ color | CIERRE   | CPUT | CCALL
  Comprado | SÍ color | CIERRE   | VPUT | VCALL
  Expired  | verde    | CIERRE   | VPUT | VCALL  ← IB ya muestra PyG neto correcto, úsalo
  Expired  | rojo     | CIERRE   | CPUT | CCALL  ← ídem
  Assigned | $0       | CIERRE   | VPUT | VCALL  (assigned=true, beneficio=0, la app lo calcula)

EJEMPLOS con sus resultados:
- MA JUL17 465 Put / Comprado 1 / $200 / $118.59 VERDE → PASO1=SÍ → CIERRE VPUT, beneficio=118.59, precio_cierre=200
- CMCSA JUL17 24 Put / Comprado 1 / $158 / $0.9 VERDE → PASO1=SÍ → CIERRE VPUT, beneficio=0.9, precio_cierre=158
- PYPL Expired 1 / $0 / $16.43 VERDE → PASO1=SÍ → CIERRE VCALL, beneficio=16.43, precio_cierre=0, assigned=false
- NU Assigned 1 / $0 → sin PyG → CIERRE VCALL, assigned=true, beneficio=0
- BLK JUL17 910 Put / Vendido 1 / $900 / sin color → PASO1=NO → APERTURA VPUT, prima=900

FECHAS: múltiples secciones posibles. Usa la fecha de cada sección para cada card.
⚠️ Líneas como "June 26, 2026 €104.17" son TOTALES DIARIOS — ignóralas.

SÍMBOLO: "JUL 17 '26 465 Put" → vencimiento=2026-07-17, strike=465, Put
MONEDA: $=USD, €=EUR, £=GBP
contratos = número tras Vendido/Comprado/Assigned/Expired

VALORES:
- CIERRE: beneficio=color final, precio_cierre=total gris, prima=0
- APERTURA: prima=total gris, beneficio=0, precio_cierre=0
- Número pequeño cursiva ($0.63, $1.05) = comisión → NO incluir

Ahora analiza la imagen siguiente y devuelve SOLO JSON sin texto adicional ni backticks:
[{"tipo":"APERTURA o CIERRE","estrategia":"VPUT/VCALL/CPUT/CCALL","ticker":"","fecha":"YYYY-MM-DD","vencimiento":"YYYY-MM-DD","strike":0,"contratos":1,"prima":0,"precio_cierre":0,"beneficio":0,"moneda":"USD","assigned":false,"notas":""}]` },
            { type: 'image', source: { type: 'base64', media_type: file.type || 'image/png', data } },
            { type: 'text', text: `Aplica exactamente las instrucciones anteriores a esta imagen.

ESTRUCTURA DE CADA CARD:
- Línea 1: TICKER + exchange
- Línea 2: símbolo (ej: JUL 17 '26 85 Call, JUN 26 '26 127 Call)
- Línea 3: acción + contratos (Vendido 1, Comprado 2, Assigned 1, Expired 1)
- Derecha arriba: precio por acción en negrita
- Derecha medio gris: TOTAL del contrato → precio_cierre o prima
- Derecha pequeño cursiva: comisión IB → IGNORAR
- Derecha CON COLOR (verde o rojo): PyG realizado → beneficio

TABLA DE CLASIFICACIÓN — aplica fila a fila sin excepciones:

Acción   | P&L colorido | tipo     | Put  | Call
---------|--------------|----------|------|------
Vendido  | NO           | APERTURA | VPUT | VCALL
Comprado | NO           | APERTURA | CPUT | CCALL
Vendido  | SÍ           | CIERRE   | CPUT | CCALL
Comprado | SÍ           | CIERRE   | VPUT | VCALL
Assigned | cualquiera   | CIERRE   | VPUT | VCALL  (assigned=true)
Expired  | cualquiera   | CIERRE   | CPUT | CCALL  (assigned=true)

EJEMPLOS CONCRETOS:
- "ACN JUN 26 127 Call / Comprado 1 / $50 / $64.5 verde" → CIERRE, estrategia=VCALL, beneficio=64.5, precio_cierre=50
- "MA JUL 17 465 Put / Comprado 1 / $210 / $263.31 verde" → CIERRE, estrategia=VPUT, beneficio=263.31, precio_cierre=210
- "ACN JUN 26 128 Call / Vendido 1 / $31 / sin PyG" → APERTURA, estrategia=VCALL, prima=31
- "ACN JUN 26 128 Call / Assigned 1 / $0" → CIERRE, estrategia=VCALL, beneficio=0
- "BLK JUL 17 910 Put / Vendido 1 / $900 / sin PyG" → APERTURA, estrategia=VPUT, prima=900
- "CMCSA JUN 26 25 Put / Comprado 1 / $206 / -$80.75 rojo" → CIERRE, estrategia=VPUT, beneficio=-80.75, precio_cierre=206

FECHAS: puede haber varias secciones de fechas distintas. Cada operación usa la fecha de su sección.
⚠️ Las líneas "June 27, 2026 $64.5" son TOTALES DIARIOS — ignóralas completamente.

SÍMBOLO: "JUL 17 '26 85 Call" → vencimiento=2026-07-17, strike=85

MONEDA: $=USD, €=EUR, £=GBP
contratos = número tras Vendido/Comprado/Assigned/Expired

VALORES:
- CIERRE: beneficio=P&L colorido (con signo), precio_cierre=total gris, prima=0
- APERTURA: prima=total gris, beneficio=0, precio_cierre=0
- Número pequeño cursiva = comisiones → NO incluir

Devuelve SOLO un array JSON sin texto adicional ni backticks:
[{"tipo":"APERTURA o CIERRE","estrategia":"VPUT/VCALL/CPUT/CCALL","ticker":"","fecha":"YYYY-MM-DD","vencimiento":"YYYY-MM-DD","strike":0,"contratos":1,"prima":0,"precio_cierre":0,"beneficio":0,"moneda":"USD","assigned":false,"notas":""}]

assigned=true ÚNICAMENTE para acción "Assigned". Para "Expired" usa assigned=false y pon el beneficio verde de IB en el campo beneficio.` }
          ]}]
        })
      })
      const d = await resp.json()
      if (d.error) throw new Error(d.error.message)
      const raw = d.content?.[0]?.text || ''
      // Parser robusto: elimina markdown, encuentra el JSON válido por conteo de llaves
      const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim()
      function extractJSON(text) {
        try { return JSON.parse(text) } catch {}
        for (const startChar of ['[', '{']) {
          const start = text.indexOf(startChar)
          if (start === -1) continue
          let depth = 0, inStr = false, esc = false
          for (let i = start; i < text.length; i++) {
            const ch = text[i]
            if (esc) { esc = false; continue }
            if (ch === '\\' && inStr) { esc = true; continue }
            if (ch === '"') { inStr = !inStr; continue }
            if (inStr) continue
            if (ch === '[' || ch === '{') depth++
            if (ch === ']' || ch === '}') { depth--; if (depth === 0) { try { const r = JSON.parse(text.slice(start, i + 1)); return r } catch {} } }
          }
        }
        throw new Error('No se encontró JSON válido en la respuesta')
      }
      const extracted = extractJSON(cleaned)
      const resultados = Array.isArray(extracted) ? extracted : [extracted]

      // Conversión de moneda: EUR y GBP → USD
      const rates = { USD: 1, EUR: eurUsd, GBP: gbpUsd }
      let convertidas = 0
      resultados.forEach(r => {
        const rate = rates[r.moneda] || 1
        if (r.moneda && r.moneda !== 'USD' && rate !== 1) {
          const conv = v => v ? Math.round(v * rate * 100) / 100 : v
          r.prima = conv(r.prima); r.precio_cierre = conv(r.precio_cierre); r.beneficio = conv(r.beneficio)
          convertidas++
        }
      })

      // Procesar cada operación extraída
      const aperturas = [], cierresVinculados = [], cierresSinVincular = [], actualizaciones = []
      resultados.forEach(r => {
        if (!r.ticker) return
        if (r.tipo === 'CIERRE' && r.ticker && r.vencimiento) {
          const matchKey = o =>
            o.cuenta === cuentaTarget &&
            o.ticker.toUpperCase() === r.ticker.toUpperCase() &&
            Number(o.strike) === Number(r.strike) &&
            o.vencimiento === r.vencimiento
          const op_abierta = ops.find(o => matchKey(o) && o.estado === 'ABIERTA')
          const op_yacerrada = !op_abierta && ops.find(o => matchKey(o) && o.estado === 'CERRADA')
          if (op_abierta) {
            cierresVinculados.push({
              ...op_abierta,
              fecha_cierre: r.fecha,
              precio_cierre: (r.assigned && !r.beneficio) ? 0 : r.precio_cierre,
              beneficio: r.assigned && !r.beneficio
                ? parseFloat(((op_abierta.prima || 0) - (op_abierta.comision || 0)).toFixed(2))
                : r.beneficio,
              estado: 'CERRADA',
              notas: (r.assigned && !r.beneficio)
                ? `Adjudicación — prima ${op_abierta.prima}$ - comisión ${op_abierta.comision || 0}$ = ${((op_abierta.prima || 0) - (op_abierta.comision || 0)).toFixed(2)}$`
                : (op_abierta.notas || '')
            })
          } else if (op_yacerrada) {
            // Ya cerrada — si el beneficio de IB difiere, corregir automáticamente
            const beneficioDetectado = (r.assigned && !r.beneficio) ? null : r.beneficio
            const difiere = beneficioDetectado != null &&
              Math.abs((op_yacerrada.beneficio || 0) - beneficioDetectado) > 0.01
            if (difiere) {
              // Lista separada — se aplica sin pasar por el filtro ABIERTA
              actualizaciones.push({
                ...op_yacerrada,
                beneficio: beneficioDetectado,
                precio_cierre: r.precio_cierre || op_yacerrada.precio_cierre,
                notas: `Beneficio corregido desde IB: ${beneficioDetectado}$ (antes: ${op_yacerrada.beneficio}$)`
              })
            } else {
              cierresSinVincular.push({ ...op_yacerrada, _yacerrada: true, fecha_cierre: r.fecha, precio_cierre: r.precio_cierre, beneficio: r.beneficio })
            }
          } else {
            cierresSinVincular.push({ id: uid(), cuenta: cuentaTarget, estado: 'CERRADA', estrategia: r.estrategia, ticker: r.ticker,
              fecha_apertura: '', vencimiento: r.vencimiento, strike: r.strike, prima: r.prima || 0,
              objetivo_pct: 45, contratos: r.contratos || 1, fecha_cierre: r.fecha,
              precio_cierre: r.assigned ? 0 : r.precio_cierre,
              beneficio: r.assigned ? (r.prima || null) : r.beneficio,
              notas: r.assigned ? 'Adjudicación — introduce la prima original cobrada como beneficio' : (r.notas || '') })
          }
        } else {
          aperturas.push(calcOp({ id: uid(), cuenta: cuentaTarget, estado: 'ABIERTA', estrategia: r.estrategia, ticker: r.ticker,
            fecha_apertura: r.fecha, vencimiento: r.vencimiento, strike: r.strike, prima: r.prima,
            objetivo_pct: 45, contratos: r.contratos || 1, margen: null, fecha_cierre: null, precio_cierre: null, beneficio: null, adjudicacion: null, notas: r.notas || '' }))
        }
      })
      const convMsg = convertidas > 0 ? ` (${convertidas} op${convertidas > 1 ? 's' : ''} convertida${convertidas > 1 ? 's' : ''} de ${resultados.find(r => r.moneda && r.moneda !== 'USD')?.moneda || '?'} a USD)` : ''

      // ── Detección de duplicados ──────────────────────────────────
      // Fingerprint: misma cuenta+estrategia+ticker+fecha_apertura+vencimiento+strike
      const fpOp = o => `${o.cuenta}|${o.estrategia}|${o.ticker}|${o.fecha_apertura}|${o.vencimiento}|${o.strike}`
      const existingFps = new Set(ops.map(fpOp))
      const aperturasSinDup = aperturas.filter(a => !existingFps.has(fpOp(a)))
      const dupCount = aperturas.length - aperturasSinDup.length
      const dupMsg = dupCount > 0 ? ` (${dupCount} duplicada${dupCount > 1 ? 's' : ''} ignorada${dupCount > 1 ? 's' : ''})` : ''

      // Cierres vinculados: solo aplicar si la op sigue ABIERTA (evita re-cerrar)
      const cierresVinculadosValidos = cierresVinculados.filter(c => {
        const orig = ops.find(o => o.id === c.id)
        return orig && orig.estado === 'ABIERTA'
      })
      const dupCierres = cierresVinculados.length - cierresVinculadosValidos.length

      let currentOps = ops
      const batchIds = new Set()

      // Guardar aperturas (sin duplicados)
      if (aperturasSinDup.length > 0) {
        aperturasSinDup.forEach(a => batchIds.add(a.id))
        currentOps = [...currentOps, ...aperturasSinDup]
        persist(currentOps)
        setAnalyzeMsg(`✅ ${aperturasSinDup.length} apertura(s) [${cuentaTarget}]: ${aperturasSinDup.map(a => a.ticker).join(', ')}${dupMsg}${convMsg}`)
      } else if (dupCount > 0) {
        setAnalyzeMsg(`ℹ️ ${dupCount} apertura(s) ya existían — no se duplicaron`)
      }

      // Aplicar cierres vinculados (de ABIERTAS)
      if (cierresVinculadosValidos.length > 0) {
        cierresVinculadosValidos.forEach(c => batchIds.add(c.id))
        currentOps = currentOps.map(o => {
          const c = cierresVinculadosValidos.find(c => c.id === o.id)
          return c ? calcOp(c) : o
        })
        persist(currentOps)
        let msg = `✅ ${cierresVinculadosValidos.length} cierre(s) [${cuentaTarget}]: ${cierresVinculadosValidos.map(c => c.ticker).join(', ')}`
        if (dupCierres > 0) msg += ` (${dupCierres} ya cerradas sin cambios)`
        msg += convMsg
        setAnalyzeMsg(prev => (prev ? prev + ' · ' : '') + msg)
      }

      // Aplicar correcciones de beneficio (ya-cerradas con beneficio incorrecto)
      if (actualizaciones.length > 0) {
        actualizaciones.forEach(a => batchIds.add(a.id))
        currentOps = currentOps.map(o => {
          const a = actualizaciones.find(a => a.id === o.id)
          return a ? calcOp(a) : o
        })
        persist(currentOps)
        setAnalyzeMsg(prev => (prev ? prev + ' · ' : '') +
          `🔄 ${actualizaciones.length} beneficio(s) corregido(s) [${cuentaTarget}]: ${actualizaciones.map(a => a.ticker).join(', ')}`)
      }

      // Actualizar el último batch para resaltado
      if (batchIds.size > 0) {
        setLastBatch(batchIds)
        setSoloNuevas(true) // auto-filtrar a las nuevas
      }

      // Cierres sin vincular → separar los ya cerrados (solo avisar) de los nuevos (formulario)
      const yacerradas = cierresSinVincular.filter(c => c._yacerrada)
      const realesNuevos = cierresSinVincular.filter(c => !c._yacerrada)

      if (yacerradas.length > 0) {
        setAnalyzeMsg(prev => (prev ? prev + ' · ' : '') +
          `ℹ️ ${yacerradas.length} ya cerrada(s) — se ignoran: ${yacerradas.map(c => c.ticker).join(', ')}`)
      }

      if (realesNuevos.length > 0) {
        setPendingCierres(realesNuevos)
        setEditOp(realesNuevos[0])
        setShowForm(true)
        const pendMsg = realesNuevos.length > 1
          ? `⚠️ ${realesNuevos.length} cierres sin posición abierta [${cuentaTarget}] — completar uno a uno: ${realesNuevos.map(c => c.ticker).join(', ')}${convMsg}`
          : `⚠️ Cierre sin posición abierta [${cuentaTarget}]: ${realesNuevos[0].ticker} — completa los datos${convMsg}`
        setAnalyzeMsg(prev => (prev ? prev + ' · ' : '') + pendMsg)
      }
      if (aperturasSinDup.length === 0 && cierresVinculadosValidos.length === 0 && realesNuevos.length === 0 && dupCount === 0 && yacerradas.length === 0) {
        setAnalyzeMsg('⚠️ No se encontraron operaciones nuevas en la imagen')
      }
    } catch (e) { setAnalyzeMsg('❌ ' + e.message) }
    finally { setAnalyzing(false) }
  }

  // Meses únicos con operaciones cerradas (para filtro)
  const mesesDisponibles = [...new Set(
    ops.filter(o => o.cuenta === cuenta && o.estado === 'CERRADA' && o.fecha_cierre)
       .map(o => o.fecha_cierre.slice(0, 7))
  )].sort().reverse()

  // Stats rápidas
  const abiertas = ops.filter(o => o.cuenta === cuenta && o.estado === 'ABIERTA')
  const cerradas = ops.filter(o => o.cuenta === cuenta && o.estado === 'CERRADA')
  const benefTotal = cerradas.reduce((s, o) => s + (o.beneficio || 0), 0)

  const NAV = [
    { id: 'pablo', label: '📋 Pablo', group: 'P', color: C.pablo },
    { id: 'maria', label: '📋 María', group: 'M', color: C.maria },
    { id: 'res-pablo', label: '📊 Resultados Pablo', group: 'P', color: C.pablo },
    { id: 'res-maria', label: '📊 Resultados María', group: 'M', color: C.maria },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui,-apple-system,sans-serif', color: C.txt }}>
      {/* HEADER */}
      <div style={{ background: C.surf, borderBottom: `1px solid ${C.brd}`, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-.3px', color: C.txt }}>
            <span style={{ color: C.acc }}>◈</span> Diario de Opciones
          </div>
          <div style={{ fontSize: 10, color: C.dim, marginTop: 1 }}>Interactive Brokers · Options Trading Journal</div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {[
            { l: 'Abiertas', v: abiertas.length, c: C.grn },
            { l: 'Cerradas', v: cerradas.length, c: C.dim },
            { l: 'P&L Total', v: `${benefTotal >= 0 ? '+' : ''}${fmtNum(benefTotal)}$`, c: benefTotal >= 0 ? C.grn : C.red }
          ].map(({ l, v, c }) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: C.dim }}>{l}</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: c }}>{v}</div>
            </div>
          ))}
          <button onClick={() => setShowCfg(c => !c)} style={{ background: 'none', border: `1px solid ${C.brd}`, borderRadius: 6, padding: '5px 10px', color: C.dim, cursor: 'pointer', fontSize: 13 }}>⚙️</button>
        </div>
      </div>

      {/* CONFIG */}
      {showCfg && (
        <>
        <div style={{ background: '#060c18', borderBottom: `1px solid ${C.brd}`, padding: '12px 20px', display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 300, maxWidth: 420 }}>
            <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>🔑 Anthropic API Key</label>
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              style={{ width: '100%', background: C.bg, border: `1px solid ${C.brd}`, color: C.txt, borderRadius: 6, padding: '8px 10px', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>EUR/USD</label>
            <input type="number" step="0.01" value={eurUsd} onChange={e => setEurUsd(parseFloat(e.target.value) || 1.09)}
              style={{ width: 80, background: C.bg, border: `1px solid ${C.brd}`, color: C.gold, borderRadius: 6, padding: '8px 10px', fontSize: 12, outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>GBP/USD</label>
            <input type="number" step="0.01" value={gbpUsd} onChange={e => setGbpUsd(parseFloat(e.target.value) || 1.27)}
              style={{ width: 80, background: C.bg, border: `1px solid ${C.brd}`, color: C.gold, borderRadius: 6, padding: '8px 10px', fontSize: 12, outline: 'none' }} />
          </div>
          <button onClick={() => { LS.set('ib-api-key', apiKey); LS.set('eur-usd', eurUsd); LS.set('gbp-usd', gbpUsd); setShowCfg(false) }}
            style={{ padding: '8px 16px', background: C.acc, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            💾 Guardar
          </button>
        </div>
        {/* Segunda fila: gestión de datos */}
        <div style={{ background: '#060c18', borderBottom: `1px solid ${C.brd}`, padding: '10px 20px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', marginRight: 4 }}>📦 Datos:</span>

          {/* Exportar backup */}
          <button onClick={() => {
            const blob = new Blob([JSON.stringify(ops, null, 2)], { type: 'application/json' })
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
            a.download = `diario-opciones-backup-${new Date().toISOString().slice(0,10)}.json`
            a.click(); URL.revokeObjectURL(a.href)
          }} style={{ padding: '6px 12px', background: C.surf2, border: `1px solid ${C.grn}`, color: C.grn, borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
            ⬇ Exportar backup
          </button>

          {/* Importar backup */}
          <label style={{ padding: '6px 12px', background: C.surf2, border: `1px solid ${C.acc}`, color: C.acc, borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
            ⬆ Importar backup
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => {
              const f = e.target.files[0]; if (!f) return
              const r = new FileReader()
              r.onload = ev => {
                try {
                  const data = JSON.parse(ev.target.result)
                  if (!Array.isArray(data)) { alert('JSON inválido: debe ser un array'); return }
                  if (confirm(`¿Restaurar ${data.length} operaciones? Esto sobreescribirá los datos actuales.`)) {
                    persist(data.map(o => calcOp({ ...o })))
                    setShowCfg(false)
                    alert(`✅ ${data.length} operaciones restauradas`)
                  }
                } catch { alert('Error al leer el archivo JSON') }
              }
              r.readAsText(f); e.target.value = ''
            }} />
          </label>

          {/* Purgar duplicados */}
          <button onClick={() => {
            const fp = o => `${o.cuenta}|${o.estrategia}|${o.ticker}|${o.fecha_apertura}|${o.vencimiento}|${o.strike}`
            const seen = new Set(); const limpias = []
            ops.forEach(o => { const k = fp(o); if (!seen.has(k)) { seen.add(k); limpias.push(o) } })
            const removed = ops.length - limpias.length
            if (removed === 0) { alert('✅ No hay duplicados'); return }
            if (confirm(`Eliminar ${removed} operación(es) duplicada(s)?`)) { persist(limpias); alert(`✅ ${removed} duplicada(s) eliminada(s)`) }
          }} style={{ padding: '6px 12px', background: C.surf2, border: `1px solid ${C.gold}`, color: C.gold, borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
            🧹 Purgar duplicados
          </button>

          {/* Reset al seed */}
          <button onClick={() => {
            if (confirm('⚠️ ¿Reset completo al seed? Se perderán todas las operaciones añadidas manualmente. Exporta un backup primero si lo necesitas.')) {
              const seed = buildSeed()
              persist(seed)
              setShowCfg(false)
              alert(`✅ Reset al seed: ${seed.length} operaciones`)
            }
          }} style={{ padding: '6px 12px', background: C.surf2, border: `1px solid ${C.red}`, color: C.red, borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
            🗑 Reset al seed
          </button>

          <span style={{ fontSize: 10, color: C.dim, marginLeft: 4 }}>{ops.length} ops en memoria</span>
        </div>
        {/* Tercera fila: sync entre dispositivos */}
        <div style={{ background: '#060c18', borderBottom: `1px solid ${C.brd}`, padding: '10px 20px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: C.acc, fontWeight: 700, textTransform: 'uppercase', marginRight: 4 }}>☁️ Sync entre PCs:</span>
          <div style={{ flex: 1, minWidth: 280, maxWidth: 420 }}>
            <input type="password" value={githubToken} onChange={e => setGithubToken(e.target.value)}
              placeholder="GitHub Personal Access Token (scope: gist)"
              style={{ width: '100%', background: C.bg, border: `1px solid ${C.brd}`, color: C.txt, borderRadius: 6, padding: '6px 10px', fontSize: 11, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          {gistId && <span style={{ fontSize: 10, color: C.grn }}>Gist: {gistId.slice(0,8)}…</span>}
          <span style={{ fontSize: 11, color: syncStatus.includes('⚠️') ? '#f97316' : C.grn }}>{syncStatus}</span>
          <button onClick={() => { LS.set('gh-token', githubToken); syncToGist(ops) }}
            style={{ padding: '6px 12px', background: C.surf2, border: `1px solid ${C.acc}`, color: C.acc, borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
            {gistId ? '☁️ Sync ahora' : '☁️ Conectar'}
          </button>
          <a href="https://github.com/settings/tokens/new?scopes=gist&description=DiarioOpciones" target="_blank"
            style={{ fontSize: 10, color: C.dim }}>¿Cómo obtener el token?</a>
        </div>
        </>
      )}

      {/* TABS */}
      <div style={{ background: C.surf, borderBottom: `1px solid ${C.brd}`, display: 'flex', overflowX: 'auto' }}>
        {NAV.map((t, i) => (
          <button key={t.id} onClick={() => { setTab(t.id); setShowForm(false) }}
            style={{ padding: '11px 18px', fontSize: 12, fontWeight: 500, cursor: 'pointer', background: 'none', border: 'none',
              borderBottom: tab === t.id ? `2.5px solid ${t.color}` : '2.5px solid transparent',
              color: tab === t.id ? t.color : C.dim, whiteSpace: 'nowrap',
              borderLeft: i > 0 && NAV[i-1].group !== t.group ? `1px solid ${C.brd}` : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 16px' }}>

        {/* RESULTADOS */}
        {(tab === 'res-pablo' || tab === 'res-maria') && (
          <ResultsTab ops={ops} cuenta={tab === 'res-pablo' ? 'pablo' : 'maria'} />
        )}

        {/* OPERACIONES */}
        {(tab === 'pablo' || tab === 'maria') && (
          <div>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => { setEditOp(null); setShowForm(true) }}
                style={{ padding: '8px 16px', background: C.acc, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                + Nueva operación
              </button>

              {/* IB Screenshot con selector de cuenta */}
              <div style={{ display: 'flex', gap: 0, alignItems: 'center', border: `1px solid ${C.brd}`, borderRadius: 8, overflow: 'hidden' }}>
                <select value={ibCuenta} onChange={e => setIbCuenta(e.target.value)}
                  style={{ background: C.surf2, border: 'none', borderRight: `1px solid ${C.brd}`, color: ibCuenta === 'pablo' ? C.pablo : C.maria, padding: '8px 10px', fontSize: 12, outline: 'none', cursor: 'pointer', fontWeight: 700 }}>
                  <option value="pablo">👤 Pablo</option>
                  <option value="maria">👤 María</option>
                </select>
                <button onClick={() => fileRef.current?.click()} disabled={analyzing}
                  style={{ padding: '8px 14px', background: C.surf2, border: 'none', color: C.dim, cursor: 'pointer', fontSize: 12 }}>
                  {analyzing ? '⏳ Analizando...' : '📸 Subir screenshot IB'}
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files[0]; if (f) { analyzeIB(f, ibCuenta); e.target.value = '' } }} />

              {/* Filtros estado */}
              {['TODAS', 'ABIERTA', 'CERRADA'].map(f => (
                <button key={f} onClick={() => { setFiltro(f); if (f !== 'CERRADA') setMesFiltro('TODOS') }}
                  style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${filtro === f ? C.acc : C.brd}`, background: filtro === f ? C.acc + '22' : 'transparent', color: filtro === f ? C.acc : C.dim }}>
                  {f}
                </button>
              ))}

              {/* Filtro por mes (solo visible cuando hay cerradas) */}
              {(filtro === 'CERRADA' || filtro === 'TODAS') && mesesDisponibles.length > 0 && (
                <select value={mesFiltro} onChange={e => setMesFiltro(e.target.value)}
                  style={{ background: C.surf2, border: `1px solid ${mesFiltro !== 'TODOS' ? C.gold : C.brd}`, color: mesFiltro !== 'TODOS' ? C.gold : C.dim, borderRadius: 20, padding: '5px 12px', fontSize: 11, outline: 'none', cursor: 'pointer' }}>
                  <option value="TODOS">📅 Todos los meses</option>
                  {mesesDisponibles.map(m => {
                    const label = new Date(m + '-15').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
                    return <option key={m} value={m}>{label}</option>
                  })}
                </select>
              )}

              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar ticker..."
                style={{ background: C.surf, border: `1px solid ${C.brd}`, color: C.txt, borderRadius: 20, padding: '6px 14px', fontSize: 12, outline: 'none', width: 140 }} />

              {/* Filtro últimas operaciones del screenshot */}
              {lastBatch.size > 0 && (
                <button onClick={() => setSoloNuevas(v => !v)}
                  style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${soloNuevas ? C.grn : C.brd}`,
                    background: soloNuevas ? C.grn + '22' : 'transparent',
                    color: soloNuevas ? C.grn : C.dim }}>
                  {soloNuevas ? `📸 Nuevas (${lastBatch.size}) ✓` : `📸 Ver nuevas (${lastBatch.size})`}
                </button>
              )}

              <span style={{ fontSize: 11, color: C.dim }}>{opsTab.length} operaciones</span>
            </div>

            {/* Mensaje análisis */}
            {analyzeMsg && (
              <div style={{ background: analyzeMsg.startsWith('❌') ? '#1c0a0a' : analyzeMsg.startsWith('⚠️') ? '#1c1400' : '#0a1c0a',
                border: `1px solid ${analyzeMsg.startsWith('❌') ? C.red : analyzeMsg.startsWith('⚠️') ? C.gold : C.grn}40`,
                borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: analyzeMsg.startsWith('❌') ? C.red : analyzeMsg.startsWith('⚠️') ? C.gold : C.grn }}>
                {analyzeMsg}
              </div>
            )}

            {/* Formulario nueva/editar */}
            {showForm && (
              <div style={{ marginBottom: 16 }}>
                {pendingCierres.length > 0 && (
                  <div style={{ background: C.gold + '18', border: `1px solid ${C.gold}40`, borderRadius: 8, padding: '8px 14px', marginBottom: 8, fontSize: 12, color: C.gold, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>📋 Cierre sin vincular {pendingCierres.length > 1 ? `${pendingCierres.indexOf(editOp) + 1} de ${pendingCierres.length}` : ''}: <strong>{editOp?.ticker}</strong> — Completa los datos y guarda; se irán mostrando automáticamente</span>
                    <button onClick={() => { setPendingCierres([]); setShowForm(false); setEditOp(null) }}
                      style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 11 }}>✕ Omitir todos</button>
                  </div>
                )}
                <OpForm
                  key={editOp?.id || 'new'}
                  initial={editOp || { ...EMPTY, cuenta }}
                  titulo={pendingCierres.length > 0 && editOp
                    ? `⚠️ Cierre sin vincular${pendingCierres.length > 1 ? ` (${pendingCierres.indexOf(editOp) + 1}/${pendingCierres.length})` : ''}: ${editOp.ticker}`
                    : editOp?.id ? '✏️ Editar operación' : '+ Nueva operación'}
                  onSave={saveOp}
                  onCancel={() => {
                    if (pendingCierres.length > 0) {
                      // En modo cola: omitir este y pasar al siguiente
                      setPendingCierres(prev => {
                        const remaining = prev.slice(1)
                        if (remaining.length > 0) {
                          setEditOp(remaining[0])
                          setShowForm(true)
                          setAnalyzeMsg(`⚠️ Omitido. Siguiente: ${remaining[0].ticker}${remaining.length > 1 ? ` (${remaining.length} pendientes)` : ''}`)
                        } else {
                          setShowForm(false); setEditOp(null)
                          setAnalyzeMsg('ℹ️ Todos los cierres procesados')
                        }
                        return remaining
                      })
                    } else {
                      setShowForm(false); setEditOp(null)
                    }
                  }} />
              </div>
            )}

            {/* Formulario cierre vinculado */}
            {closeOp && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ background: C.grn + '15', border: `1px solid ${C.grn}40`, borderRadius: 8, padding: '8px 14px', marginBottom: 8, fontSize: 12, color: C.grn }}>
                  ✅ Cerrando {closeOp.estrategia} {closeOp.ticker} {closeOp.strike} — operación vinculada automáticamente
                </div>
                <OpForm
                  key={closeOp?.id || 'close'}
                  initial={closeOp}
                  titulo="✅ Cerrar operación"
                  onSave={saveOp}
                  onCancel={() => setCloseOp(null)} />
              </div>
            )}

            {/* Cabecera tabla */}
            <div style={{ background: C.surf, borderRadius: '10px 10px 0 0', border: `1px solid ${C.brd}`, borderBottom: 'none' }}>
              <div style={{ display: 'grid', gridTemplateColumns: GRID,
                gap: 8, padding: '8px 12px', fontSize: 9, color: C.dim, fontWeight: 700, textTransform: 'uppercase' }}>
                {[
                  { h: 'Apertura', col: 'fecha_apertura' },
                  { h: 'Ticker', col: null },
                  { h: 'Estrategia', col: null },
                  { h: 'Vencto.', col: 'vencimiento' },
                  { h: 'Strike', col: 'strike' },
                  { h: 'Prima', col: 'prima' },
                  { h: 'Obj.cierre', col: null },
                  { h: 'Beneficio', col: 'beneficio' },
                  { h: 'Rent.Anual', col: 'rent_anual' },
                  { h: 'F.Cierre', col: 'fecha_cierre' },
                  { h: 'Vence/Mes', col: 'vencimiento' },
                  { h: 'Estado', col: null },
                  { h: '', col: null }
                ].map(({ h, col }) => (
                  <span key={h} onClick={() => {
                    if (!col) return
                    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
                    else { setSortCol(col); setSortDir('desc') }
                  }} style={{
                    textAlign: ['Strike','Prima','Obj.cierre','Beneficio','Rent.Anual','Vence/Mes'].includes(h) ? 'center' : 'left',
                    cursor: col ? 'pointer' : 'default',
                    color: sortCol === col ? C.gold : C.dim,
                    userSelect: 'none'
                  }}>
                    {h}{col && sortCol === col ? (sortDir === 'asc' ? ' ▲' : ' ▼') : col ? ' ⇅' : ''}
                  </span>
                ))}
              </div>
            </div>

            {/* Filas */}
            <div style={{ background: C.surf, border: `1px solid ${C.brd}`, borderTop: 'none', borderRadius: '0 0 10px 10px' }}>
              {opsTab.length === 0 && (
                <div style={{ padding: 32, textAlign: 'center', color: C.mut }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
                  <div>Sin operaciones. Añade una o sube un screenshot de IB.</div>
                </div>
              )}
              {opsTab.map(op => (
                <OpRow key={op.id} op={op}
                  isNew={lastBatch.has(op.id)}
                  onEdit={op => { setEditOp(op); setShowForm(true); setCloseOp(null) }}
                  onDelete={delOp}
                  onClose={op => { setCloseOp({ ...op, estado: 'CERRADA', fecha_cierre: new Date().toISOString().slice(0,10) }); setShowForm(false) }} />
              ))}
            </div>
          </div>
        )}
      </div>
      <style>{`* { box-sizing: border-box } button:focus { outline: none } input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.6) }`}</style>
    </div>
  )
}
