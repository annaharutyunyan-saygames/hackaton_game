function step(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const next = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
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
  return rows.map(r => r.split('').map(c => c === 'X' ? 1 : 0));
}

function isWin(current, goal) {
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const target = goal[y][x] === 'X' ? 1 : 0;
      if (current[y][x] !== target) return false;
    }
  }
  return true;
}

function cloneGrid(g) {
  return g.map(r => r.slice());
}
