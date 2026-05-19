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

export function optimizeSheetMultipleStocks(stocks, pieces, kerf = 0) {
  stocks.sort((a, b) => (b.width * b.height) - (a.width * a.height));
  
  const allPieces = [];
  pieces.forEach(p => {
    for (let i = 0; i < p.quantity; i++) {
      allPieces.push({ w: p.width, h: p.height, area: p.width * p.height });
    }
  });
  allPieces.sort((a, b) => b.area - a.area);
  
  let results = {
    layouts: [],
    usedStocks: [],
    totalPieces: allPieces.length,
    type: 'sheet'
  };
  
  let remaining = [...allPieces];
  
  while (remaining.length > 0) {
    let bestResult = null;
    let bestStock = null;
    let bestRemaining = null;
    let bestUtilization = -1;
    
    for (const stock of stocks) {
      const trial = greedyPack(stock.width, stock.height, remaining, kerf);
      const placedArea = trial.placed.reduce((sum, p) => sum + p.w * p.h, 0);
      const utilization = placedArea / (stock.width * stock.height);
      
      if (utilization > bestUtilization && trial.placed.length > 0) {
        bestUtilization = utilization;
        bestResult = trial;
        bestStock = stock;
        bestRemaining = trial.remaining;
      }
    }
    
    if (bestResult) {
      results.layouts.push({ placed: bestResult.placed, stock: bestStock });
      results.usedStocks.push(bestStock);
      remaining = bestRemaining;
    } else {
      const stock = stocks[0];
      const trial = greedyPack(stock.width, stock.height, remaining, kerf);
      results.layouts.push({ placed: trial.placed, stock: stock });
      results.usedStocks.push(stock);
      remaining = trial.remaining;
    }
  }
  
  const totalArea = results.usedStocks.reduce((sum, s) => sum + s.width * s.height, 0);
  const usedArea = allPieces.reduce((sum, p) => sum + p.w * p.h, 0);
  results.utilization = totalArea > 0 ? (usedArea / totalArea * 100).toFixed(1) : 0;
  results.waste = (100 - parseFloat(results.utilization)).toFixed(1);
  results.usedStock = results.usedStocks.length;
  
  return results;
}

export function optimizeSheet(stock, pieces, kerf = 0) {
  return optimizeSheetMultipleStocks([stock], pieces, kerf);
}

function greedyPack(stockW, stockH, pieces, kerf) {
  let placed = [];
  let remaining = [...pieces];
  let freeRects = [{ x: 0, y: 0, w: stockW, h: stockH }];
  
  for (let i = 0; i < remaining.length; ) {
    const p = remaining[i];
    let placedFlag = false;
    
    freeRects.sort((a, b) => {
      const da = Math.min(a.w, a.h);
      const db = Math.min(b.w, b.h);
      return da - db;
    });
    
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
    
    if (!placedFlag) {
      i++;
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

export function optimizePipeMultipleStocks(stocks, pieces, kerf = 0) {
  stocks.sort((a, b) => b.length - a.length);
  
  const allPieces = [];
  pieces.forEach(p => {
    for (let i = 0; i < p.quantity; i++) {
      allPieces.push(p.length);
    }
  });
  allPieces.sort((a, b) => b - a);
  
  let results = {
    cuts: [],
    usedStocks: [],
    totalPieces: allPieces.length,
    type: 'pipe'
  };
  let remaining = [...allPieces];
  
  while (remaining.length > 0) {
    let bestResult = null;
    let bestStock = null;
    let bestRemaining = null;
    let bestUtilization = -1;
    
    for (const stock of stocks) {
      const result = firstFitDecreasing(stock.length, remaining, kerf);
      const usedLength = result.cut.reduce((sum, c) => sum + c.length, 0);
      const utilization = usedLength / stock.length;
      
      if (utilization > bestUtilization && result.cut.length > 0) {
        bestUtilization = utilization;
        bestResult = result;
        bestStock = stock;
        bestRemaining = result.remaining;
      }
    }
    
    if (bestResult) {
      results.cuts.push({ cut: bestResult.cut, stock: bestStock });
      results.usedStocks.push(bestStock);
      remaining = bestRemaining;
    } else {
      const stock = stocks[0];
      const result = firstFitDecreasing(stock.length, remaining, kerf);
      results.cuts.push({ cut: result.cut, stock: stock });
      results.usedStocks.push(stock);
      remaining = result.remaining;
    }
  }
  
  const totalLength = results.usedStocks.reduce((sum, s) => sum + s.length, 0);
  const usedLength = allPieces.reduce((sum, l) => sum + l, 0);
  results.utilization = totalLength > 0 ? (usedLength / totalLength * 100).toFixed(1) : 0;
  results.waste = (100 - parseFloat(results.utilization)).toFixed(1);
  results.usedStock = results.usedStocks.length;
  
  return results;
}

export function optimizePipe(stock, pieces, kerf = 0) {
  return optimizePipeMultipleStocks([stock], pieces, kerf);
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