(function () {
  const SOLVED_KEY = 'mr_solved';

  const state = {
    view: 'menu',
    levelId: 1,
    current: null,
    seedsLeft: 0,
    ticksLeft: 0,
    history: [],
    solvedLevels: loadSolved(),
    showRule: false,
    lastDelta: null,
    deltaConsumed: true,
    pendingEndAt: 0
  };

  const END_DELAY_MS = 1100;

  function setDelta(d) {
    state.lastDelta = d;
    state.deltaConsumed = false;
  }

  function computeDelta(prev, next) {
    const bornCells = [];
    const diedCells = [];
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        if (prev[y][x] === 0 && next[y][x] === 1) bornCells.push([x, y]);
        else if (prev[y][x] === 1 && next[y][x] === 0) diedCells.push([x, y]);
      }
    }
    return { bornCells, diedCells, born: bornCells.length, died: diedCells.length };
  }

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
    state.lastDelta = null;
    state.deltaConsumed = true;
    state.pendingEndAt = Date.now();
    render();
  }

  function pushSnapshot() {
    state.history.push({
      current: cloneGrid(state.current),
      seedsLeft: state.seedsLeft,
      ticksLeft: state.ticksLeft
    });
  }

  function scheduleEndCheck() {
    const lvl = getLevel(state.levelId);
    const won = isWin(state.current, lvl.goal);
    const lost = !won && state.seedsLeft === 0 && state.ticksLeft === 0;
    if (!won && !lost) return;
    const stamp = ++state.pendingEndAt;
    setTimeout(() => {
      if (stamp !== state.pendingEndAt) return;
      if (state.view !== 'level') return;
      const lvl2 = getLevel(state.levelId);
      if (isWin(state.current, lvl2.goal)) {
        state.view = 'win';
        state.solvedLevels.add(state.levelId);
        persistSolved();
        playWin();
        render();
      } else if (state.seedsLeft === 0 && state.ticksLeft === 0) {
        state.view = 'lose';
        render();
      }
    }, END_DELAY_MS);
  }

  function placeSeed(x, y) {
    if (state.view !== 'level') return;
    if (state.seedsLeft <= 0) return;
    if (state.current[y][x] === 1) return;
    pushSnapshot();
    state.current[y][x] = 1;
    state.seedsLeft -= 1;
    setDelta({ action: 'seed', born: 1, died: 0, bornCells: [[x, y]], diedCells: [] });
    playSeed();
    render();
    scheduleEndCheck();
  }

  function runTick() {
    if (state.view !== 'level') return;
    if (state.ticksLeft <= 0) return;
    pushSnapshot();
    const prev = state.current;
    state.current = step(state.current);
    state.ticksLeft -= 1;
    const delta = computeDelta(prev, state.current);
    setDelta({ action: 'tick', ...delta });
    playTick();
    render();
    scheduleEndCheck();
  }

  function undo() {
    if (state.view !== 'level' && state.view !== 'lose') return;
    if (state.history.length === 0) return;
    state.pendingEndAt++;
    const snap = state.history.pop();
    state.current = snap.current;
    state.seedsLeft = snap.seedsLeft;
    state.ticksLeft = snap.ticksLeft;
    state.view = 'level';
    setDelta({ action: 'undo', born: 0, died: 0, bornCells: [], diedCells: [] });
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
    if (state.showRule) app.appendChild(renderRuleModal());
    app.appendChild(renderMute());
    if (state.lastDelta && !state.deltaConsumed) {
      state.deltaConsumed = true;
    }
  }

  function renderStatus(lvl) {
    const won = isWin(state.current, lvl.goal);
    const lost = !won && state.seedsLeft === 0 && state.ticksLeft === 0;
    let text = '';
    let tone = 'neutral';
    if (won) {
      text = 'Сад совпал с целью — уровень собран';
      tone = 'good';
    } else if (lost) {
      text = 'Семена и тики закончились — цель не собрана';
      tone = 'bad';
    } else if (!state.lastDelta) {
      text = 'Размести семена и запускай тик';
    } else {
      const d = state.lastDelta;
      if (d.action === 'seed') text = 'Семя посажено · клетка стала живой';
      else if (d.action === 'undo') text = 'Шаг отменён';
      else if (d.action === 'tick') {
        if (d.born === 0 && d.died === 0) text = 'Тик · поле осталось прежним';
        else if (d.born > 0 && d.died > 0) text = `Тик · ожили ${d.born}, погибли ${d.died}`;
        else if (d.born > 0) text = `Тик · ожили ${d.born}`;
        else text = `Тик · погибли ${d.died}`;
      }
    }
    return el('div', { class: `status status-${tone}` }, text);
  }

  function renderRuleCard() {
    return el('section', { class: 'rule-card', 'aria-label': 'Правило игры' }, [
      el('h3', { class: 'rule-title' }, 'Правило'),
      el('p', { class: 'rule-lead' }, 'Клетка жива на следующем тике, только если у неё ровно 2 живых соседа (считаются все 8, включая диагональные).'),
      el('ul', { class: 'rule-list' }, [
        el('li', {}, 'Пустая клетка с 2 живыми соседями — оживает'),
        el('li', {}, 'Живая клетка с 2 живыми соседями — остаётся живой'),
        el('li', {}, 'У клетки 0, 1, 3 и более соседей — пустеет (умирает)')
      ])
    ]);
  }

  function renderRuleModal() {
    const card = el('div', { class: 'overlay-card rule-modal' }, [
      el('h2', {}, 'Правило'),
      renderRuleCard(),
      el('div', { class: 'overlay-actions' }, [
        el('button', {
          class: 'btn-primary',
          onclick: () => { state.showRule = false; render(); }
        }, 'Понятно')
      ])
    ]);
    return el('div', {
      class: 'overlay',
      onclick: (e) => { if (e.target.classList.contains('overlay')) { state.showRule = false; render(); } }
    }, [card]);
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

    screen.appendChild(renderRuleCard());

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
      el('div', { class: 'header-right' }, [
        el('button', {
          class: 'rule-toggle',
          'aria-label': 'Показать правило',
          onclick: () => { state.showRule = true; render(); }
        }, '?'),
        el('div', { class: 'crumb' }, `Level ${lvl.id}`)
      ])
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

    screen.appendChild(renderStatus(lvl));

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
    const showDelta = state.lastDelta && !state.deltaConsumed;
    const isJustDied = (x, y) => showDelta && state.lastDelta.diedCells.some(c => c[0] === x && c[1] === y);
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const alive = state.current[y][x] === 1;
        const isTarget = lvl.goal[y][x] === 'X';
        const classes = ['cell'];
        if (alive) classes.push('alive');
        if (isTarget) classes.push('target');
        if (alive && !isTarget) classes.push('off-target');
        if (!alive && isJustDied(x, y)) classes.push('just-died');

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
    const explainParts = [
      `Все живые клетки совпали с целью на ${lvl.title}.`
    ];
    if (state.lastDelta && state.lastDelta.action === 'tick') {
      explainParts.push(`Последний тик: ожили ${state.lastDelta.born}, погибли ${state.lastDelta.died}.`);
    }
    const card = el('div', { class: 'overlay-card' }, [
      el('h2', {}, isLast ? 'Сад собран целиком' : `Уровень ${lvl.id} решён`),
      el('p', { class: 'overlay-text' }, explainParts.join(' ')),
      el('div', { class: 'overlay-actions' }, isLast
        ? [el('button', { class: 'btn-primary', onclick: goToMenu }, 'В меню')]
        : [
            el('button', { class: 'btn-primary', onclick: nextLevel }, 'Следующий уровень'),
            el('button', { class: 'btn-secondary', onclick: restart }, 'Сыграть заново')
          ])
    ]);
    return el('div', { class: 'overlay' }, [card]);
  }

  function renderLose() {
    const lvl = getLevel(state.levelId);
    const reasonParts = ['Семена и тики закончились, а сад не совпал с целью.'];
    if (state.lastDelta && state.lastDelta.action === 'tick' && state.lastDelta.died > 0) {
      reasonParts.push(`На последнем тике погибли ${state.lastDelta.died} клеток — у них не было ровно 2 соседей.`);
    } else {
      reasonParts.push('Попробуй другое расположение семян или используй Отмену.');
    }
    const card = el('div', { class: 'overlay-card' }, [
      el('h2', {}, 'Попробуй ещё раз'),
      el('p', { class: 'overlay-text' }, reasonParts.join(' ')),
      el('div', { class: 'overlay-actions' }, [
        el('button', { class: 'btn-primary', onclick: restart }, 'Заново'),
        el('button', { class: 'btn-secondary', onclick: undo, disabled: state.history.length === 0 }, 'Отменить ход'),
        el('button', { class: 'btn-secondary', onclick: goToMenu }, 'В меню')
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
    if (state.showRule) {
      if (e.key === 'Escape') { state.showRule = false; render(); e.preventDefault(); }
      return;
    }
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
