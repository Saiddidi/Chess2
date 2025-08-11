// AI Engine (Mini AlphaZero) with MCTS
class MCTSNode {
    constructor(gameState, move = null, parent = null) {
        this.gameState = gameState; // ChessGame instance
        this.move = move; // Move that led to this state
        this.parent = parent;
        this.children = [];
        this.visits = 0;
        this.wins = 0;
        this.isExpanded = false;
        this.isTerminal = false;
        
        // Check if this is a terminal state
        this.isTerminal = gameState.gameState === 'checkmate' || 
                         gameState.gameState === 'stalemate' || 
                         gameState.gameState === 'draw';
    }
    
    // Upper Confidence Bound for Trees (UCT) formula
    getUCTValue(explorationParameter = Math.sqrt(2)) {
        if (this.visits === 0) {
            return Infinity;
        }
        
        const exploitation = this.wins / this.visits;
        const exploration = explorationParameter * Math.sqrt(Math.log(this.parent.visits) / this.visits);
        
        return exploitation + exploration;
    }
    
    // Select best child based on UCT
    selectBestChild() {
        return this.children.reduce((best, child) => {
            return child.getUCTValue() > best.getUCTValue() ? child : best;
        });
    }
    
    // Add a child node
    addChild(gameState, move) {
        const child = new MCTSNode(gameState, move, this);
        this.children.push(child);
        return child;
    }
    
    // Backpropagate the result
    backpropagate(result) {
        this.visits++;
        this.wins += result;
        
        if (this.parent) {
            // Flip result for opponent
            this.parent.backpropagate(1 - result);
        }
    }
    
    // Check if node is fully expanded
    isFullyExpanded() {
        if (this.isTerminal) return true;
        
        const validMoves = this.gameState.getAllValidMoves();
        return this.children.length === validMoves.length;
    }
}

class ChessAI {
    constructor(chessUI) {
        this.chessUI = chessUI; // Reference to the ChessUI instance
        this.maxSimulations = 1000; // Number of MCTS simulations
        this.maxDepth = 50; // Maximum simulation depth
        this.explorationParameter = Math.sqrt(2);
        this.neuralNetwork = null; // Will be set when neural network is available
        
        // Game history for learning
        this.gameHistory = this.loadGameHistory();
        
        // Training statistics
        this.trainingStats = {
            totalTrainingSessions: 0,
            lastTrainingTime: null
        };
        this.loadTrainingStats();
    }
    
    setNeuralNetwork(neuralNetwork) {
        this.neuralNetwork = neuralNetwork;
    }
    
    // Main MCTS search function
    async search(gameState, timeLimit = 5000) {
        const startTime = Date.now();
        const rootNode = new MCTSNode(this.cloneGameState(gameState));
        
        let simulations = 0;
        
        while (simulations < this.maxSimulations && (Date.now() - startTime) < timeLimit) {
            // Selection and Expansion
            const leafNode = this.selectAndExpand(rootNode);
            
            // Simulation (Rollout)
            const result = await this.simulate(leafNode);
            
            // Backpropagation
            leafNode.backpropagate(result);
            
            simulations++;
            
            // Yield control occasionally to prevent blocking
            if (simulations % 50 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }
        
        // Select best move based on visit count (most robust)
        const bestChild = rootNode.children.reduce((best, child) => {
            return child.visits > best.visits ? child : best;
        });
        
        return bestChild ? bestChild.move : null;
    }
    
    // Selection and Expansion phase
    selectAndExpand(node) {
        // Selection: traverse down the tree using UCT
        while (!node.isTerminal && node.isFullyExpanded()) {
            node = node.selectBestChild();
        }
        
        // Expansion: add a new child if not terminal
        if (!node.isTerminal && !node.isFullyExpanded()) {
            const validMoves = node.gameState.getAllValidMoves();
            const unexploredMoves = validMoves.filter(move => {
                return !node.children.some(child => 
                    child.move && 
                    child.move.from.row === move.from.row &&
                    child.move.from.col === move.from.col &&
                    child.move.to.row === move.to.row &&
                    child.move.to.col === move.to.col
                );
            });
            
            if (unexploredMoves.length > 0) {
                const randomMove = unexploredMoves[Math.floor(Math.random() * unexploredMoves.length)];
                const newGameState = this.cloneGameState(node.gameState);
                
                const success = newGameState.makeMove(
                    randomMove.from.row, randomMove.from.col,
                    randomMove.to.row, randomMove.to.col
                );
                
                if (success) {
                    node = node.addChild(newGameState, randomMove);
                }
            }
        }
        
        return node;
    }
    
    // Simulation (Rollout) phase
    async simulate(node) {
        const gameState = this.cloneGameState(node.gameState);
        let depth = 0;
        
        // If neural network is available, use it for evaluation
        if (this.neuralNetwork && node.visits === 0) {
            try {
                const evaluation = await this.evaluatePosition(gameState);
                return evaluation;
            } catch (error) {
                console.warn('Neural network evaluation failed, falling back to random simulation:', error);
            }
        }
        
        // Random simulation until terminal state or max depth
        while (gameState.gameState === 'playing' || gameState.gameState === 'check') {
            if (depth >= this.maxDepth) {
                break;
            }
            
            const validMoves = gameState.getAllValidMoves();
            if (validMoves.length === 0) {
                break;
            }
            
            // Use simple heuristics for move selection during simulation
            const move = this.selectSimulationMove(gameState, validMoves);
            
            const success = gameState.makeMove(
                move.from.row, move.from.col,
                move.to.row, move.to.col
            );
            
            if (!success) {
                break;
            }
            
            depth++;
        }
        
        // Evaluate final position
        return this.evaluateTerminalPosition(gameState, node.gameState.currentPlayer);
    }
    
    // Select move during simulation using simple heuristics
    selectSimulationMove(gameState, validMoves) {
        // Prioritize captures and checks
        const captures = validMoves.filter(move => {
            const targetPiece = gameState.board[move.to.row][move.to.col];
            return targetPiece !== null;
        });
        
        if (captures.length > 0 && Math.random() < 0.7) {
            return captures[Math.floor(Math.random() * captures.length)];
        }
        
        // Check for checks
        const checks = validMoves.filter(move => {
            const clonedState = this.cloneGameState(gameState);
            clonedState.makeMove(move.from.row, move.from.col, move.to.row, move.to.col);
            return clonedState.gameState === 'check';
        });
        
        if (checks.length > 0 && Math.random() < 0.5) {
            return checks[Math.floor(Math.random() * checks.length)];
        }
        
        // Random move
        return validMoves[Math.floor(Math.random() * validMoves.length)];
    }
    
    // Evaluate terminal position
    evaluateTerminalPosition(gameState, originalPlayer) {
        switch (gameState.gameState) {
            case 'checkmate':
                // If current player is in checkmate, they lost
                return gameState.currentPlayer === originalPlayer ? 0 : 1;
            case 'stalemate':
            case 'draw':
                return 0.5; // Draw
            default:
                // Game still ongoing, use simple material evaluation
                return this.evaluateMaterial(gameState, originalPlayer);
        }
    }
    
    // Simple material evaluation
    evaluateMaterial(gameState, player) {
        const pieceValues = {
            'pawn': 1,
            'knight': 3,
            'bishop': 3,
            'rook': 5,
            'queen': 9,
            'king': 0
        };
        
        let playerMaterial = 0;
        let opponentMaterial = 0;
        const opponent = player === 'white' ? 'black' : 'white';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameState.board[row][col];
                if (piece) {
                    const value = pieceValues[piece.type];
                    if (piece.color === player) {
                        playerMaterial += value;
                    } else {
                        opponentMaterial += value;
                    }
                }
            }
        }
        
        const totalMaterial = playerMaterial + opponentMaterial;
        if (totalMaterial === 0) return 0.5;
        
        return playerMaterial / totalMaterial;
    }
    
    // Evaluate position using neural network (if available)
    async evaluatePosition(gameState) {
        if (!this.neuralNetwork) {
            throw new Error('Neural network not available');
        }
        
        try {
            const boardTensor = this.gameStateToTensor(gameState);
            const prediction = await this.neuralNetwork.predict(boardTensor);
            const value = await prediction.data();
            
            // Clean up tensors
            boardTensor.dispose();
            prediction.dispose();
            
            return value[0]; // Assuming single output value
        } catch (error) {
            throw new Error('Neural network evaluation failed: ' + error.message);
        }
    }
    
    // Convert game state to tensor for neural network
    gameStateToTensor(gameState) {
        // Create 8x8x12 tensor (12 channels for 6 piece types x 2 colors)
        const tensor = tf.zeros([1, 8, 8, 12]);
        const data = new Float32Array(8 * 8 * 12);
        
        const pieceToChannel = {
            'white': {
                'pawn': 0, 'rook': 1, 'knight': 2,
                'bishop': 3, 'queen': 4, 'king': 5
            },
            'black': {
                'pawn': 6, 'rook': 7, 'knight': 8,
                'bishop': 9, 'queen': 10, 'king': 11
            }
        };
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameState.board[row][col];
                if (piece) {
                    const channel = pieceToChannel[piece.color][piece.type];
                    const index = row * 8 * 12 + col * 12 + channel;
                    data[index] = 1.0;
                }
            }
        }
        
        return tf.tensor4d(data, [1, 8, 8, 12]);
    }
    
    // Clone game state for simulation
    cloneGameState(gameState) {
        const cloned = new ChessGame();
        
        // Deep clone the board
        cloned.board = gameState.board.map(row => 
            row.map(piece => piece ? { ...piece } : null)
        );
        
        cloned.currentPlayer = gameState.currentPlayer;
        cloned.gameState = gameState.gameState;
        cloned.capturedPieces = {
            white: [...gameState.capturedPieces.white],
            black: [...gameState.capturedPieces.black]
        };
        cloned.castlingRights = {
            white: { ...gameState.castlingRights.white },
            black: { ...gameState.castlingRights.black }
        };
        cloned.enPassantTarget = gameState.enPassantTarget;
        cloned.fiftyMoveRule = gameState.fiftyMoveRule;
        cloned.moveHistory = [...gameState.moveHistory];
        cloned.threefoldRepetition = { ...gameState.threefoldRepetition };
        
        return cloned;
    }
    
    // Get best move using MCTS
    async getBestMove(gameState) {
        try {
            const move = await this.search(gameState);
            return move;
        } catch (error) {
            console.error('MCTS search failed:', error);
            // Fallback to random move
            const validMoves = gameState.getAllValidMoves();
            return validMoves.length > 0 ? validMoves[Math.floor(Math.random() * validMoves.length)] : null;
        }
    }
    
    // Store game for learning
    storeGame(gameHistory, result) {
        const gameData = {
            moves: gameHistory.map(state => ({
                fen: state.toFEN(),
                move: state.lastMove
            })),
            result: result, // 1 for white win, 0 for black win, 0.5 for draw
            timestamp: Date.now()
        };
        
        this.gameHistory.push(gameData);
        this.saveGameHistory();
    }
    
    // Load game history from localStorage
    loadGameHistory() {
        try {
            const stored = localStorage.getItem('chessZeroGameHistory');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load game history:', error);
            return [];
        }
    }
    
    // Save game history to localStorage
    saveGameHistory() {
        try {
            // Keep only last 100 games to prevent storage overflow
            const recentGames = this.gameHistory.slice(-100);
            localStorage.setItem('chessZeroGameHistory', JSON.stringify(recentGames));
            this.gameHistory = recentGames;
        } catch (error) {
            console.error('Failed to save game history:', error);
        }
    }
    
    // Train from stored game history with automated triggers
    async trainFromHistory() {
        if (!this.neuralNetwork) {
            throw new Error('Neural network not initialized');
        }
        
        if (this.gameHistory.length < 1) {
            throw new Error(`Need at least 1 game for training. Currently have ${this.gameHistory.length} games.`);
        }
        
        console.log(`Training on ${this.gameHistory.length} games...`);
        
        // Prepare training data
        const trainingData = this.prepareTrainingData();
        
        if (trainingData.inputs.length === 0) {
            throw new Error('No valid training data found');
        }
        
        // Train the neural network
        await this.neuralNetwork.trainOnBatch(trainingData.inputs, trainingData.targets);
        
        // Update training statistics
        this.trainingStats.lastTrainingTime = Date.now();
        this.trainingStats.totalTrainingSessions++;
        this.saveTrainingStats();
        
        console.log('Training completed successfully');
    }
    
    // Prepare training data from game history
    prepareTrainingData() {
        const inputs = [];
        const targets = [];
        
        for (const game of this.gameHistory) {
            // Create a simple training example from the game result
            // For now, we'll use a simplified approach
            const gameResult = game.result;
            
            // Create a dummy input tensor (this should be improved to use actual positions)
            const dummyInput = tf.zeros([8, 8, 12]);
            const target = tf.scalar(gameResult);
            
            inputs.push(dummyInput);
            targets.push(target);
        }
        
        return { inputs, targets };
    }
    
    // Auto-training trigger (called after each game)
    async autoTrain() {
        if (this.gameHistory.length >= 1) {
            // Auto-train every 2 games after reaching minimum threshold
            try {
                this.chessUI.showAILearning(true, 'Auto-training triggered...');
                await this.trainFromHistory();
                this.chessUI.showAILearning(false); // Will show success and hide
                return true;
            } catch (error) {
                console.error('Auto-training failed:', error);
                this.chessUI.showAILearning(false); // Hide on error
                return false;
            }
        }
        return false;
    }
    
    // Enhanced store game method with auto-training
    storeGame(gameHistory, result) {
        const gameData = {
            moves: gameHistory.map(move => ({
                from: move.from,
                to: move.to,
                piece: move.piece,
                timestamp: move.timestamp
            })),
            result: result, // 1 for white win, 0 for black win, 0.5 for draw
            timestamp: Date.now(),
            moveCount: gameHistory.length
        };
        
        this.gameHistory.push(gameData);
        this.saveGameHistory();
        
        // Trigger auto-training if conditions are met
        setTimeout(() => {
            this.autoTrain().catch(error => {
                console.warn('Auto-training failed:', error);
            });
        }, 1000); // Small delay to avoid blocking UI
    }
    
    // Enhanced training statistics
    getTrainingStats() {
        return {
            gamesStored: this.gameHistory.length,
            totalTrainingSessions: this.trainingStats.totalTrainingSessions,
            lastTrainingTime: this.trainingStats.lastTrainingTime,
            averageGameLength: this.gameHistory.length > 0 ? 
                this.gameHistory.reduce((sum, game) => sum + game.moveCount, 0) / this.gameHistory.length : 0,
            winRate: this.calculateWinRate(),
            isAutoTrainingEnabled: true,
            hasNeuralNetwork: !!this.neuralNetwork
        };
    }
    
    calculateWinRate() {
        if (this.gameHistory.length === 0) return 0;
        
        const wins = this.gameHistory.filter(game => game.result === 1.0 || game.result === 0.0).length;
        return wins / this.gameHistory.length;
    }
    
    // Save training statistics
    saveTrainingStats() {
        try {
            localStorage.setItem('chessZeroTrainingStats', JSON.stringify(this.trainingStats));
        } catch (error) {
            console.error('Failed to save training stats:', error);
        }
    }
    
    // Load training statistics
    loadTrainingStats() {
        try {
            const stored = localStorage.getItem('chessZeroTrainingStats');
            if (stored) {
                this.trainingStats = { ...this.trainingStats, ...JSON.parse(stored) };
            }
        } catch (error) {
            console.error('Failed to load training stats:', error);
        }
    }
}


