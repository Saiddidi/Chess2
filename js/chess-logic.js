// Chess Game Logic Implementation
class ChessGame {
    constructor() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.gameHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.gameState = 'playing'; // 'playing', 'check', 'checkmate', 'stalemate', 'draw'
        this.moveHistory = [];
        this.fiftyMoveRule = 0;
        this.threefoldRepetition = {};
        
        // Castling rights
        this.castlingRights = {
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true }
        };
        
        // En passant target square
        this.enPassantTarget = null;
    }
    
    initializeBoard() {
        const board = Array(8).fill(null).map(() => Array(8).fill(null));
        
        // Place pawns
        for (let i = 0; i < 8; i++) {
            board[1][i] = { type: 'pawn', color: 'black' };
            board[6][i] = { type: 'pawn', color: 'white' };
        }
        
        // Place other pieces
        const pieceOrder = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        for (let i = 0; i < 8; i++) {
            board[0][i] = { type: pieceOrder[i], color: 'black' };
            board[7][i] = { type: pieceOrder[i], color: 'white' };
        }
        
        return board;
    }
    
    // Convert board position to FEN notation
    toFEN() {
        let fen = '';
        
        // Board position
        for (let row = 0; row < 8; row++) {
            let emptyCount = 0;
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    if (emptyCount > 0) {
                        fen += emptyCount;
                        emptyCount = 0;
                    }
                    const pieceChar = this.getPieceChar(piece);
                    fen += piece.color === 'white' ? pieceChar.toUpperCase() : pieceChar.toLowerCase();
                } else {
                    emptyCount++;
                }
            }
            if (emptyCount > 0) {
                fen += emptyCount;
            }
            if (row < 7) fen += '/';
        }
        
        // Active color
        fen += ' ' + (this.currentPlayer === 'white' ? 'w' : 'b');
        
        // Castling rights
        let castling = '';
        if (this.castlingRights.white.kingside) castling += 'K';
        if (this.castlingRights.white.queenside) castling += 'Q';
        if (this.castlingRights.black.kingside) castling += 'k';
        if (this.castlingRights.black.queenside) castling += 'q';
        fen += ' ' + (castling || '-');
        
        // En passant target
        fen += ' ' + (this.enPassantTarget || '-');
        
        // Halfmove clock and fullmove number
        fen += ' ' + this.fiftyMoveRule + ' ' + Math.ceil(this.moveHistory.length / 2);
        
        return fen;
    }
    
    getPieceChar(piece) {
        const chars = {
            'pawn': 'p', 'rook': 'r', 'knight': 'n',
            'bishop': 'b', 'queen': 'q', 'king': 'k'
        };
        return chars[piece.type];
    }
    
    // Check if a move is valid
    isValidMove(fromRow, fromCol, toRow, toCol) {
        // Basic bounds checking
        if (fromRow < 0 || fromRow > 7 || fromCol < 0 || fromCol > 7 ||
            toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) {
            return false;
        }
        
        const piece = this.board[fromRow][fromCol];
        if (!piece || piece.color !== this.currentPlayer) {
            return false;
        }
        
        const targetPiece = this.board[toRow][toCol];
        if (targetPiece && targetPiece.color === piece.color) {
            return false;
        }
        
        // Check piece-specific movement rules
        if (!this.isPieceMovementValid(piece, fromRow, fromCol, toRow, toCol)) {
            return false;
        }
        
        // Check if move would leave king in check
        if (this.wouldLeaveKingInCheck(fromRow, fromCol, toRow, toCol)) {
            return false;
        }
        
        return true;
    }
    
    isPieceMovementValid(piece, fromRow, fromCol, toRow, toCol) {
        const rowDiff = toRow - fromRow;
        const colDiff = toCol - fromCol;
        const absRowDiff = Math.abs(rowDiff);
        const absColDiff = Math.abs(colDiff);
        
        switch (piece.type) {
            case 'pawn':
                return this.isPawnMoveValid(piece, fromRow, fromCol, toRow, toCol);
            case 'rook':
                return (rowDiff === 0 || colDiff === 0) && this.isPathClear(fromRow, fromCol, toRow, toCol);
            case 'bishop':
                return absRowDiff === absColDiff && this.isPathClear(fromRow, fromCol, toRow, toCol);
            case 'queen':
                return (rowDiff === 0 || colDiff === 0 || absRowDiff === absColDiff) && 
                       this.isPathClear(fromRow, fromCol, toRow, toCol);
            case 'knight':
                return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);
            case 'king':
                return this.isKingMoveValid(piece, fromRow, fromCol, toRow, toCol);
            default:
                return false;
        }
    }
    
    isPawnMoveValid(piece, fromRow, fromCol, toRow, toCol) {
        const direction = piece.color === 'white' ? -1 : 1;
        const startRow = piece.color === 'white' ? 6 : 1;
        const rowDiff = toRow - fromRow;
        const colDiff = Math.abs(toCol - fromCol);
        
        // Forward move
        if (colDiff === 0) {
            if (rowDiff === direction && !this.board[toRow][toCol]) {
                return true;
            }
            if (fromRow === startRow && rowDiff === 2 * direction && 
                !this.board[toRow][toCol] && !this.board[fromRow + direction][fromCol]) {
                return true;
            }
        }
        
        // Diagonal capture
        if (colDiff === 1 && rowDiff === direction) {
            if (this.board[toRow][toCol] && this.board[toRow][toCol].color !== piece.color) {
                return true;
            }
            // En passant
            if (this.enPassantTarget === `${toRow}${toCol}`) {
                return true;
            }
        }
        
        return false;
    }
    
    isKingMoveValid(piece, fromRow, fromCol, toRow, toCol) {
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);
        
        // Normal king move
        if (rowDiff <= 1 && colDiff <= 1) {
            return true;
        }
        
        // Castling
        if (rowDiff === 0 && colDiff === 2) {
            return this.canCastle(piece.color, toCol > fromCol ? 'kingside' : 'queenside');
        }
        
        return false;
    }
    
    canCastle(color, side) {
        if (!this.castlingRights[color][side]) {
            return false;
        }
        
        if (this.isInCheck(color)) {
            return false;
        }
        
        const row = color === 'white' ? 7 : 0;
        const kingCol = 4;
        const rookCol = side === 'kingside' ? 7 : 0;
        const direction = side === 'kingside' ? 1 : -1;
        
        // Check if squares between king and rook are empty
        for (let col = kingCol + direction; col !== rookCol; col += direction) {
            if (this.board[row][col]) {
                return false;
            }
        }
        
        // Check if king passes through check
        for (let i = 1; i <= 2; i++) {
            const testCol = kingCol + i * direction;
            if (this.wouldBeInCheck(color, row, testCol)) {
                return false;
            }
        }
        
        return true;
    }
    
    isPathClear(fromRow, fromCol, toRow, toCol) {
        const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
        const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;
        
        let currentRow = fromRow + rowStep;
        let currentCol = fromCol + colStep;
        
        while (currentRow !== toRow || currentCol !== toCol) {
            if (this.board[currentRow][currentCol]) {
                return false;
            }
            currentRow += rowStep;
            currentCol += colStep;
        }
        
        return true;
    }
    
    wouldLeaveKingInCheck(fromRow, fromCol, toRow, toCol) {
        // Make temporary move
        const originalPiece = this.board[toRow][toCol];
        const movingPiece = this.board[fromRow][fromCol];
        
        this.board[toRow][toCol] = movingPiece;
        this.board[fromRow][fromCol] = null;
        
        const inCheck = this.isInCheck(movingPiece.color);
        
        // Restore board
        this.board[fromRow][fromCol] = movingPiece;
        this.board[toRow][toCol] = originalPiece;
        
        return inCheck;
    }
    
    isInCheck(color) {
        const kingPosition = this.findKing(color);
        if (!kingPosition) return false;
        
        return this.wouldBeInCheck(color, kingPosition.row, kingPosition.col);
    }
    
    wouldBeInCheck(color, row, col) {
        const opponentColor = color === 'white' ? 'black' : 'white';
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece && piece.color === opponentColor) {
                    if (this.isPieceMovementValid(piece, r, c, row, col)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'king' && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }
    
    makeMove(fromRow, fromCol, toRow, toCol, promotionPiece = 'queen') {
        if (!this.isValidMove(fromRow, fromCol, toRow, toCol)) {
            return false;
        }
        
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];
        
        // Store move in history
        const move = {
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece: piece,
            captured: capturedPiece,
            castling: null,
            enPassant: null,
            promotion: null
        };
        
        // Handle special moves
        if (piece.type === 'king' && Math.abs(toCol - fromCol) === 2) {
            // Castling
            const side = toCol > fromCol ? 'kingside' : 'queenside';
            const rookFromCol = side === 'kingside' ? 7 : 0;
            const rookToCol = side === 'kingside' ? 5 : 3;
            
            this.board[toRow][rookToCol] = this.board[toRow][rookFromCol];
            this.board[toRow][rookFromCol] = null;
            
            move.castling = side;
        }
        
        if (piece.type === 'pawn') {
            // En passant capture
            if (this.enPassantTarget === `${toRow}${toCol}` && !capturedPiece) {
                const capturedRow = piece.color === 'white' ? toRow + 1 : toRow - 1;
                const capturedPawn = this.board[capturedRow][toCol];
                this.board[capturedRow][toCol] = null;
                this.capturedPieces[capturedPawn.color].push(capturedPawn);
                move.enPassant = capturedPawn;
            }
            
            // Pawn promotion
            if ((piece.color === 'white' && toRow === 0) || (piece.color === 'black' && toRow === 7)) {
                piece.type = promotionPiece;
                move.promotion = promotionPiece;
            }
            
            // Set en passant target for double pawn move
            if (Math.abs(toRow - fromRow) === 2) {
                this.enPassantTarget = `${fromRow + (toRow - fromRow) / 2}${fromCol}`;
            } else {
                this.enPassantTarget = null;
            }
        } else {
            this.enPassantTarget = null;
        }
        
        // Make the move
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        
        // Handle captured pieces
        if (capturedPiece) {
            this.capturedPieces[capturedPiece.color].push(capturedPiece);
        }
        
        // Update castling rights
        this.updateCastlingRights(piece, fromRow, fromCol);
        
        // Update fifty-move rule
        if (piece.type === 'pawn' || capturedPiece) {
            this.fiftyMoveRule = 0;
        } else {
            this.fiftyMoveRule++;
        }
        
        // Add move to history
        this.moveHistory.push(move);
        
        // Switch players
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        
        // Update game state
        this.updateGameState();
        
        // Update position repetition tracking
        const fen = this.toFEN().split(' ').slice(0, 3).join(' '); // Only position, color, and castling
        this.threefoldRepetition[fen] = (this.threefoldRepetition[fen] || 0) + 1;
        
        return true;
    }
    
    updateCastlingRights(piece, fromRow, fromCol) {
        if (piece.type === 'king') {
            this.castlingRights[piece.color].kingside = false;
            this.castlingRights[piece.color].queenside = false;
        } else if (piece.type === 'rook') {
            if (piece.color === 'white' && fromRow === 7) {
                if (fromCol === 0) this.castlingRights.white.queenside = false;
                if (fromCol === 7) this.castlingRights.white.kingside = false;
            } else if (piece.color === 'black' && fromRow === 0) {
                if (fromCol === 0) this.castlingRights.black.queenside = false;
                if (fromCol === 7) this.castlingRights.black.kingside = false;
            }
        }
    }
    
    updateGameState() {
        const inCheck = this.isInCheck(this.currentPlayer);
        const hasValidMoves = this.hasValidMoves(this.currentPlayer);
        
        if (inCheck && !hasValidMoves) {
            this.gameState = 'checkmate';
        } else if (!inCheck && !hasValidMoves) {
            this.gameState = 'stalemate';
        } else if (inCheck) {
            this.gameState = 'check';
        } else if (this.fiftyMoveRule >= 50) {
            this.gameState = 'draw';
        } else if (this.isThreefoldRepetition()) {
            this.gameState = 'draw';
        } else if (this.isInsufficientMaterial()) {
            this.gameState = 'draw';
        } else {
            this.gameState = 'playing';
        }
    }
    
    hasValidMoves(color) {
        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = this.board[fromRow][fromCol];
                if (piece && piece.color === color) {
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            if (this.isValidMove(fromRow, fromCol, toRow, toCol)) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }
    
    isThreefoldRepetition() {
        const currentFen = this.toFEN().split(' ').slice(0, 3).join(' ');
        return this.threefoldRepetition[currentFen] >= 3;
    }
    
    isInsufficientMaterial() {
        const pieces = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    pieces.push(piece);
                }
            }
        }
        
        // King vs King
        if (pieces.length === 2) return true;
        
        // King and Bishop vs King or King and Knight vs King
        if (pieces.length === 3) {
            const nonKings = pieces.filter(p => p.type !== 'king');
            return nonKings.length === 1 && (nonKings[0].type === 'bishop' || nonKings[0].type === 'knight');
        }
        
        return false;
    }
    
    undoMove() {
        if (this.moveHistory.length === 0) return false;
        
        const lastMove = this.moveHistory.pop();
        
        // Restore piece position
        this.board[lastMove.from.row][lastMove.from.col] = lastMove.piece;
        this.board[lastMove.to.row][lastMove.to.col] = lastMove.captured;
        
        // Handle special moves
        if (lastMove.castling) {
            const row = lastMove.piece.color === 'white' ? 7 : 0;
            const side = lastMove.castling;
            const rookFromCol = side === 'kingside' ? 5 : 3;
            const rookToCol = side === 'kingside' ? 7 : 0;
            
            this.board[row][rookToCol] = this.board[row][rookFromCol];
            this.board[row][rookFromCol] = null;
        }
        
        if (lastMove.enPassant) {
            const capturedRow = lastMove.piece.color === 'white' ? lastMove.to.row + 1 : lastMove.to.row - 1;
            this.board[capturedRow][lastMove.to.col] = lastMove.enPassant;
            this.capturedPieces[lastMove.enPassant.color].pop();
        }
        
        if (lastMove.promotion) {
            lastMove.piece.type = 'pawn';
        }
        
        if (lastMove.captured && !lastMove.enPassant) {
            this.capturedPieces[lastMove.captured.color].pop();
        }
        
        // Switch back player
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        
        // TODO: Restore castling rights, en passant, fifty-move rule, etc.
        // This would require storing more state in the move history
        
        this.updateGameState();
        return true;
    }
    
    getAllValidMoves(color = this.currentPlayer) {
        const validMoves = [];
        
        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = this.board[fromRow][fromCol];
                if (piece && piece.color === color) {
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            if (this.isValidMove(fromRow, fromCol, toRow, toCol)) {
                                validMoves.push({
                                    from: { row: fromRow, col: fromCol },
                                    to: { row: toRow, col: toCol },
                                    piece: piece
                                });
                            }
                        }
                    }
                }
            }
        }
        
        return validMoves;
    }
    
    // Convert move to algebraic notation
    moveToAlgebraic(move) {
        // This is a simplified version - full algebraic notation is more complex
        const files = 'abcdefgh';
        const ranks = '87654321';
        
        const fromSquare = files[move.from.col] + ranks[move.from.row];
        const toSquare = files[move.to.col] + ranks[move.to.row];
        
        return fromSquare + toSquare;
    }
}



// Extended ChessGame methods for improved pawn promotion
ChessGame.prototype.handlePawnPromotion = function(fromRow, fromCol, toRow, toCol, callback) {
    const piece = this.board[fromRow][fromCol];
    
    if (piece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
        // Show promotion modal
        this.showPromotionModal(piece.color, (selectedPiece) => {
            // Perform the promotion
            this.board[toRow][toCol] = {
                type: selectedPiece,
                color: piece.color
            };
            this.board[fromRow][fromCol] = null;
            
            // Add to move history with promotion
            this.moveHistory.push({
                from: { row: fromRow, col: fromCol },
                to: { row: toRow, col: toCol },
                piece: piece,
                capturedPiece: null,
                promotion: selectedPiece,
                timestamp: Date.now()
            });
            
            callback(true);
        });
        return 'promotion_pending';
    }
    
    return false;
};

// Show promotion modal with piece selection
ChessGame.prototype.showPromotionModal = function(color, callback) {
    const modal = document.getElementById('promotionModal');
    const piecesContainer = document.getElementById('promotionPieces');
    
    // Clear previous content
    piecesContainer.innerHTML = '';
    
    // Define promotion pieces with their values and descriptions
    const promotionPieces = [
        { type: 'queen', name: 'Queen', value: '9 points', description: 'Most powerful piece' },
        { type: 'rook', name: 'Rook', value: '5 points', description: 'Strong in endgames' },
        { type: 'bishop', name: 'Bishop', value: '3 points', description: 'Good for long diagonals' },
        { type: 'knight', name: 'Knight', value: '3 points', description: 'Unique L-shaped moves' }
    ];
    
    // Create promotion piece options
    promotionPieces.forEach(pieceInfo => {
        const pieceElement = document.createElement('div');
        pieceElement.className = 'promotion-piece';
        pieceElement.onclick = () => {
            modal.style.display = 'none';
            callback(pieceInfo.type);
        };
        
        pieceElement.innerHTML = `
            <img src="assets/pieces/${color}-${pieceInfo.type}.svg" alt="${color} ${pieceInfo.name}">
            <div class="promotion-piece-name">${pieceInfo.name}</div>
            <div class="promotion-piece-value">${pieceInfo.value}</div>
        `;
        
        piecesContainer.appendChild(pieceElement);
    });
    
    // Show modal
    modal.style.display = 'flex';
    
    // Add keyboard support
    const handleKeyPress = (e) => {
        const keyMap = { '1': 'queen', '2': 'rook', '3': 'bishop', '4': 'knight' };
        if (keyMap[e.key]) {
            modal.style.display = 'none';
            document.removeEventListener('keydown', handleKeyPress);
            callback(keyMap[e.key]);
        } else if (e.key === 'Escape') {
            modal.style.display = 'none';
            document.removeEventListener('keydown', handleKeyPress);
            callback('queen'); // Default to queen
        }
    };
    
    document.addEventListener('keydown', handleKeyPress);
};

