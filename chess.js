const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');

let board = [];
let selectedSquare = null;
let playerColor = 'w';
let botColor = 'b';
let currentTurn = 'w';
let flipped = false;

const PIECES = {
  'wP': '♙','wR': '♖','wN': '♘','wB': '♗','wQ': '♕','wK': '♔',
  'bP': '♟','bR': '♜','bN': '♞','bB': '♝','bQ': '♛','bK': '♚'
};

function startGame(color) {
  playerColor = color;
  botColor = color === 'w' ? 'b' : 'w';
  currentTurn = 'w';

  flipped = (playerColor === 'b');
  boardEl.style.transform = flipped ? "rotate(180deg)" : "none";

  initBoard();
  renderBoard();
  updateStatus();

  if (playerColor === 'b') botMove();
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

      sq.onclick = () => onSquareClick(rr, cc);
      boardEl.appendChild(sq);
    }
  }
}

function updateStatus() {
  statusEl.textContent = currentTurn === playerColor ? "Du bist am Zug" : "Bot denkt...";
}

function onSquareClick(r, c) {
  if (currentTurn !== playerColor) return;

  const piece = board[r][c];

  if (selectedSquare) {
    const [sr, sc] = selectedSquare;
    const movingPiece = board[sr][sc];

    if (isLegalMove(sr, sc, r, c, movingPiece)) {
      board[r][c] = movingPiece;
      board[sr][sc] = null;
      selectedSquare = null;
      currentTurn = botColor;
      renderBoard();
      updateStatus();
      setTimeout(botMove, 200);
    } else {
      selectedSquare = null;
      renderBoard();
    }
  } else {
    if (piece && piece[0] === playerColor) {
      selectedSquare = [r, c];
      highlight(r, c);
    }
  }
}

function highlight(r, c) {
  renderBoard();
  const squares = document.querySelectorAll('.square');
  squares.forEach(s => {
    if (parseInt(s.dataset.row) === r && parseInt(s.dataset.col) === c) {
      s.classList.add('selected');
    }
  });
}

function botMove() {
  const moves = getAllLegalMoves(botColor);
  if (moves.length === 0) return;

  const move = moves[Math.floor(Math.random() * moves.length)];
  const [fr, fc, tr, tc] = move;

  board[tr][tc] = board[fr][fc];
  board[fr][fc] = null;

  currentTurn = playerColor;
  renderBoard();
  updateStatus();
}

function getAllLegalMoves(color) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece[0] === color) {
        for (let rr = 0; rr < 8; rr++) {
          for (let cc = 0; cc < 8; cc++) {
            if (isLegalMove(r, c, rr, cc, piece)) {
              moves.push([r, c, rr, cc]);
            }
          }
        }
      }
    }
  }
  return moves;
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
    case 'K': return king(dr, dc);
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

function king(dr, dc) {
  return Math.max(Math.abs(dr), Math.abs(dc)) === 1;
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
