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

  initBoard();
  renderBoard();
  updateStatus();

  if (playerColor === 'b') botMove();
}

function updateClock() {
  if (currentTurn === playerColor) {
    playerTime--;
  } else {
    botTime--;
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
      makeMove(sr, sc, r, c);
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

function makeMove(fr, fc, tr, tc) {
  const piece = board[fr][fc];
  const target = board[tr][tc];

  if (target) updateScore(piece[0], target);

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
      showPromotionBox(piece[0], tr, tc);
      return;
    }
  }

  selectedSquare = null;
  legalMoves = [];

  currentTurn = botColor;
  renderBoard();
  updateStatus();

  setTimeout(botMove, 200);
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
  const val = SCORES[captured[1]];
  if (color === playerColor) {
    playerScoreEl.textContent = parseInt(playerScoreEl.textContent) + val;
  } else {
    botScoreEl.textContent = parseInt(botScoreEl.textContent) + val;
  }
}

function botMove() {
  const moves = getAllLegalMoves(botColor);

  const safeMoves = moves.filter(m => {
    const [fr, fc, tr, tc] = m;
    const backup = JSON.parse(JSON.stringify(board));
    board[tr][tc] = board[fr][fc];
    board[fr][fc] = null;
    const safe = !isInCheck(botColor);
    board = backup;
    return safe;
  });

  const finalMoves = safeMoves.length > 0 ? safeMoves : moves;

  if (finalMoves.length === 0) return;

  const move = finalMoves[Math.floor(Math.random() * finalMoves.length)];
  const [fr, fc, tr, tc] = move;

  const target = board[tr][tc];
  if (target) updateScore(botColor, target);

  board[tr][tc] = board[fr][fc];
  board[fr][fc] = null;

  if (board[tr][tc][1] === 'P') {
    if ((botColor === 'w' && tr === 0) || (botColor === 'b' && tr === 7)) {
      board[tr][tc] = botColor + 'Q';
    }
  }

  currentTurn = playerColor;
  renderBoard();
  updateStatus();
}

function getLegalMovesForPiece(r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const moves = [];

  for (let rr = 0; rr < 8; rr++) {
    for (let cc = 0; cc < 8; cc++) {
      if (isLegalMove(r, c, rr, cc, piece)) {
        const backup = JSON.parse(JSON.stringify(board));
        board[rr][cc] = piece;
        board[r][c] = null;
        const safe = !isInCheck(piece[0]);
        board = backup;

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

  const enemy = color === 'w' ? 'b' : 'w';
  const moves = getAllLegalMoves(enemy);

  return moves.some(m => m[2] === kingPos[0] && m[3] === kingPos[1]);
}
function isLegalMove(fr, fc, tr, tc, piece) {
  if (!piece) return false;
  const color = piece[0];
  const type = piece[1];
  const target = board[tr][tc];

  if (target && target[0] === color) return false;

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
  if (Math.max(Math.abs(tr - fr), Math.abs(tc - fc)) === 1) return true;

  if (fr === (color === 'w' ? 7 : 0) && fc === 4) {
    if (tc === 6 && tr === fr) {
      if (!board[fr][5] && !board[fr][6]) return true;
    }
    if (tc === 2 && tr === fr) {
      if (!board[fr][1] && !board[fr][2] && !board[fr][3]) return true;
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
