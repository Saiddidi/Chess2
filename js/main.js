// ChessZero Web - Main UI Logic
class ChessUI {
    constructor() {
        this.game = new ChessGame();
        this.selectedSquare = null;
        this.validMoves = [];
        this.playerColor = 'white';
        this.isAIThinking = false;
        this.autoTraining = true; // Enable automatic training after each game
        
        this.initializeUI();
        this.renderBoard();
        this.updateGameStatus();
        this.setupEventListeners();
    }
    
    initializeUI() {
        const chessboard = document.getElementById('chessboard');
        chessboard.innerHTML = '';
        
        // Create board squares
        for (let row = 0; row < 8; row++) {
            const boardRow = document.createElement('div');
            boardRow.className = 'board-row';
            
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                
                square.addEventListener('click', (e) => this.handleSquareClick(row, col));
                
                boardRow.appendChild(square);
            }
            
            chessboard.appendChild(boardRow);
        }
    }
    
    setupEventListeners() {
        document.getElementById('newGameBtn').addEventListener('click', () => this.newGame());
        document.getElementById('undoMoveBtn').addEventListener('click', () => this.undoMove());
        document.getElementById('playerColor').addEventListener('change', (e) => this.changePlayerColor(e.target.value));
        document.getElementById('aiTrainBtn').addEventListener('click', () => this.trainAI());
    }
    
    renderBoard() {
        const squares = document.querySelectorAll('.square');
        
        squares.forEach(square => {
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            const piece = this.game.board[row][col];
            
            // Clear square
            square.innerHTML = '';
            square.classList.remove('selected', 'valid-move', 'in-check');
            
            // Add piece if present
            if (piece) {
                const pieceImg = document.createElement('img');
                pieceImg.src = `assets/pieces/${piece.color}-${piece.type}.svg`;
                pieceImg.alt = `${piece.color} ${piece.type}`;
                pieceImg.className = 'piece';
                square.appendChild(pieceImg);
            }
            
            // Highlight selected square
            if (this.selectedSquare && this.selectedSquare.row === row && this.selectedSquare.col === col) {
                square.classList.add('selected');
            }
            
            // Highlight valid moves
            if (this.validMoves.some(move => move.row === row && move.col === col)) {
                square.classList.add('valid-move');
            }
            
            // Highlight check
            if (piece && piece.type === 'king' && this.game.isInCheck(piece.color)) {
                square.classList.add('in-check');
            }
        });
        
        this.updateCapturedPieces();
    }
    
    updateCapturedPieces() {
        const capturedWhite = document.getElementById('capturedWhite');
        const capturedBlack = document.getElementById('capturedBlack');
        
        capturedWhite.innerHTML = '';
        capturedBlack.innerHTML = '';
        
        this.game.capturedPieces.white.forEach(piece => {
            const pieceImg = document.createElement('img');
            pieceImg.src = `assets/pieces/white-${piece.type}.svg`;
            pieceImg.alt = `white ${piece.type}`;
            pieceImg.className = 'captured-piece';
            capturedWhite.appendChild(pieceImg);
        });
        
        this.game.capturedPieces.black.forEach(piece => {
            const pieceImg = document.createElement('img');
            pieceImg.src = `assets/pieces/black-${piece.type}.svg`;
            pieceImg.alt = `black ${piece.type}`;
            pieceImg.className = 'captured-piece';
            capturedBlack.appendChild(pieceImg);
        });
    }
    
    handleSquareClick(row, col) {
        if (this.isAIThinking) return;
        
        const piece = this.game.board[row][col];
        
        // If clicking on a valid move square
        if (this.validMoves.some(move => move.row === row && move.col === col)) {
            this.makeMove(this.selectedSquare.row, this.selectedSquare.col, row, col);
            return;
        }
        
        // If clicking on own piece
        if (piece && piece.color === this.playerColor && this.game.currentPlayer === this.playerColor) {
            this.selectedSquare = { row, col };
            this.validMoves = this.getValidMovesForSquare(row, col);
            this.renderBoard();
        } else {
            this.selectedSquare = null;
            this.validMoves = [];
            this.renderBoard();
        }
    }
    
    getValidMovesForSquare(row, col) {
        const validMoves = [];
        
        for (let toRow = 0; toRow < 8; toRow++) {
            for (let toCol = 0; toCol < 8; toCol++) {
                if (this.game.isValidMove(row, col, toRow, toCol)) {
                    validMoves.push({ row: toRow, col: toCol });
                }
            }
        }
        
        return validMoves;
    }
    
    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.game.board[fromRow][fromCol];
        
        // Check for pawn promotion
        if (piece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
            // Handle promotion with modal
            this.game.showPromotionModal(piece.color, (selectedPiece) => {
                // Complete the move with promotion
                const success = this.game.makeMove(fromRow, fromCol, toRow, toCol, selectedPiece);
                if (success) {
                    this.selectedSquare = null;
                    this.validMoves = [];
                    this.renderBoard();
                    this.updateGameStatus();
                    
                    // Check if game ended
                    if (this.game.gameState === 'checkmate' || this.game.gameState === 'stalemate' || this.game.gameState === 'draw') {
                        this.handleGameEnd();
                    } else if (this.game.currentPlayer !== this.playerColor) {
                        setTimeout(() => this.makeAIMove(), 500);
                    }
                }
            });
        } else {
            // Regular move
            const success = this.game.makeMove(fromRow, fromCol, toRow, toCol);
            if (success) {
                this.selectedSquare = null;
                this.validMoves = [];
                this.renderBoard();
                this.updateGameStatus();
                
                // Check if game ended
                if (this.game.gameState === 'checkmate' || this.game.gameState === 'stalemate' || this.game.gameState === 'draw') {
                    this.handleGameEnd();
                } else if (this.game.currentPlayer !== this.playerColor) {
                    setTimeout(() => this.makeAIMove(), 500);
                }
            }
        }
    }
    
    async makeAIMove() {
        if (this.isAIThinking) return;
        
        this.isAIThinking = true;
        this.updateGameStatus('AI is thinking...');
        
        try {
            const move = await this.getAIMove();
            
            if (move) {
                const success = this.game.makeMove(move.from.row, move.from.col, move.to.row, move.to.col);
                if (success) {
                    this.renderBoard();
                    this.updateGameStatus();
                    
                    // Check if game ended
                    if (this.game.gameState === 'checkmate' || this.game.gameState === 'stalemate' || this.game.gameState === 'draw') {
                        this.handleGameEnd();
                    }
                }
            }
        } catch (error) {
            console.error('AI move error:', error);
            this.updateGameStatus('AI error occurred');
            setTimeout(() => this.updateGameStatus(), 2000);
        }
        
        this.isAIThinking = false;
    }
    
    async getAIMove() {
        // Use MCTS AI engine if available
        if (window.aiEngine) {
            try {
                const move = await window.aiEngine.getBestMove(this.game);
                return move;
            } catch (error) {
                console.error('AI engine error:', error);
            }
        }
        
        // Fallback to random move
        const validMoves = this.game.getAllValidMoves();
        if (validMoves.length === 0) return null;
        
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate thinking time
        return validMoves[Math.floor(Math.random() * validMoves.length)];
    }
    
    handleGameEnd() {
        if (this.autoTraining && this.game.moveHistory.length > 10) {
            // Automatically trigger training after game ends
            setTimeout(() => {
                this.storeGameForLearning();
                this.autoTrainAI();
            }, 2000);
        }
    }
    
    newGame() {
        // Store previous game result for learning
        if (this.game.moveHistory.length > 0) {
            this.storeGameForLearning();
        }
        
        this.game = new ChessGame();
        this.selectedSquare = null;
        this.validMoves = [];
        this.isAIThinking = false;
        
        this.renderBoard();
        this.updateGameStatus();
        
        // If player chose black, make AI move first
        if (this.playerColor === 'black') {
            setTimeout(() => this.makeAIMove(), 500);
        }
    }
    
    storeGameForLearning() {
        if (!window.aiEngine || this.game.moveHistory.length < 10) {
            return; // Don't store very short games
        }
        
        let result = 0.5; // Default to draw
        
        // Determine game result
        if (this.game.gameState === 'checkmate') {
            const winner = this.game.currentPlayer === 'white' ? 'black' : 'white';
            if (winner === 'white') {
                result = 1.0; // White wins
            } else {
                result = 0.0; // Black wins
            }
        }
        
        // Store the game for AI learning
        try {
            window.aiEngine.storeGame(this.game.moveHistory, result);
            console.log('Game stored for learning:', { 
                moves: this.game.moveHistory.length, 
                result: result 
            });
        } catch (error) {
            console.error('Failed to store game for learning:', error);
        }
    }
    
    undoMove() {
        if (this.isAIThinking) return;
        
        // Undo player move
        if (this.game.undoMove()) {
            // If it's now AI's turn, undo AI move too
            if (this.game.currentPlayer !== this.playerColor && this.game.moveHistory.length > 0) {
                this.game.undoMove();
            }
        }
        
        this.selectedSquare = null;
        this.validMoves = [];
        this.renderBoard();
        this.updateGameStatus();
    }
    
    changePlayerColor(color) {
        this.playerColor = color;
        this.newGame();
    }
    
    async autoTrainAI() {
        if (!window.aiEngine || !window.neuralNetwork) {
            return;
        }
        
        const stats = window.aiEngine.getTrainingStats();
        if (stats.gamesStored >= 3) { // Lower threshold for auto-training
            try {
                this.showTrainingProgress(true);
                await window.aiEngine.trainFromHistory();
                this.showTrainingProgress(false);
                console.log('Auto-training completed successfully');
            } catch (error) {
                console.error('Auto-training failed:', error);
                this.showTrainingProgress(false);
            }
        }
    }
    
    trainAI() {
        if (this.isAIThinking) {
            this.updateGameStatus('Cannot train while AI is thinking.');
            setTimeout(() => this.updateGameStatus(), 2000);
            return;
        }
        
        if (!window.aiEngine) {
            this.updateGameStatus('AI engine not available.');
            setTimeout(() => this.updateGameStatus(), 2000);
            return;
        }
        
        if (!window.neuralNetwork) {
            this.updateGameStatus('Neural network not available.');
            setTimeout(() => this.updateGameStatus(), 2000);
            return;
        }
        
        // Check if we have enough data for training
        const stats = window.aiEngine.getTrainingStats();
        if (stats.gamesStored < 5) {
            this.updateGameStatus(`Need at least 5 games for training. Currently have ${stats.gamesStored} games.`);
            setTimeout(() => this.updateGameStatus(), 3000);
            return;
        }
        
        this.showTrainingProgress(true);
        
        // Disable controls during training
        const controls = document.querySelectorAll('.controls button, .controls select');
        controls.forEach(control => control.disabled = true);
        
        // Start training
        window.aiEngine.trainFromHistory().then(() => {
            this.updateGameStatus('AI training completed successfully!');
            setTimeout(() => this.updateGameStatus(), 3000);
        }).catch(error => {
            console.error('Training error:', error);
            this.updateGameStatus('Training failed: ' + error.message);
            setTimeout(() => this.updateGameStatus(), 3000);
        }).finally(() => {
            // Re-enable controls
            controls.forEach(control => control.disabled = false);
            this.showTrainingProgress(false);
        });
    }
    
    showTrainingProgress(show) {
        const progressElement = document.getElementById('trainingProgress');
        if (show) {
            progressElement.style.display = 'block';
            // Animate progress bar
            const fillElement = document.getElementById('trainingFill');
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 10;
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(interval);
                }
                fillElement.style.width = progress + '%';
            }, 200);
        } else {
            progressElement.style.display = 'none';
        }
    }
    
    updateGameStatus(customMessage = null) {
        const statusElement = document.getElementById('gameStatus');
        
        if (customMessage) {
            statusElement.textContent = customMessage;
            statusElement.className = 'game-status';
            return;
        }
        
        let message = '';
        let className = 'game-status';
        
        if (this.isAIThinking) {
            message = 'AI is thinking...';
            statusElement.innerHTML = `
                <div class="ai-thinking">
                    <span>AI is thinking</span>
                    <div class="thinking-dots">
                        <div class="thinking-dot"></div>
                        <div class="thinking-dot"></div>
                        <div class="thinking-dot"></div>
                    </div>
                </div>
            `;
            return;
        }
        
        switch (this.game.gameState) {
            case 'checkmate':
                const winner = this.game.currentPlayer === 'white' ? 'Black' : 'White';
                message = `Checkmate! ${winner} wins!`;
                className += ' checkmate';
                break;
            case 'stalemate':
                message = 'Stalemate! Game is a draw.';
                className += ' stalemate';
                break;
            case 'draw':
                message = 'Game is a draw.';
                className += ' stalemate';
                break;
            case 'check':
                message = `${this.game.currentPlayer === 'white' ? 'White' : 'Black'} is in check!`;
                className += ' check';
                break;
            default:
                const currentPlayer = this.game.currentPlayer === 'white' ? 'White' : 'Black';
                const isPlayerTurn = this.game.currentPlayer === this.playerColor;
                message = `${currentPlayer} to move ${isPlayerTurn ? '(Your turn)' : '(AI turn)'}`;
        }
        
        statusElement.textContent = message;
        statusElement.className = className;
    }
}

// Initialize the game when page loads
let chessUI;
document.addEventListener('DOMContentLoaded', () => {
    chessUI = new ChessUI();
});

