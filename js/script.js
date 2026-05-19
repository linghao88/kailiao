import { sheetLibrary, pipeLibrary, optimizeSheet, optimizePipe } from '../algo/algorithm.js';

let currentType = 'sheet';
let sheetPieces = [];
let pipePieces = [];

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
  
  const stockSelect = document.getElementById(`${currentType}-stock-select`);
  const kerf = parseFloat(document.getElementById(`${currentType}-kerf`).value) || 0;
  const library = currentType === 'sheet' ? sheetLibrary : pipeLibrary;
  const stock = library.find(s => s.id === parseInt(stockSelect.value));
  
  const results = currentType === 'sheet' 
    ? optimizeSheet(stock, pieces, kerf)
    : optimizePipe(stock, pieces, kerf);
  
  displayResults(results);
  drawResults(results);
});

function displayResults(results) {
  document.getElementById('stats').style.display = 'grid';
  document.getElementById('result-panel').style.display = 'block';
  document.getElementById('stat-materials').textContent = `${results.usedStock} 块 ${results.stock.name}`;
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
  const stockW = results.stock.width;
  const stockH = results.stock.height;
  const maxW = 300;
  const scale = Math.min(maxW / stockW, 180 / stockH);
  const drawW = stockW * scale;
  const drawH = stockH * scale;
  
  const cols = 3;
  const padding = 25;
  const cardW = drawW + padding * 2;
  const cardH = drawH + 60;
  
  results.layouts.forEach((layout, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = col * (cardW + 20) + 30;
    const y = row * (cardH + 20) + 30;
    
    ctx.fillStyle = '#f5f5f5';
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 8);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#333';
    ctx.font = '600 14px sans-serif';
    ctx.fillText(`原料 #${idx + 1}`, x + padding, y + 22);
    
    const boardX = x + padding;
    const boardY = y + 38;
    
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.fillRect(boardX, boardY, drawW, drawH);
    ctx.strokeRect(boardX, boardY, drawW, drawH);
    
    const colors = ['#3498db', '#9b59b6', '#1abc9c', '#f39c12', '#e74c3c'];
    layout.placed.forEach((p, i) => {
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
  });
}

function drawPipeResults(ctx, results) {
  const stockLen = results.stock.length;
  const maxW = 1000;
  const scale = Math.min(maxW / stockLen, 0.9);
  const drawW = stockLen * scale;
  const drawH = 45;
  
  results.cuts.forEach((cut, idx) => {
    const x = 30;
    const y = idx * (drawH + 50) + 30;
    
    ctx.fillStyle = '#f5f5f5';
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x - 5, y - 5, drawW + 10, drawH + 40, 8);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#333';
    ctx.font = '600 14px sans-serif';
    ctx.fillText(`原料 #${idx + 1}`, x, y + 2);
    
    const pipeY = y + 20;
    
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.fillRect(x, pipeY, drawW, drawH);
    ctx.strokeRect(x, pipeY, drawW, drawH);
    
    const colors = ['#3498db', '#9b59b6', '#1abc9c', '#f39c12', '#e74c3c'];
    cut.forEach((c, i) => {
      const cx = x + c.start * scale;
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
  });
}