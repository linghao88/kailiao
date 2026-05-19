import { sheetLibrary, pipeLibrary, optimizeSheetMultipleStocks, optimizePipeMultipleStocks } from '../algo/algorithm.js';

let currentType = 'sheet';
let sheetPieces = [];
let pipePieces = [];
let customSheetStocks = [...sheetLibrary];
let customPipeStocks = [...pipeLibrary];
let customSheetIdStart = 100;
let customPipeIdStart = 100;

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentType = tab.dataset.type;
    document.getElementById('sheet-panel').classList.toggle('hidden', currentType !== 'sheet');
    document.getElementById('pipe-panel').classList.toggle('hidden', currentType !== 'pipe');
    document.getElementById('stats').style.display = 'none';
    document.getElementById('result-panel').style.display = 'none';
  });
});

function initStockCheckboxes() {
  renderSheetStockCheckboxes();
  renderPipeStockCheckboxes();
}

function renderSheetStockCheckboxes() {
  const container = document.getElementById('sheet-stock-checkboxes');
  container.innerHTML = customSheetStocks.map(stock => `
    <div class="checkbox-item">
      <input type="checkbox" id="sheet-stock-${stock.id}" checked>
      <label for="sheet-stock-${stock.id}">${stock.name}</label>
    </div>
  `).join('');
}

function renderPipeStockCheckboxes() {
  const container = document.getElementById('pipe-stock-checkboxes');
  container.innerHTML = customPipeStocks.map(stock => `
    <div class="checkbox-item">
      <input type="checkbox" id="pipe-stock-${stock.id}" checked>
      <label for="pipe-stock-${stock.id}">${stock.name}</label>
    </div>
  `).join('');
}

document.getElementById('add-custom-sheet').addEventListener('click', () => {
  const w = parseFloat(document.getElementById('custom-sheet-w').value);
  const h = parseFloat(document.getElementById('custom-sheet-h').value);
  if (w && h) {
    customSheetIdStart++;
    const newStock = { id: customSheetIdStart, name: `自定义 ${w}×${h}`, width: w, height: h };
    customSheetStocks.push(newStock);
    renderSheetStockCheckboxes();
    document.getElementById('custom-sheet-w').value = '';
    document.getElementById('custom-sheet-h').value = '';
  }
});

document.getElementById('add-custom-pipe').addEventListener('click', () => {
  const l = parseFloat(document.getElementById('custom-pipe-l').value);
  if (l) {
    customPipeIdStart++;
    const newStock = { id: customPipeIdStart, name: `自定义 ${l}mm`, length: l };
    customPipeStocks.push(newStock);
    renderPipeStockCheckboxes();
    document.getElementById('custom-pipe-l').value = '';
  }
});

document.getElementById('add-sheet-piece').addEventListener('click', () => {
  const width = parseFloat(document.getElementById('sheet-width').value);
  const height = parseFloat(document.getElementById('sheet-height').value);
  const quantity = parseInt(document.getElementById('sheet-quantity').value) || 1;
  
  if (width && height) {
    sheetPieces.push({ width, height, quantity });
    renderPieces('sheet');
    document.getElementById('sheet-width').value = '';
    document.getElementById('sheet-height').value = '';
  }
});

document.getElementById('add-pipe-piece').addEventListener('click', () => {
  const length = parseFloat(document.getElementById('pipe-length').value);
  const quantity = parseInt(document.getElementById('pipe-quantity').value) || 1;
  
  if (length) {
    pipePieces.push({ length, quantity });
    renderPieces('pipe');
    document.getElementById('pipe-length').value = '';
  }
});

function renderPieces(type) {
  const list = document.getElementById(`${type}-pieces`);
  const pieces = type === 'sheet' ? sheetPieces : pipePieces;
  
  list.innerHTML = pieces.map((p, i) => `
    <div class="piece-item">
      <span>${type === 'sheet' ? `${p.width}×${p.height} mm` : `${p.length} mm`} × ${p.quantity}</span>
      <button class="btn btn-danger btn-small" onclick="removePiece('${type}', ${i})">删除</button>
    </div>
  `).join('');
}

window.removePiece = (type, index) => {
  if (type === 'sheet') {
    sheetPieces.splice(index, 1);
    renderPieces('sheet');
  } else {
    pipePieces.splice(index, 1);
    renderPieces('pipe');
  }
};

document.getElementById('optimize-btn').addEventListener('click', () => {
  const pieces = currentType === 'sheet' ? sheetPieces : pipePieces;
  if (pieces.length === 0) {
    alert('请先添加工件');
    return;
  }
  
  let selectedStocks = [];
  if (currentType === 'sheet') {
    customSheetStocks.forEach(stock => {
      const checkbox = document.getElementById(`sheet-stock-${stock.id}`);
      if (checkbox && checkbox.checked) {
        selectedStocks.push(stock);
      }
    });
  } else {
    customPipeStocks.forEach(stock => {
      const checkbox = document.getElementById(`pipe-stock-${stock.id}`);
      if (checkbox && checkbox.checked) {
        selectedStocks.push(stock);
      }
    });
  }
  
  if (selectedStocks.length === 0) {
    alert('请至少选择一种原料规格');
    return;
  }
  
  const kerf = parseFloat(document.getElementById(`${currentType}-kerf`).value) || 0;
  
  let results;
  if (currentType === 'sheet') {
    results = optimizeSheetMultipleStocks(selectedStocks, pieces, kerf);
  } else {
    results = optimizePipeMultipleStocks(selectedStocks, pieces, kerf);
  }
  
  displayResults(results);
  drawResults(results);
});

function displayResults(results) {
  document.getElementById('stats').style.display = 'grid';
  document.getElementById('result-panel').style.display = 'block';
  
  const stockUsage = {};
  (results.usedStocks || []).forEach(stock => {
    const key = stock.name;
    stockUsage[key] = (stockUsage[key] || 0) + 1;
  });
  const usageStr = Object.entries(stockUsage).map(([name, count]) => `${name}: ${count}块`).join(', ');
  
  document.getElementById('stat-materials').innerHTML = `${results.usedStock} 块<br><small style="font-size: 12px; color: #666">${usageStr}</small>`;
  document.getElementById('stat-utilization').textContent = results.utilization + '%';
  document.getElementById('stat-pieces').textContent = results.totalPieces;
  document.getElementById('stat-waste').textContent = results.waste + '%';
}

function drawResults(results) {
  const canvas = document.getElementById('result-canvas');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  if (results.type === 'sheet') {
    drawSheetResults(ctx, results);
  } else {
    drawPipeResults(ctx, results);
  }
}

function drawSheetResults(ctx, results) {
  const layouts = results.layouts || [];
  const cols = 3;
  const padding = 25;
  let x = padding;
  let y = padding;
  let maxRowHeight = 0;
  
  layouts.forEach((layout, idx) => {
    const stock = layout.stock;
    const maxW = 300;
    const scale = Math.min(maxW / stock.width, 180 / stock.height);
    const drawW = stock.width * scale;
    const drawH = stock.height * scale;
    const cardW = drawW + padding * 2;
    const cardH = drawH + 60;
    
    if (x + cardW > canvas.width - padding) {
      x = padding;
      y += maxRowHeight + padding;
      maxRowHeight = 0;
    }
    
    ctx.fillStyle = '#f5f5f5';
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 8);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#333';
    ctx.font = '600 14px sans-serif';
    ctx.fillText(`${stock.name} #${idx + 1}`, x + padding, y + 22);
    
    const boardX = x + padding;
    const boardY = y + 38;
    
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.fillRect(boardX, boardY, drawW, drawH);
    ctx.strokeRect(boardX, boardY, drawW, drawH);
    
    const colors = ['#3498db', '#9b59b6', '#1abc9c', '#f39c12', '#e74c3c'];
    (layout.placed || []).forEach((p, i) => {
      const px = boardX + p.x * scale;
      const py = boardY + p.y * scale;
      const pw = p.w * scale;
      const ph = p.h * scale;
      
      ctx.fillStyle = colors[i % colors.length] + '30';
      ctx.strokeStyle = colors[i % colors.length];
      ctx.lineWidth = 1.5;
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeRect(px, py, pw, ph);
      
      if (pw > 40 && ph > 20) {
        ctx.fillStyle = '#333';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${p.w}×${p.h}`, px + pw/2, py + ph/2 + 4);
      }
    });
    
    x += cardW + padding;
    maxRowHeight = Math.max(maxRowHeight, cardH);
  });
}

function drawPipeResults(ctx, results) {
  const cuts = results.cuts || [];
  let y = 30;
  
  cuts.forEach((cutInfo, idx) => {
    const stock = cutInfo.stock;
    const stockLen = stock.length;
    const maxW = 1000;
    const scale = Math.min(maxW / stockLen, 0.9);
    const drawW = stockLen * scale;
    const drawH = 45;
    const cardW = drawW + 20;
    const cardH = drawH + 50;
    
    ctx.fillStyle = '#f5f5f5';
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(30 - 5, y - 5, cardW, cardH, 8);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#333';
    ctx.font = '600 14px sans-serif';
    ctx.fillText(`${stock.name} #${idx + 1}`, 30, y + 2);
    
    const pipeY = y + 20;
    
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.fillRect(30, pipeY, drawW, drawH);
    ctx.strokeRect(30, pipeY, drawW, drawH);
    
    const colors = ['#3498db', '#9b59b6', '#1abc9c', '#f39c12', '#e74c3c'];
    (cutInfo.cut || []).forEach((c, i) => {
      const cx = 30 + c.start * scale;
      const cw = c.length * scale;
      
      ctx.fillStyle = colors[i % colors.length] + '40';
      ctx.strokeStyle = colors[i % colors.length];
      ctx.lineWidth = 1.5;
      ctx.fillRect(cx, pipeY, cw, drawH);
      ctx.strokeRect(cx, pipeY, cw, drawH);
      
      if (cw > 50) {
        ctx.fillStyle = '#333';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${c.length}mm`, cx + cw/2, pipeY + drawH/2 + 4);
      }
    });
    
    y += cardH + 20;
  });
}

initStockCheckboxes();
