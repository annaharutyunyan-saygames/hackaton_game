(function () {
  const SOLVED_KEY = 'mr_solved';

  const state = {
    view: 'menu',
    levelId: 1,
    current: null,
    seedsLeft: 0,
    ticksLeft: 0,
    history: [],
    solvedLevels: loadSolved()
  };

  function loadSolved() {
    try {
      const raw = localStorage.getItem(SOLVED_KEY);
      if (!raw) return new Set();
      return new Set(JSON.parse(raw));
    } catch (e) {
      return new Set();
    }
  }

  function persistSolved() {
    localStorage.setItem(SOLVED_KEY, JSON.stringify([...state.solvedLevels]));
  }

  function getLevel(id) {
    return LEVELS.find(l => l.id === id);
  }

  function loadLevel(id) {
    const lvl = getLevel(id);
    if (!lvl) return;
    state.view = 'level';
    state.levelId = id;
    state.current = parseGrid(lvl.start);
    state.seedsLeft = lvl.seeds;
    state.ticksLeft = lvl.maxTicks;
    state.history = [];
    render();
  }

  function pushSnapshot() {
    state.history.push({
      current: cloneGrid(state.current),
      seedsLeft: state.seedsLeft,
      ticksLeft: state.ticksLeft
    });
  }

  function checkEnd() {
    const lvl = getLevel(state.levelId);
    if (isWin(state.current, lvl.goal)) {
      state.view = 'win';
      state.solvedLevels.add(state.levelId);
      persistSolved();
      playWin();
      render();
      return true;
    }
    if (state.seedsLeft === 0 && state.ticksLeft === 0) {
      state.view = 'lose';
      render();
      return true;
    }
    return false;
  }

  function placeSeed(x, y) {
    if (state.view !== 'level') return;
    if (state.seedsLeft <= 0) return;
    if (state.current[y][x] === 1) return;
    pushSnapshot();
    state.current[y][x] = 1;
    state.seedsLeft -= 1;
    playSeed();
    if (!checkEnd()) render();
  }

  function runTick() {
    if (state.view !== 'level') return;
    if (state.ticksLeft <= 0) return;
    pushSnapshot();
    state.current = step(state.current);
    state.ticksLeft -= 1;
    playTick();
    if (!checkEnd()) render();
  }

  function undo() {
    if (state.view !== 'level') return;
    if (state.history.length === 0) return;
    const snap = state.history.pop();
    state.current = snap.current;
    state.seedsLeft = snap.seedsLeft;
    state.ticksLeft = snap.ticksLeft;
    render();
  }

  function restart() {
    loadLevel(state.levelId);
  }

  function goToMenu() {
    state.view = 'menu';
    render();
  }

  function nextLevel() {
    const next = state.levelId + 1;
    if (getLevel(next)) {
      loadLevel(next);
    } else {
      goToMenu();
    }
  }

  const app = document.getElementById('app');

  function el(tag, attrs, children) {
    attrs = attrs || {};
    children = children == null ? [] : children;
    const node = document.createElement(tag);
    for (const k in attrs) {
      const v = attrs[k];
      if (k === 'class') node.className = v;
      else if (k === 'onclick') { if (v) node.addEventListener('click', v); }
      else if (v === false || v == null) continue;
      else if (v === true) node.setAttribute(k, '');
      else node.setAttribute(k, v);
    }
    const list = [].concat(children);
    for (const c of list) {
      if (c == null || c === false) continue;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  }

  function render() {
    app.innerHTML = '';
    if (state.view === 'menu') {
      app.appendChild(renderMenu());
    } else {
      app.appendChild(renderLevel());
      if (state.view === 'win') app.appendChild(renderWin());
      if (state.view === 'lose') app.appendChild(renderLose());
    }
    app.appendChild(renderMute());
  }

  function renderMenu() {
    const screen = el('div', { class: 'screen menu' });
    screen.appendChild(el('h1', {}, [
      'Chain Reaction',
      el('div', {}, 'Garden')
    ]));

    const firstUnsolved = LEVELS.find(l => !state.solvedLevels.has(l.id));
    const nextToPlay = firstUnsolved ? firstUnsolved.id : 1;

    screen.appendChild(el('div', { class: 'play-row' }, [
      el('button', {
        class: 'btn-primary',
        onclick: () => loadLevel(nextToPlay)
      }, 'Play')
    ]));

    screen.appendChild(el('div', { class: 'levels-title' }, 'Levels'));

    const grid = el('div', { class: 'level-grid' });
    for (let i = 1; i <= 10; i++) {
      const exists = !!getLevel(i);
      const solved = state.solvedLevels.has(i);
      const isNext = i === nextToPlay && exists;
      const classes = ['level-chip'];
      if (solved) classes.push('solved');
      if (isNext) classes.push('next');
      const attrs = {
        class: classes.join(' '),
        'aria-label': `Level ${i}${solved ? ', solved' : ''}${isNext ? ', next to play' : ''}`
      };
      if (exists) {
        attrs.onclick = () => loadLevel(i);
      } else {
        attrs.disabled = true;
      }
      grid.appendChild(el('button', attrs, String(i)));
    }
    screen.appendChild(grid);
    return screen;
  }

  function renderLevel() {
    const lvl = getLevel(state.levelId);
    const screen = el('div', { class: 'screen level' });

    screen.appendChild(el('div', { class: 'level-header' }, [
      el('button', { class: 'btn-secondary', onclick: goToMenu, 'aria-label': 'Back to menu' }, '← Menu'),
      el('div', { class: 'crumb' }, `Level ${lvl.id}`)
    ]));

    screen.appendChild(el('h2', { class: 'level-title' }, `"${lvl.title}"`));
    screen.appendChild(el('p', { class: 'hint' }, lvl.hint));
    screen.appendChild(el('div', { class: 'divider' }));

    screen.appendChild(renderGrid(lvl));

    screen.appendChild(el('div', { class: 'counters' }, [
      el('div', { class: 'counter' }, [
        el('span', { class: 'label' }, 'Seeds:'),
        el('span', {}, String(state.seedsLeft))
      ]),
      el('div', { class: 'counter' }, [
        el('span', { class: 'label' }, 'Ticks:'),
        el('span', {}, String(state.ticksLeft))
      ])
    ]));

    screen.appendChild(el('div', { class: 'actions' }, [
      el('button', {
        class: 'btn-secondary',
        onclick: undo,
        disabled: state.history.length === 0 ? true : false
      }, 'Undo'),
      el('button', {
        class: 'btn-primary',
        onclick: runTick,
        disabled: state.ticksLeft <= 0 ? true : false
      }, 'Tick')
    ]));

    screen.appendChild(el('div', { class: 'restart-row' }, [
      el('button', { class: 'btn-secondary', onclick: restart }, 'Restart')
    ]));

    return screen;
  }

  function renderGrid(lvl) {
    const grid = el('div', { class: 'grid', role: 'grid', 'aria-label': 'Garden grid' });
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const alive = state.current[y][x] === 1;
        const isTarget = lvl.goal[y][x] === 'X';
        const classes = ['cell'];
        if (alive) classes.push('alive');
        if (isTarget) classes.push('target');
        if (alive && !isTarget) classes.push('off-target');

        const aliveStr = alive ? 'alive' : 'empty';
        const targetStr = isTarget ? ', part of target' : '';
        const attrs = {
          class: classes.join(' '),
          'aria-label': `Cell row ${y + 1} column ${x + 1}, ${aliveStr}${targetStr}`,
          'data-x': x,
          'data-y': y
        };
        if (alive) {
          attrs.disabled = true;
        } else {
          const cx = x, cy = y;
          attrs.onclick = () => placeSeed(cx, cy);
        }
        grid.appendChild(el('button', attrs));
      }
    }
    return grid;
  }

  function renderWin() {
    const lvl = getLevel(state.levelId);
    const isLast = !getLevel(state.levelId + 1);
    const card = el('div', { class: 'overlay-card' }, [
      el('h2', {}, isLast ? 'Garden complete' : `Level ${lvl.id} solved`),
      el('div', { class: 'overlay-actions' }, isLast
        ? [el('button', { class: 'btn-primary', onclick: goToMenu }, 'Back to menu')]
        : [
            el('button', { class: 'btn-primary', onclick: nextLevel }, 'Next level'),
            el('button', { class: 'btn-secondary', onclick: restart }, 'Replay')
          ])
    ]);
    return el('div', { class: 'overlay' }, [card]);
  }

  function renderLose() {
    const card = el('div', { class: 'overlay-card' }, [
      el('h2', {}, 'Try again'),
      el('div', { class: 'overlay-actions' }, [
        el('button', { class: 'btn-primary', onclick: restart }, 'Restart'),
        el('button', { class: 'btn-secondary', onclick: goToMenu }, 'Back to menu')
      ])
    ]);
    return el('div', { class: 'overlay' }, [card]);
  }

  function renderMute() {
    const muted = isMuted();
    return el('button', {
      class: 'mute-toggle',
      'aria-label': muted ? 'Unmute' : 'Mute',
      onclick: () => { toggleMuted(); render(); }
    }, muted ? '🔇' : '🔊');
  }

  document.addEventListener('keydown', (e) => {
    if (state.view === 'level') {
      if (e.key === 't' || e.key === 'T') { runTick(); e.preventDefault(); }
      else if (e.key === 'u' || e.key === 'U') { undo(); e.preventDefault(); }
      else if (e.key === 'r' || e.key === 'R') { restart(); e.preventDefault(); }
      else if (e.key === 'Escape') { goToMenu(); e.preventDefault(); }
    } else if (state.view === 'win' || state.view === 'lose') {
      if (e.key === 'Escape') { goToMenu(); e.preventDefault(); }
    }
  });

  render();
})();
