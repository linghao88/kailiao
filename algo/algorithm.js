export const sheetLibrary = [
  { id: 1, name: '标准板 1220×2440', width: 1220, height: 2440 },
  { id: 2, name: '标准板 1220×1830', width: 1220, height: 1830 },
  { id: 3, name: '标准板 915×1830', width: 915, height: 1830 },
  { id: 4, name: '标准板 1500×3000', width: 1500, height: 3000 }
];

export const pipeLibrary = [
  { id: 1, name: '标准管 6000mm', length: 6000 },
  { id: 2, name: '标准管 4000mm', length: 4000 },
  { id: 3, name: '标准管 3000mm', length: 3000 },
  { id: 4, name: '标准管 2000mm', length: 2000 }
];

export function optimizeSheet(stock, pieces, kerf = 0) {
  const allPieces = [];
  pieces.forEach(p => {
    for (let i = 0; i < p.quantity; i++) {
      allPieces.push({ w: p.width, h: p.height, area: p.width * p.height });
    }
  });
  
  allPieces.sort((a, b) => b.area - a.area);
  
  let usedStock = 0;
  let layouts = [];
  let remaining = [...allPieces];
  
  while (remaining.length > 0) {
    const layout = greedyPack(stock.width, stock.height, remaining, kerf);
    layouts.push(layout);
    usedStock++;
    remaining = layout.remaining;
  }
  
  const totalArea = usedStock * stock.width * stock.height;
  const usedArea = allPieces.reduce((sum, p) => sum + p.w * p.h, 0);
  const utilization = totalArea > 0 ? (usedArea / totalArea * 100).toFixed(1) : 0;
  
  return { layouts, usedStock, utilization, totalPieces: allPieces.length, waste: (100 - utilization).toFixed(1), type: 'sheet', stock };
}

function greedyPack(stockW, stockH, pieces, kerf) {
  let placed = [];
  let remaining = [...pieces];
  let freeRects = [{ x: 0, y: 0, w: stockW, h: stockH }];
  
  for (let i = remaining.length - 1; i >= 0; i--) {
    const p = remaining[i];
    let placedFlag = false;
    
    for (let j = 0; j < freeRects.length; j++) {
      const fr = freeRects[j];
      if (tryPlace(p, fr, placed, freeRects, j, kerf)) {
        remaining.splice(i, 1);
        placedFlag = true;
        break;
      }
      
      const rotated = { w: p.h, h: p.w, area: p.w * p.h };
      if (tryPlace(rotated, fr, placed, freeRects, j, kerf)) {
        remaining.splice(i, 1);
        placedFlag = true;
        break;
      }
    }
  }
  
  return { placed, remaining };
}

function tryPlace(p, fr, placed, freeRects, frIdx, kerf) {
  if (p.w <= fr.w && p.h <= fr.h) {
    placed.push({ x: fr.x, y: fr.y, w: p.w, h: p.h });
    freeRects.splice(frIdx, 1);
    
    if (fr.w - p.w - kerf > 0) {
      freeRects.push({ x: fr.x + p.w + kerf, y: fr.y, w: fr.w - p.w - kerf, h: fr.h });
    }
    if (fr.h - p.h - kerf > 0) {
      freeRects.push({ x: fr.x, y: fr.y + p.h + kerf, w: p.w, h: fr.h - p.h - kerf });
    }
    return true;
  }
  return false;
}

export function optimizePipe(stock, pieces, kerf = 0) {
  const allPieces = [];
  pieces.forEach(p => {
    for (let i = 0; i < p.quantity; i++) {
      allPieces.push(p.length);
    }
  });
  
  allPieces.sort((a, b) => b - a);
  
  let usedStock = 0;
  let cuts = [];
  let remaining = [...allPieces];
  
  while (remaining.length > 0) {
    const result = firstFitDecreasing(stock.length, remaining, kerf);
    cuts.push(result.cut);
    usedStock++;
    remaining = result.remaining;
  }
  
  const totalLength = usedStock * stock.length;
  const usedLength = allPieces.reduce((sum, l) => sum + l, 0);
  const utilization = totalLength > 0 ? (usedLength / totalLength * 100).toFixed(1) : 0;
  
  return { cuts, usedStock, utilization, totalPieces: allPieces.length, waste: (100 - utilization).toFixed(1), type: 'pipe', stock };
}

function firstFitDecreasing(stockLen, pieces, kerf) {
  let remaining = [...pieces];
  let cut = [];
  let used = 0;
  
  for (let i = remaining.length - 1; i >= 0; i--) {
    const len = remaining[i];
    if (used + len + (cut.length > 0 ? kerf : 0) <= stockLen) {
      cut.push({ start: used + (cut.length > 0 ? kerf : 0), length: len });
      used += len + (cut.length > 1 ? kerf : 0);
      remaining.splice(i, 1);
    }
  }
  
  return { cut, remaining };
}