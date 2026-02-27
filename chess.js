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

let moved = { wK:false,bK:false,wR0:false,wR7:false,bR0:false,bR7:false };

const PIECES = {
  'wP':'♙','wR':'♖','wN':'♘','wB':'♗','wQ':'♕','wK':'♔',
  'bP':'♟','bR':'♜','bN':'♞','bB':'♝','bQ':'♛','bK':'♚'
};
const SCORES = { P:1,N:3,B:3,R:5,Q:9 };

function startGame(color) {
  playerColor = color;
  botColor = color === 'w' ? 'b' : 'w';
  currentTurn = 'w';
  flipped = (playerColor === 'b');
  boardEl.style.transform = flipped ? "rotate(180deg)" : "none";

  playerTime = 300; botTime = 300; updateTimers();
  clearInterval(timerInterval);
  timerInterval = setInterval(updateClock,1000);

  playerScoreEl.textContent = "0";
  botScoreEl.textContent = "0";
  moved = { wK:false,bK:false,wR0:false,wR7:false,bR0:false,bR7:false };

  initBoard();
  renderBoard();
  updateStatus();
  if (playerColor === 'b') botMove();
}

function updateClock() {
  if (currentTurn === playerColor) { if (playerTime>0) playerTime--; }
  else { if (botTime>0) botTime--; }
  updateTimers();
}
function updateTimers() {
  playerTimeEl.textContent = formatTime(playerTime);
  botTimeEl.textContent = formatTime(botTime);
}
function formatTime(t) {
  const m = Math.floor(t/60), s = t%60;
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
  let checkKing = null;
  if (isInCheck(currentTurn)) {
    for (let r=0;r<8;r++) for (let c=0;c<8;c++)
      if (board[r][c] === currentTurn+'K') checkKing = [r,c];
  }

  for (let r=0;r<8;r++) {
    for (let c=0;c<8;c++) {
      const sq = document.createElement('div');
      sq.classList.add('square');
      sq.classList.add((r+c)%2===0 ? 'light':'dark');

      const rr = flipped ? 7-r : r;
      const cc = flipped ? 7-c : c;
      sq.dataset.row = rr; sq.dataset.col = cc;

      const piece = board[rr][cc];
      if (piece) {
        sq.textContent = PIECES[piece];
        sq.style.color = piece[0]==='w' ? '#ffffff' : '#000000';
      }

      if (legalMoves.some(m=>m[0]===rr && m[1]===cc)) sq.classList.add('highlight');
      if (checkKing && rr===checkKing[0] && cc===checkKing[1]) sq.classList.add('check-king');

      sq.onclick = () => onSquareClick(rr,cc);
      boardEl.appendChild(sq);
    }
  }
}

function isStalemate(color) {
  if (isInCheck(color)) return false;
  return getAllLegalMoves(color).length === 0;
}

function isInsufficientMaterial() {
  const pieces = [];
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    const p = board[r][c];
    if (p) pieces.push(p);
  }
  if (pieces.length === 2) return true; // nur Könige
  const minors = pieces.filter(p=>['B','N'].includes(p[1]));
  const others = pieces.filter(p=>!['K','B','N'].includes(p[1]));
  if (others.length>0) return false;
  if (pieces.length===3 && minors.length===1) return true; // K+B vs K oder K+N vs K
  return false;
}

function updateStatus() {
  if (isCheckmate(currentTurn)) {
    statusEl.textContent = (currentTurn==='w'?"Weiß":"Schwarz")+" ist schachmatt!";
    return;
  }
  if (isStalemate(currentTurn)) {
    statusEl.textContent = "Remis (Patt).";
    return;
  }
  if (isInsufficientMaterial()) {
    statusEl.textContent = "Remis (unzureichendes Material).";
    return;
  }
  if (isInCheck(currentTurn)) {
    statusEl.textContent = (currentTurn==='w'?"Weiß":"Schwarz")+" steht im Schach!";
    return;
  }
  statusEl.textContent = currentTurn===playerColor ? "Du bist am Zug" : "Bot denkt...";
}
function onSquareClick(r,c) {
  if (currentTurn !== playerColor) return;
  const piece = board[r][c];

  if (selectedSquare) {
    const [sr,sc] = selectedSquare;
    if (legalMoves.some(m=>m[0]===r && m[1]===c)) {
      makeMove(sr,sc,r,c,true);
      return;
    }
    selectedSquare = null; legalMoves = []; renderBoard();
  } else {
    if (piece && piece[0]===playerColor) {
      selectedSquare = [r,c];
      legalMoves = getLegalMovesForPiece(r,c);
      renderBoard();
    }
  }
}

function makeMove(fr,fc,tr,tc,isPlayer) {
  const piece = board[fr][fc];
  const target = board[tr][tc];

  if (target) updateScore(piece[0],target);

  if (piece==='wK') moved.wK = true;
  if (piece==='bK') moved.bK = true;
  if (piece==='wR' && fr===7 && fc===0) moved.wR0 = true;
  if (piece==='wR' && fr===7 && fc===7) moved.wR7 = true;
  if (piece==='bR' && fr===0 && fc===0) moved.bR0 = true;
  if (piece==='bR' && fr===0 && fc===7) moved.bR7 = true;

  if (piece[1]==='K' && Math.abs(tc-fc)===2) {
    if (tc===fc+2) { board[fr][fc+1]=board[fr][7]; board[fr][7]=null; }
    else { board[fr][fc-1]=board[fr][0]; board[fr][0]=null; }
  }

  board[tr][tc] = piece;
  board[fr][fc] = null;

  if (piece[1]==='P') {
    if ((piece[0]==='w' && tr===0) || (piece[0]==='b' && tr===7)) {
      if (isPlayer) {
        showPromotionBox(piece[0],tr,tc);
        selectedSquare=null; legalMoves=[]; renderBoard();
        return;
      } else {
        board[tr][tc] = piece[0]+'Q';
      }
    }
  }

  selectedSquare = null;
  legalMoves = [];
  currentTurn = isPlayer ? botColor : playerColor;
  renderBoard();
  updateStatus();
  if (isPlayer) setTimeout(botMove,200);
}

function showPromotionBox(color,r,c) {
  const box = document.getElementById('promotionBox');
  box.style.display = 'block';
  promotionCallback = (pieceType)=>{
    board[r][c] = color+pieceType;
    box.style.display='none';
    promotionCallback=null;
    currentTurn = botColor;
    renderBoard();
    updateStatus();
    setTimeout(botMove,200);
  };
}
function promote(type) { if (promotionCallback) promotionCallback(type); }

function updateScore(color,captured) {
  const val = SCORES[captured[1]] || 0;
  if (color===playerColor)
    playerScoreEl.textContent = parseInt(playerScoreEl.textContent)+val;
  else
    botScoreEl.textContent = parseInt(botScoreEl.textContent)+val;
}

// Minimax light (Tiefe 2)
function botMove() {
  const moves = getAllLegalMoves(botColor);
  if (moves.length===0) return;

  let bestScore = -99999;
  let bestMoves = [];

  for (const move of moves) {
    const [fr,fc,tr,tc] = move;
    const backupBoard = JSON.parse(JSON.stringify(board));
    const backupMoved = JSON.parse(JSON.stringify(moved));
    const piece = board[fr][fc];
    const target = board[tr][tc];

    board[tr][tc] = piece;
    board[fr][fc] = null;

    let score = evaluatePosition(botColor,2,false);

    board = backupBoard;
    moved = backupMoved;

    if (score>bestScore) { bestScore=score; bestMoves=[move]; }
    else if (score===bestScore) bestMoves.push(move);
  }

  const chosen = bestMoves[Math.floor(Math.random()*bestMoves.length)];
  const [fr,fc,tr,tc] = chosen;
  makeMove(fr,fc,tr,tc,false);
}

function evaluateBoard(color) {
  let score = 0;
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    const p = board[r][c];
    if (!p) continue;
    const v = SCORES[p[1]] || 0;
    score += (p[0]===color ? v : -v);
  }
  return score;
}

function evaluatePosition(color,depth,isPlayerTurn) {
  if (depth===0) return evaluateBoard(color);
  const turnColor = isPlayerTurn ? playerColor : botColor;
  const moves = getAllLegalMoves(turnColor);
  if (moves.length===0) {
    if (isInCheck(turnColor)) {
      return turnColor===color ? -9999 : 9999;
    }
    return 0; // Patt
  }

  if (turnColor===color) {
    let best=-99999;
    for (const m of moves) {
      const [fr,fc,tr,tc]=m;
      const backupBoard = JSON.parse(JSON.stringify(board));
      const backupMoved = JSON.parse(JSON.stringify(moved));
      const piece = board[fr][fc];
      board[tr][tc]=piece; board[fr][fc]=null;
      const val = evaluatePosition(color,depth-1,!isPlayerTurn);
      board=backupBoard; moved=backupMoved;
      if (val>best) best=val;
    }
    return best;
  } else {
    let best=99999;
    for (const m of moves) {
      const [fr,fc,tr,tc]=m;
      const backupBoard = JSON.parse(JSON.stringify(board));
      const backupMoved = JSON.parse(JSON.stringify(moved));
      const piece = board[fr][fc];
      board[tr][tc]=piece; board[fr][fc]=null;
      const val = evaluatePosition(color,depth-1,!isPlayerTurn);
      board=backupBoard; moved=backupMoved;
      if (val<best) best=val;
    }
    return best;
  }
}
function getLegalMovesForPiece(r,c) {
  const piece = board[r][c];
  if (!piece) return [];
  const moves = [];
  for (let rr=0;rr<8;rr++) for (let cc=0;cc<8;cc++) {
    if (isLegalMove(r,c,rr,cc,piece)) {
      const backupBoard = JSON.parse(JSON.stringify(board));
      const backupMoved = JSON.parse(JSON.stringify(moved));
      board[rr][cc]=piece; board[r][c]=null;
      const safe = !isInCheck(piece[0]);
      board=backupBoard; moved=backupMoved;
      if (safe) moves.push([rr,cc]);
    }
  }
  return moves;
}

function getAllLegalMoves(color) {
  const moves=[];
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    const p=board[r][c];
    if (p && p[0]===color) {
      const lm=getLegalMovesForPiece(r,c);
      lm.forEach(m=>moves.push([r,c,m[0],m[1]]));
    }
  }
  return moves;
}

function isInCheck(color) {
  let kingPos=null;
  for (let r=0;r<8;r++) for (let c=0;c<8;c++)
    if (board[r][c]===color+'K') kingPos=[r,c];
  if (!kingPos) return false;
  const enemy = color==='w'?'b':'w';
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    const p=board[r][c];
    if (p && p[0]===enemy) if (canAttack(r,c,kingPos[0],kingPos[1],p)) return true;
  }
  return false;
}

function isSquareAttacked(r,c,byColor) {
  for (let rr=0;rr<8;rr++) for (let cc=0;cc<8;cc++) {
    const p=board[rr][cc];
    if (p && p[0]===byColor) if (canAttack(rr,cc,r,c,p)) return true;
  }
  return false;
}

function canAttack(fr,fc,tr,tc,piece) {
  const color=piece[0], type=piece[1];
  const dr=tr-fr, dc=tc-fc;
  switch(type) {
    case 'P': {
      const dir=color==='w'?-1:1;
      return dr===dir && Math.abs(dc)===1;
    }
    case 'R': return rook(fr,fc,tr,tc);
    case 'B': return bishop(fr,fc,tr,tc);
    case 'Q': return queen(fr,fc,tr,tc);
    case 'N': return knight(dr,dc);
    case 'K': return Math.max(Math.abs(dr),Math.abs(dc))===1;
  }
  return false;
}

function isLegalMove(fr,fc,tr,tc,piece) {
  if (fr===tr && fc===tc) return false;
  if (!piece) return false;
  const color=piece[0], type=piece[1];
  const target=board[tr][tc];
  if (target && target[0]===color) return false;
  if (target && target[1]==='K') return false;
  const dr=tr-fr, dc=tc-fc;
  switch(type) {
    case 'P': return pawn(fr,fc,tr,tc,color);
    case 'R': return rook(fr,fc,tr,tc);
    case 'N': return knight(dr,dc);
    case 'B': return bishop(fr,fc,tr,tc);
    case 'Q': return queen(fr,fc,tr,tc);
    case 'K': return king(fr,fc,tr,tc,color);
  }
  return false;
}

function pawn(fr,fc,tr,tc,color) {
  const dir=color==='w'?-1:1;
  const start=color==='w'?6:1;
  const target=board[tr][tc];
  if (fc===tc && !target) {
    if (tr-fr===dir) return true;
    if (fr===start && tr-fr===2*dir && !board[fr+dir][fc]) return true;
  }
  if (Math.abs(tc-fc)===1 && tr-fr===dir && target && target[0]!==color) return true;
  return false;
}

function rook(fr,fc,tr,tc) {
  if (fr!==tr && fc!==tc) return false;
  return clear(fr,fc,tr,tc);
}
function bishop(fr,fc,tr,tc) {
  if (Math.abs(fr-tr)!==Math.abs(fc-tc)) return false;
  return clear(fr,fc,tr,tc);
}
function queen(fr,fc,tr,tc) {
  if (fr===tr || fc===tc || Math.abs(fr-tr)===Math.abs(fc-tc)) return clear(fr,fc,tr,tc);
  return false;
}
function knight(dr,dc) {
  return (Math.abs(dr)===2 && Math.abs(dc)===1) || (Math.abs(dr)===1 && Math.abs(dc)===2);
}

function king(fr,fc,tr,tc,color) {
  const enemy=color==='w'?'b':'w';
  if (Math.max(Math.abs(tr-fr),Math.abs(tc-fc))===1) return true;
  if (isInCheck(color)) return false;
  const homeRank=color==='w'?7:0;
  if (fr===homeRank && fc===4 && tr===homeRank) {
    if (tc===6) {
      if (color==='w'&&moved.wK) return false;
      if (color==='b'&&moved.bK) return false;
      if (color==='w'&&moved.wR7) return false;
      if (color==='b'&&moved.bR7) return false;
      if (board[homeRank][7]!==color+'R') return false;
      if (board[homeRank][5]||board[homeRank][6]) return false;
      if (isSquareAttacked(homeRank,4,enemy)) return false;
      if (isSquareAttacked(homeRank,5,enemy)) return false;
      if (isSquareAttacked(homeRank,6,enemy)) return false;
      return true;
    }
    if (tc===2) {
      if (color==='w'&&moved.wK) return false;
      if (color==='b'&&moved.bK) return false;
      if (color==='w'&&moved.wR0) return false;
      if (color==='b'&&moved.bR0) return false;
      if (board[homeRank][0]!==color+'R') return false;
      if (board[homeRank][1]||board[homeRank][2]||board[homeRank][3]) return false;
      if (isSquareAttacked(homeRank,4,enemy)) return false;
      if (isSquareAttacked(homeRank,3,enemy)) return false;
      if (isSquareAttacked(homeRank,2,enemy)) return false;
      return true;
    }
  }
  return false;
}

function clear(fr,fc,tr,tc) {
  const sr=Math.sign(tr-fr), sc=Math.sign(tc-fc);
  let r=fr+sr, c=fc+sc;
  while (r!==tr || c!==tc) {
    if (board[r][c]) return false;
    r+=sr; c+=sc;
  }
  return true;
}
