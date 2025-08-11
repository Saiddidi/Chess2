# Contributing to ChessZero Web

Thank you for your interest in contributing to ChessZero Web! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome 70+, Firefox 65+, Safari 12+)
- Basic knowledge of HTML, CSS, and JavaScript
- Familiarity with Git and GitHub
- (Optional) Local web server for development

### Development Setup
1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/ChessZeroWeb.git
   cd ChessZeroWeb
   ```
3. Create a new branch for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. Start a local web server:
   ```bash
   python -m http.server 8000
   # or
   npx serve .
   ```
5. Open `http://localhost:8000` in your browser

## 📋 How to Contribute

### Bug Reports
Before submitting a bug report:
- Check if the issue already exists in [GitHub Issues](https://github.com/your-username/ChessZeroWeb/issues)
- Test in multiple browsers if possible
- Clear browser cache and try again

When submitting a bug report, include:
- **Browser and version** (e.g., Chrome 91.0.4472.124)
- **Operating system** (e.g., Windows 10, macOS 11.4, Ubuntu 20.04)
- **Steps to reproduce** the issue
- **Expected behavior** vs **actual behavior**
- **Screenshots** if applicable
- **Console errors** (open Developer Tools → Console)

### Feature Requests
When suggesting new features:
- Check existing issues and discussions first
- Clearly describe the feature and its benefits
- Consider the implementation complexity
- Provide mockups or examples if helpful
- Discuss how it fits with the project's goals

### Code Contributions

#### Areas for Contribution
- **Chess Engine**: Move generation, evaluation functions, endgame logic
- **AI Improvements**: MCTS optimizations, neural network architecture
- **UI/UX**: Interface improvements, mobile responsiveness, accessibility
- **Performance**: Optimization, memory management, loading times
- **Documentation**: Code comments, tutorials, examples
- **Testing**: Unit tests, integration tests, browser compatibility

#### Coding Standards
- Use **ES6+** JavaScript features
- Follow **camelCase** naming convention
- Add **JSDoc comments** for functions and classes
- Keep functions **small and focused**
- Use **meaningful variable names**
- Maintain **consistent indentation** (2 spaces)

#### Code Style Example
```javascript
/**
 * Evaluates a chess position using material balance
 * @param {ChessGame} gameState - Current game state
 * @param {string} player - Player color ('white' or 'black')
 * @returns {number} Evaluation score between 0 and 1
 */
function evaluateMaterial(gameState, player) {
  const pieceValues = {
    pawn: 1,
    knight: 3,
    bishop: 3,
    rook: 5,
    queen: 9,
    king: 0
  };
  
  let playerMaterial = 0;
  let opponentMaterial = 0;
  
  // Calculate material for both sides
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
  return totalMaterial === 0 ? 0.5 : playerMaterial / totalMaterial;
}
```

#### Pull Request Process
1. **Create a feature branch** from `main`
2. **Make your changes** following the coding standards
3. **Test thoroughly** across different browsers
4. **Update documentation** if needed
5. **Commit with clear messages**:
   ```bash
   git commit -m "Add: Implement en passant capture validation"
   git commit -m "Fix: Resolve castling rights bug after rook capture"
   git commit -m "Improve: Optimize MCTS node selection performance"
   ```
6. **Push to your fork** and create a pull request
7. **Respond to feedback** and make requested changes

#### Pull Request Template
```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Performance improvement
- [ ] Documentation update
- [ ] Code refactoring

## Testing
- [ ] Tested in Chrome
- [ ] Tested in Firefox
- [ ] Tested in Safari
- [ ] Tested on mobile
- [ ] Added/updated tests

## Screenshots
If applicable, add screenshots showing the changes.

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors
```

## 🧪 Testing Guidelines

### Manual Testing
Before submitting changes, test:
- **Basic gameplay**: Move pieces, capture, special moves
- **AI functionality**: AI moves, training, different difficulty levels
- **UI responsiveness**: Different screen sizes, mobile devices
- **Browser compatibility**: Chrome, Firefox, Safari
- **Error handling**: Invalid moves, network issues, storage limits

### Browser Testing
Test in multiple browsers:
- **Chrome** (latest 2 versions)
- **Firefox** (latest 2 versions)
- **Safari** (latest 2 versions)
- **Edge** (latest version)
- **Mobile browsers** (iOS Safari, Chrome Mobile)

### Performance Testing
Check for:
- **Memory leaks**: Long gameplay sessions
- **CPU usage**: AI thinking time
- **Storage usage**: Game history accumulation
- **Loading times**: Initial page load, model loading

## 🎯 Specific Contribution Areas

### Chess Engine Improvements
- **Move Generation**: Optimize legal move calculation
- **Position Evaluation**: Improve static evaluation functions
- **Special Rules**: Perfect implementation of chess rules
- **Endgame Logic**: Tablebase integration, endgame evaluation

### AI Enhancements
- **MCTS Optimization**: Better node selection, pruning strategies
- **Neural Network**: Architecture improvements, training efficiency
- **Opening Book**: Integration of opening move database
- **Time Management**: Better time allocation for different game phases

### User Interface
- **Accessibility**: Screen reader support, keyboard navigation
- **Mobile Experience**: Touch gestures, responsive design
- **Themes**: Different board and piece styles
- **Animations**: Smooth piece movements, visual feedback

### Documentation
- **Code Documentation**: JSDoc comments, inline explanations
- **User Guides**: Tutorials, strategy tips, feature explanations
- **Developer Docs**: Architecture overview, API documentation
- **Examples**: Code samples, integration examples

## 🔧 Development Tools

### Recommended Extensions (VS Code)
- **Live Server**: Real-time preview
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **JavaScript (ES6) code snippets**: Productivity boost

### Debugging Tools
- **Browser DevTools**: Console, Network, Performance tabs
- **TensorFlow.js Debugger**: Model inspection, tensor visualization
- **Chess Position Analyzer**: Validate game states

### Useful Commands
```bash
# Start development server
python -m http.server 8000

# Check for JavaScript errors
# Open browser console and look for red errors

# Test AI performance
# In browser console:
console.log(window.aiEngine.getTrainingStats());
console.log(window.neuralNetwork.getModelInfo());
```

## 📚 Learning Resources

### Chess Programming
- [Chess Programming Wiki](https://www.chessprogramming.org/)
- [Bitboard Chess Engine in C](https://www.youtube.com/playlist?list=PLmN0neTso3Jxh8ZIylk74JpwfiWNI76Cs)
- [Chess Engine Programming](https://www.chessprogramming.org/Main_Page)

### Machine Learning
- [TensorFlow.js Documentation](https://www.tensorflow.org/js)
- [Deep Learning Specialization](https://www.coursera.org/specializations/deep-learning)
- [AlphaZero Paper](https://arxiv.org/abs/1712.01815)

### Web Development
- [MDN Web Docs](https://developer.mozilla.org/)
- [JavaScript.info](https://javascript.info/)
- [CSS-Tricks](https://css-tricks.com/)

## 🤝 Community Guidelines

### Code of Conduct
- Be respectful and inclusive
- Provide constructive feedback
- Help newcomers learn and contribute
- Focus on the project's goals
- Maintain a positive environment

### Communication
- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: General questions, ideas
- **Pull Request Comments**: Code-specific feedback
- **Email**: Private or sensitive matters

### Recognition
Contributors will be recognized in:
- **README.md**: Major contributors section
- **Release Notes**: Feature attribution
- **GitHub Contributors**: Automatic recognition

## 🚨 Security

### Reporting Security Issues
If you discover a security vulnerability:
1. **Do not** create a public issue
2. Email the maintainers directly
3. Provide detailed information about the vulnerability
4. Allow time for the issue to be addressed before disclosure

### Security Considerations
- **Input Validation**: Sanitize all user inputs
- **XSS Prevention**: Escape HTML content
- **Storage Security**: Protect sensitive data in localStorage
- **Dependency Security**: Keep TensorFlow.js updated

## 📝 License

By contributing to ChessZero Web, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to ChessZero Web! Your efforts help make this project better for everyone. 🎉

