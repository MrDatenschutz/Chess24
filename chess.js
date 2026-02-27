const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');

const playerTimeEl = document.getElementById('playerTime');
const botTimeEl = document.getElementById('botTime');
const playerScoreEl = document.getElementById('playerScore');
const botScoreEl = document.getElementById('botScore');

let board = [];
let selectedSquare = null;
let legalMoves = [];
let playerColor = 'w';
let botColor = 'b';
let currentTurn = 'w';
let flipped = false;

let playerTime = 300;
let botTime = 300;
let timerInterval = null;

let promotionCallback = null;

// Rochade-Flags
let moved = {
  wK: false,
  bK: false,
  wR0: false,
  wR7: false,
  bR0: false,
  bR7: false
};

const PIECES = {
  'wP': '♙','wR': '♖','wN': '♘','wB': '♗','wQ': '♕','wK': '♔',
  'bP': '♟','bR': '♜','bN': '♞','bB': '♝','bQ': '♛','bK': '♚'
};

const SCORES = { P:1, N:3, B:3, R:5, Q:9 };

function startGame(color) {
  playerColor = color;
  botColor = color === 'w' ? 'b' : 'w';
  currentTurn = 'w';

  flipped = (playerColor === 'b');
  boardEl.style.transform = flipped ? "rotate(180deg)" : "none";

  playerTime = 300;
  botTime = 300;
  updateTimers();

  clearInterval(timerInterval);
  timerInterval = setInterval(updateClock, 1000);

  playerScoreEl.textContent = "0";
  botScoreEl.textContent = "0";

  moved = { wK:false, bK:false, wR0:false, wR7:false, bR0:false, bR7:false };

  initBoard();
  renderBoard();
  updateStatus();

  if (playerColor === 'b') botMove();
}

function updateClock() {
  if (currentTurn === playerColor) {
    if (playerTime > 0) playerTime--;
  } else {
    if (botTime > 0) botTime--;
  }
  updateTimers();
}

function updateTimers() {
  playerTimeEl.textContent = formatTime(playerTime);
  botTimeEl.textContent = formatTime(botTime);
}

function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${s.toString().padStart(2,'0')}`;
}

function initBoard() {
  board = [
    ['bR','bN','bB','bQ','bK','bB','bN','bR'],
    ['bP','bP','bP','bP','bP','bP','bP','bP'],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    ['wP','wP','wP','wP','wP','wP','wP','wP'],
    ['wR','wN','wB','wQ','wK','wB','wN','wR']
  ];
}

function renderBoard() {
  boardEl.innerHTML = '';

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement('div');
      sq.classList.add('square');
      sq.classList.add((r + c) % 2 === 0 ? 'light' : 'dark');

      const rr = flipped ? 7 - r : r;
      const cc = flipped ? 7 - c : c;

      sq.dataset.row = rr;
      sq.dataset.col = cc;

      const piece = board[rr][cc];
      if (piece) {
        sq.textContent = PIECES[piece];
        sq.style.color = piece[0] === 'w' ? '#ffffff' : '#000000';
      }

      if (legalMoves.some(m => m[0] === rr && m[1] === cc)) {
        sq.classList.add('highlight');
      }

      sq.onclick = () => onSquareClick(rr, cc);
      boardEl.appendChild(sq);
    }
  }
}

function updateStatus() {
  if (isInCheck(currentTurn)) {
    statusEl.textContent = (currentTurn === 'w' ? "Weiß" : "Schwarz") + " steht im Schach!";
  } else {
    statusEl.textContent = currentTurn === playerColor ? "Du bist am Zug" : "Bot denkt...";
  }
}

function onSquareClick(r, c) {
  if (currentTurn !== playerColor) return;

  const piece = board[r][c];

  if (selectedSquare) {
    const [sr, sc] = selectedSquare;

    if (legalMoves.some(m => m[0] === r && m[1] === c)) {
      makeMove(sr, sc, r, c, true);
      return;
    }

    selectedSquare = null;
    legalMoves = [];
    renderBoard();
  } else {
    if (piece && piece[0] === playerColor) {
      selectedSquare = [r, c];
      legalMoves = getLegalMovesForPiece(r, c);
      renderBoard();
    }
  }
}

function makeMove(fr, fc, tr, tc, isPlayer) {
  const piece = board[fr][fc];
  const target = board[tr][tc];

  if (target) updateScore(piece[0], target);

  if (piece[1] === 'K') {
    if (piece[0] === 'w') moved.wK = true;
    else moved.bK = true;
  }

  if (piece[1] === 'R') {
    if (piece[0] === 'w' && fr === 7 && fc === 0) moved.wR0 = true;
    if (piece[0] === 'w' && fr === 7 && fc === 7) moved.wR7 = true;
    if (piece[0] === 'b' && fr === 0 && fc === 0) moved.bR0 = true;
    if (piece[0] === 'b' && fr === 0 && fc === 7) moved.bR7 = true;
  }

  if (piece[1] === 'K' && Math.abs(tc - fc) === 2) {
    if (tc === fc + 2) {
      board[fr][fc + 1] = board[fr][7];
      board[fr][7] = null;
    } else {
      board[fr][fc - 1] = board[fr][0];
      board[fr][0] = null;
    }
  }

  board[tr][tc] = piece;
  board[fr][fc] = null;

  if (piece[1] === 'P') {
    if ((piece[0] === 'w' && tr === 0) || (piece[0] === 'b' && tr === 7)) {
      if (isPlayer) {
        showPromotionBox(piece[0], tr, tc);
        selectedSquare = null;
        legalMoves = [];
        renderBoard();
        return;
      } else {
        board[tr][tc] = piece[0] + 'Q';
      }
    }
  }

  selectedSquare = null;
  legalMoves = [];

  currentTurn = isPlayer ? botColor : playerColor;
  renderBoard();
  updateStatus();

  if (isPlayer) {
    setTimeout(botMove, 200);
  }
}

function showPromotionBox(color, r, c) {
  const box = document.getElementById('promotionBox');
  box.style.display = 'block';

  promotionCallback = (pieceType) => {
    board[r][c] = color + pieceType;
    box.style.display = 'none';
    promotionCallback = null;

    currentTurn = botColor;
    renderBoard();
    updateStatus();
    setTimeout(botMove, 200);
  };
}

function promote(type) {
  if (promotionCallback) promotionCallback(type);
}

function updateScore(color, captured) {
  const val = SCORES[captured[1]] || 0;
  if (color === playerColor) {
    playerScoreEl.textContent = parseInt(playerScoreEl.textContent) + val;
  } else {
    botScoreEl.textContent = parseInt(botScoreEl.textContent) + val;
  }
}

function botMove() {
  const moves = getAllLegalMoves(botColor);
  if (moves.length === 0) return;

  const move = moves[Math.floor(Math.random() * moves.length)];
  const [fr, fc, tr, tc] = move;

  makeMove(fr, fc, tr, tc, false);
}

function getLegalMovesForPiece(r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const moves = [];

  for (let rr = 0; rr < 8; rr++) {
    for (let cc = 0; cc < 8; cc++) {
      if (isLegalMove(r, c, rr, cc, piece)) {
        const backupBoard = JSON.parse(JSON.stringify(board));
        const backupMoved = JSON.parse(JSON.stringify(moved));

        board[rr][cc] = piece;
        board[r][c] = null;
        const safe = !isInCheck(piece[0]);

        board = backupBoard;
        moved = backupMoved;

        if (safe) moves.push([rr, cc]);
      }
    }
  }
  return moves;
}

function getAllLegalMoves(color) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece[0] === color) {
        const lm = getLegalMovesForPiece(r, c);
        lm.forEach(m => moves.push([r, c, m[0], m[1]]));
      }
    }
  }
  return moves;
}

function isInCheck(color) {
  let kingPos = null;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === color + 'K') kingPos = [r, c];
    }
  }
  if (!kingPos) return false;

  const enemy = color === 'w' ? 'b' : 'w';

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece[0] === enemy) {
        if (canAttack(r, c, kingPos[0], kingPos[1], piece)) return true;
      }
    }
  }
  return false;
}

function isSquareAttacked(r, c, byColor) {
  for (let rr = 0; rr < 8; rr++) {
    for (let cc = 0; cc < 8; cc++) {
      const piece = board[rr][cc];
      if (piece && piece[0] === byColor) {
        if (canAttack(rr, cc, r, c, piece)) return true;
      }
    }
  }
  return false;
}

function canAttack(fr, fc, tr, tc, piece) {
  const color = piece[0];
  const type = piece[1];
  const dr = tr - fr;
  const dc = tc - fc;

  switch (type) {
    case 'P':
      const dir = color === 'w' ? -1 : 1;
      return (dr === dir && Math.abs(dc) === 1);
    case 'R':
      return rook(fr, fc, tr, tc);
    case 'B':
      return bishop(fr, fc, tr, tc);
    case 'Q':
      return queen(fr, fc, tr, tc);
    case 'N':
      return knight(dr, dc);
    case 'K':
      return Math.max(Math.abs(dr), Math.abs(dc)) === 1;
  }
  return false;
}

function isLegalMove(fr, fc, tr, tc, piece) {
  if (fr === tr && fc === tc) return false;
  if (!piece) return false;
  const color = piece[0];
  const type = piece[1];
  const target = board[tr][tc];

  if (target && target[0] === color) return false;
  if (target && target[1] === 'K') return false;

  const dr = tr - fr;
  const dc = tc - fc;

  switch (type) {
    case 'P': return pawn(fr, fc, tr, tc, color);
    case 'R': return rook(fr, fc, tr, tc);
    case 'N': return knight(dr, dc);
    case 'B': return bishop(fr, fc, tr, tc);
    case 'Q': return queen(fr, fc, tr, tc);
    case 'K': return king(fr, fc, tr, tc, color);
  }
  return false;
}

function pawn(fr, fc, tr, tc, color) {
  const dir = color === 'w' ? -1 : 1;
  const start = color === 'w' ? 6 : 1;
  const target = board[tr][tc];

  if (fc === tc && !target) {
    if (tr - fr === dir) return true;
    if (fr === start && tr - fr === 2 * dir && !board[fr + dir][fc]) return true;
  }

  if (Math.abs(tc - fc) === 1 && tr - fr === dir && target && target[0] !== color) {
    return true;
  }

  return false;
}

function rook(fr, fc, tr, tc) {
  if (fr !== tr && fc !== tc) return false;
  return clear(fr, fc, tr, tc);
}

function bishop(fr, fc, tr, tc) {
  if (Math.abs(fr - tr) !== Math.abs(fc - tc)) return false;
  return clear(fr, fc, tr, tc);
}

function queen(fr, fc, tr, tc) {
  if (fr === tr || fc === tc || Math.abs(fr - tr) === Math.abs(fc - tc)) {
    return clear(fr, fc, tr, tc);
  }
  return false;
}

function knight(dr, dc) {
  return (Math.abs(dr) === 2 && Math.abs(dc) === 1) ||
         (Math.abs(dr) === 1 && Math.abs(dc) === 2);
}

function king(fr, fc, tr, tc, color) {
  const enemy = color === 'w' ? 'b' : 'w';

  // normale Königszüge
  if (Math.max(Math.abs(tr - fr), Math.abs(tc - fc)) === 1) {
    return true;
  }

  // Rochade nur, wenn König nicht im Schach steht
  if (isInCheck(color)) return false;

  const homeRank = (color === 'w') ? 7 : 0;

  if (fr === homeRank && fc === 4 && tr === homeRank) {

    // kurze Rochade
    if (tc === 6) {
      if (color === 'w' && moved.wK) return false;
      if (color === 'b' && moved.bK) return false;

      if (color === 'w' && moved.wR7) return false;
      if (color === 'b' && moved.bR7) return false;

      if (board[homeRank][7] !== color + 'R') return false;

      if (!board[homeRank][5] && !board[homeRank][6] &&
          !isSquareAttacked(homeRank, 4, enemy) &&
          !isSquareAttacked(homeRank, 5, enemy) &&
          !isSquareAttacked(homeRank, 6, enemy)) {
        return true;
      }
    }

    // lange Rochade
    if (tc === 2) {
      if (color === 'w' && moved.wK) return false;
      if (color === 'b' && moved.bK) return false;

      if (color === 'w' && moved.wR0) return false;
      if (color === 'b' && moved.bR0) return false;

      if (board[homeRank][0] !== color + 'R') return false;

      if (!board[homeRank][1] && !board[homeRank][2] && !board[homeRank][3] &&
          !isSquareAttacked(homeRank, 4, enemy) &&
          !isSquareAttacked(homeRank, 3, enemy) &&
          !isSquareAttacked(homeRank, 2, enemy)) {
        return true;
      }
    }
  }

  return false;
}

function clear(fr, fc, tr, tc) {
  const sr = Math.sign(tr - fr);
  const sc = Math.sign(tc - fc);
  let r = fr + sr, c = fc + sc;

  while (r !== tr || c !== tc) {
    if (board[r][c]) return false;
    r += sr;
    c += sc;
  }
  return true;
}
