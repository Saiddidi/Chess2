// Neural Network using TensorFlow.js
class ChessNeuralNetwork {
    constructor() {
        this.model = null;
        this.isTraining = false;
        this.trainingHistory = [];
        
        // Network architecture parameters
        this.inputShape = [8, 8, 12]; // 8x8 board with 12 channels (6 pieces x 2 colors)
        this.hiddenLayers = [256, 128, 64];
        this.learningRate = 0.001;
        
        this.initializeModel();
    }
    
    // Initialize the neural network model
    async initializeModel() {
        try {
            // Try to load existing model first
            await this.loadModel();
        } catch (error) {
            console.log('No existing model found, creating new one...');
            this.createModel();
        }
        
        // Set the neural network reference in AI engine
        if (window.aiEngine) {
            window.aiEngine.setNeuralNetwork(this);
        }
    }
    
    // Create a new neural network model
    createModel() {
        // Input layer - board representation
        const input = tf.input({ shape: this.inputShape });
        
        // Convolutional layers for spatial feature extraction
        let x = tf.layers.conv2d({
            filters: 32,
            kernelSize: 3,
            padding: 'same',
            activation: 'relu'
        }).apply(input);
        
        x = tf.layers.batchNormalization().apply(x);
        
        x = tf.layers.conv2d({
            filters: 64,
            kernelSize: 3,
            padding: 'same',
            activation: 'relu'
        }).apply(x);
        
        x = tf.layers.batchNormalization().apply(x);
        
        x = tf.layers.conv2d({
            filters: 128,
            kernelSize: 3,
            padding: 'same',
            activation: 'relu'
        }).apply(x);
        
        x = tf.layers.batchNormalization().apply(x);
        
        // Global average pooling to reduce spatial dimensions
        x = tf.layers.globalAveragePooling2d().apply(x);
        
        // Dense layers
        x = tf.layers.dense({
            units: this.hiddenLayers[0],
            activation: 'relu'
        }).apply(x);
        
        x = tf.layers.dropout({ rate: 0.3 }).apply(x);
        
        x = tf.layers.dense({
            units: this.hiddenLayers[1],
            activation: 'relu'
        }).apply(x);
        
        x = tf.layers.dropout({ rate: 0.3 }).apply(x);
        
        x = tf.layers.dense({
            units: this.hiddenLayers[2],
            activation: 'relu'
        }).apply(x);
        
        // Output heads
        // Value head - position evaluation (-1 to 1)
        const valueHead = tf.layers.dense({
            units: 1,
            activation: 'tanh',
            name: 'value_head'
        }).apply(x);
        
        // Policy head - move probabilities (simplified to single value for now)
        const policyHead = tf.layers.dense({
            units: 4096, // 64*64 possible moves (from-to combinations)
            activation: 'softmax',
            name: 'policy_head'
        }).apply(x);
        
        // Create the model
        this.model = tf.model({
            inputs: input,
            outputs: [valueHead, policyHead]
        });
        
        // Compile the model
        this.model.compile({
            optimizer: tf.train.adam(this.learningRate),
            loss: {
                'value_head': 'meanSquaredError',
                'policy_head': 'categoricalCrossentropy'
            },
            metrics: ['accuracy']
        });
        
        console.log('Neural network model created successfully');
        this.model.summary();
    }
    
    // Predict position value and move probabilities
    async predict(boardTensor) {
        if (!this.model) {
            throw new Error('Model not initialized');
        }
        
        try {
            const predictions = await this.model.predict(boardTensor);
            
            // Extract value and policy predictions
            const value = predictions[0];
            const policy = predictions[1];
            
            return { value, policy };
        } catch (error) {
            throw new Error('Prediction failed: ' + error.message);
        }
    }
    
    // Train the model on a batch of data
    async trainOnBatch(inputs, targets) {
        if (!this.model) {
            throw new Error('Model not initialized');
        }
        
        if (this.isTraining) {
            throw new Error('Model is already training');
        }
        
        this.isTraining = true;
        
        try {
            // Prepare training data
            const inputTensor = tf.stack(inputs);
            const valueTensor = tf.stack(targets);
            
            // Create dummy policy targets (uniform distribution for now)
            const policyTensor = tf.ones([inputs.length, 4096]).div(4096);
            
            // Train the model
            const history = await this.model.fit(inputTensor, {
                'value_head': valueTensor,
                'policy_head': policyTensor
            }, {
                epochs: 10,
                batchSize: 32,
                validationSplit: 0.2,
                verbose: 1
            });
            
            // Store training history
            this.trainingHistory.push({
                timestamp: Date.now(),
                loss: history.history.loss,
                accuracy: history.history.acc,
                valLoss: history.history.val_loss,
                valAccuracy: history.history.val_acc
            });
            
            // Clean up tensors
            inputTensor.dispose();
            valueTensor.dispose();
            policyTensor.dispose();
            
            // Save the updated model
            await this.saveModel();
            
            console.log('Training completed successfully');
            
        } catch (error) {
            throw new Error('Training failed: ' + error.message);
        } finally {
            this.isTraining = false;
        }
    }
    
    // Evaluate a single position
    async evaluatePosition(gameState) {
        const boardTensor = this.gameStateToTensor(gameState);
        
        try {
            const predictions = await this.predict(boardTensor);
            const value = await predictions.value.data();
            
            // Clean up tensors
            boardTensor.dispose();
            predictions.value.dispose();
            predictions.policy.dispose();
            
            return value[0];
        } catch (error) {
            boardTensor.dispose();
            throw error;
        }
    }
    
    // Convert game state to tensor representation
    gameStateToTensor(gameState) {
        const data = new Float32Array(8 * 8 * 12);
        
        // Piece type to channel mapping
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
        
        // Fill the tensor with piece positions
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
    
    // Save model to browser storage
    async saveModel() {
        if (!this.model) {
            throw new Error('No model to save');
        }
        
        try {
            await this.model.save('localstorage://chess-zero-model');
            console.log('Model saved successfully');
        } catch (error) {
            console.error('Failed to save model:', error);
            throw error;
        }
    }
    
    // Load model from browser storage
    async loadModel() {
        try {
            this.model = await tf.loadLayersModel('localstorage://chess-zero-model');
            
            // Recompile the model
            this.model.compile({
                optimizer: tf.train.adam(this.learningRate),
                loss: {
                    'value_head': 'meanSquaredError',
                    'policy_head': 'categoricalCrossentropy'
                },
                metrics: ['accuracy']
            });
            
            console.log('Model loaded successfully');
        } catch (error) {
            console.error('Failed to load model:', error);
            throw error;
        }
    }
    
    // Get model information
    getModelInfo() {
        if (!this.model) {
            return { status: 'not_initialized' };
        }
        
        return {
            status: 'ready',
            totalParams: this.model.countParams(),
            inputShape: this.inputShape,
            hiddenLayers: this.hiddenLayers,
            learningRate: this.learningRate,
            trainingHistory: this.trainingHistory.length,
            isTraining: this.isTraining
        };
    }
    
    // Reset the model (create new one)
    resetModel() {
        if (this.model) {
            this.model.dispose();
        }
        
        this.trainingHistory = [];
        this.createModel();
        console.log('Model reset successfully');
    }
    
    // Get training statistics
    getTrainingStats() {
        if (this.trainingHistory.length === 0) {
            return { message: 'No training history available' };
        }
        
        const latest = this.trainingHistory[this.trainingHistory.length - 1];
        const totalSessions = this.trainingHistory.length;
        
        return {
            totalTrainingSessions: totalSessions,
            latestLoss: latest.loss[latest.loss.length - 1],
            latestAccuracy: latest.accuracy[latest.accuracy.length - 1],
            latestValidationLoss: latest.valLoss[latest.valLoss.length - 1],
            latestValidationAccuracy: latest.valAccuracy[latest.valAccuracy.length - 1],
            lastTrainingTime: new Date(latest.timestamp).toLocaleString()
        };
    }
    
    // Perform self-play training
    async selfPlayTraining(numGames = 5) {
        if (this.isTraining) {
            throw new Error('Model is already training');
        }
        
        console.log(`Starting self-play training with ${numGames} games...`);
        
        const trainingData = [];
        
        for (let gameNum = 0; gameNum < numGames; gameNum++) {
            console.log(`Playing self-play game ${gameNum + 1}/${numGames}`);
            
            const gameData = await this.playSelfPlayGame();
            trainingData.push(...gameData);
            
            // Yield control to prevent blocking
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (trainingData.length > 0) {
            console.log(`Training on ${trainingData.length} positions...`);
            
            const inputs = trainingData.map(data => data.input);
            const targets = trainingData.map(data => tf.scalar(data.target));
            
            await this.trainOnBatch(inputs, targets);
            
            // Clean up
            targets.forEach(tensor => tensor.dispose());
        }
        
        console.log('Self-play training completed');
    }
    
    // Play a single self-play game
    async playSelfPlayGame() {
        const game = new ChessGame();
        const gameData = [];
        const positions = [];
        
        while (game.gameState === 'playing' || game.gameState === 'check') {
            // Store current position
            const boardTensor = this.gameStateToTensor(game);
            positions.push({
                tensor: boardTensor,
                player: game.currentPlayer
            });
            
            // Get AI move using MCTS (with reduced simulations for speed)
            const originalSimulations = window.aiEngine.maxSimulations;
            window.aiEngine.maxSimulations = 100; // Reduce for faster self-play
            
            const move = await window.aiEngine.getBestMove(game);
            
            window.aiEngine.maxSimulations = originalSimulations; // Restore
            
            if (!move) break;
            
            // Make the move
            const success = game.makeMove(
                move.from.row, move.from.col,
                move.to.row, move.to.col
            );
            
            if (!success) break;
            
            // Limit game length
            if (game.moveHistory.length > 200) {
                break;
            }
        }
        
        // Determine game result
        let result = 0.5; // Draw by default
        if (game.gameState === 'checkmate') {
            result = game.currentPlayer === 'white' ? 0 : 1; // Winner gets 1
        }
        
        // Create training data from positions
        positions.forEach(pos => {
            let target = result;
            if (pos.player === 'black') {
                target = 1 - target; // Flip for black
            }
            
            gameData.push({
                input: pos.tensor,
                target: target
            });
        });
        
        return gameData;
    }
    
    // Export model for download
    async exportModel() {
        if (!this.model) {
            throw new Error('No model to export');
        }
        
        try {
            const saveResult = await this.model.save('downloads://chess-zero-model');
            console.log('Model exported successfully');
            return saveResult;
        } catch (error) {
            console.error('Failed to export model:', error);
            throw error;
        }
    }
    
    // Import model from file
    async importModel(files) {
        try {
            this.model = await tf.loadLayersModel(tf.io.browserFiles(files));
            
            // Recompile the model
            this.model.compile({
                optimizer: tf.train.adam(this.learningRate),
                loss: {
                    'value_head': 'meanSquaredError',
                    'policy_head': 'categoricalCrossentropy'
                },
                metrics: ['accuracy']
            });
            
            console.log('Model imported successfully');
            
            // Update AI engine reference
            if (window.aiEngine) {
                window.aiEngine.setNeuralNetwork(this);
            }
            
        } catch (error) {
            console.error('Failed to import model:', error);
            throw error;
        }
    }
}

// Initialize neural network when page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        window.neuralNetwork = new ChessNeuralNetwork();
        console.log('Neural network initialized');
    } catch (error) {
        console.error('Failed to initialize neural network:', error);
    }
});


