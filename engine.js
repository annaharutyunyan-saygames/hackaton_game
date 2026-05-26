function step(grid, walls, anchors) {
  const rows = grid.length;
  const cols = grid[0].length;
  const next = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (walls && walls[y][x]) { next[y][x] = 0; continue; }
      if (anchors && anchors[y][x]) { next[y][x] = 1; continue; }
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < rows && nx >= 0 && nx < cols) {
            n += grid[ny][nx];
          }
        }
      }
      next[y][x] = n === 2 ? 1 : 0;
    }
  }
  return next;
}

function parseGrid(rows) {
  return rows.map(r => r.split('').map(c => (c === 'X' || c === 'A') ? 1 : 0));
}

function parseLevel(rows) {
  const current = [];
  const walls = [];
  const anchors = [];
  for (const row of rows) {
    const cur = [], wal = [], anc = [];
    for (const c of row.split('')) {
      if (c === '#') { cur.push(0); wal.push(1); anc.push(0); }
      else if (c === 'A') { cur.push(1); wal.push(0); anc.push(1); }
      else if (c === 'X') { cur.push(1); wal.push(0); anc.push(0); }
      else { cur.push(0); wal.push(0); anc.push(0); }
    }
    current.push(cur);
    walls.push(wal);
    anchors.push(anc);
  }
  return { current, walls, anchors };
}

function isWin(current, goal, walls) {
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      if (walls && walls[y][x]) continue;
      const c = goal[y][x];
      if (c === '?' || c === '#') continue;
      const target = (c === 'X' || c === 'A') ? 1 : 0;
      if (current[y][x] !== target) return false;
    }
  }
  return true;
}

function cloneGrid(g) {
  return g.map(r => r.slice());
}
