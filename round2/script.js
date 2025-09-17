// WebDecryption Round 2 - Maze Robot Puzzle JavaScript
console.log('🤖 Maze Robot Puzzle Loaded!');
console.log('🎯 Goal: Navigate the robot to the flag using code!');
console.log('💡 Available commands: moveUp(), moveDown(), moveLeft(), moveRight()');
console.log('🔑 Don\'t forget to collect the key to open doors!');

// Maze configuration (7x7 grid)
// New layout: Player must go right to collect key, then down around to door, then flag
// Legend: S=start, K=key, D=door, F=flag, #=wall, .=open
const MAZE_SIZE = 7;
const ORIGINAL_MAZE = [
    ['#','#','#','#','#','#','#'],
    ['#','S','.','.','K','#','#'],
    ['#','#','#','.','#','#','#'],
    ['#','D','.','.','.','.','#'],
    ['#','.','#','#','#','.','#'],
    ['#','.','.','F','#','.','#'],
    ['#','#','#','#','#','#','#']
];
let maze = []; // will clone from ORIGINAL_MAZE each reset

// Game state
let robotPos = { x: 1, y: 1 }; // Starting position (S)
let hasKey = false;
let isRunning = false;
let moveCommands = [];
let moveCount = 0;
const MOVE_LIMIT = 100;

// DOM elements
const mazeGrid = document.getElementById('mazeGrid');
const codeInput = document.getElementById('codeInput');
const runBtn = document.getElementById('runBtn');
const resetBtn = document.getElementById('resetBtn');
const statusDiv = document.getElementById('statusDiv');

// Initialize maze display
function cloneMaze() {
    maze = ORIGINAL_MAZE.map(row => [...row]);
}

function renderCell(x,y) {
    const cellType = maze[y][x];
    const cell = document.getElementById(`cell-${x}-${y}`);
    cell.className = 'maze-cell';
    switch (cellType) {
        case '#': cell.classList.add('wall'); cell.textContent = '#'; break;
        case '.': cell.classList.add('open'); cell.textContent = '.'; break;
        case 'S': cell.classList.add('start'); cell.textContent = '🤖'; break;
        case 'F': cell.classList.add('flag'); cell.textContent = '🏁'; break;
        case 'K': cell.classList.add('key'); cell.textContent = '🔑'; break;
        case 'D': cell.classList.add('door'); cell.textContent = '🚪'; break;
    }
}

function initMaze() {
    mazeGrid.innerHTML='';
    for (let y=0; y<MAZE_SIZE; y++) {
        for (let x=0; x<MAZE_SIZE; x++) {
            const cell = document.createElement('div');
            cell.className = 'maze-cell';
            cell.id = `cell-${x}-${y}`;
            mazeGrid.appendChild(cell);
            renderCell(x,y);
        }
    }
    // place robot on start
    robotPos = {x:1, y:1};
    updateRobotPosition();
}

// Update robot position visually
function updateRobotPosition() {
    // Re-render all non-robot cells (to preserve symbols like flag, key, door)
    for (let y=0; y<MAZE_SIZE; y++) {
        for (let x=0; x<MAZE_SIZE; x++) {
            if (!(x===robotPos.x && y===robotPos.y)) renderCell(x,y);
        }
    }
    const current = document.getElementById(`cell-${robotPos.x}-${robotPos.y}`);
    current.classList.add('robot');
    current.textContent = '🤖';
}

// Check if move is valid
function isValidMove(x,y) {
  if (x<0||x>=MAZE_SIZE||y<0||y>=MAZE_SIZE) return false;
  const t = maze[y][x];
  if (t==='#') return false;
  if (t==='D' && !hasKey) return false;
  return true;
}

// Movement functions that players can use
function moveUp() {
    const newY = robotPos.y - 1;
    if (isValidMove(robotPos.x, newY)) {
        robotPos.y = newY;
        checkCellActions();
        return true;
    }
    return false;
}

function moveDown() {
    const newY = robotPos.y + 1;
    if (isValidMove(robotPos.x, newY)) {
        robotPos.y = newY;
        checkCellActions();
        return true;
    }
    return false;
}

function moveLeft() {
    const newX = robotPos.x - 1;
    if (isValidMove(newX, robotPos.y)) {
        robotPos.x = newX;
        checkCellActions();
        return true;
    }
    return false;
}

function moveRight() {
    const newX = robotPos.x + 1;
    if (isValidMove(newX, robotPos.y)) {
        robotPos.x = newX;
        checkCellActions();
        return true;
    }
    return false;
}

// Check for special cell actions (key, flag, etc.)
function checkCellActions() {
    const t = maze[robotPos.y][robotPos.x];
    if (t==='K') {
        hasKey = true;
        maze[robotPos.y][robotPos.x]='.';
        updateStatus('🔑 Key collected! Door can now be opened.', 'info');
        console.log('🔑 Key collected.');
    }
    if (t==='D' && hasKey) {
        // consume door -> becomes open
        maze[robotPos.y][robotPos.x]='.';
        updateStatus('🚪 Door opened!', 'info');
        console.log('🚪 Door opened.');
    }
    if (t==='F') {
        updateStatus('🎉 Flag captured! Flag: cbc{robot_maze_master_2024}', 'success');
        console.log('🏆 FLAG: cbc{robot_maze_master_2024}');
        runBtn.disabled=true;
        return true;
    }
    return false;
}

// Update status message display
function updateStatus(message, type = '') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
}

// Parse and execute user code safely
// Simple custom parser for allowed syntax: moveX(); loops for (...) { ... }
function tokenize(code) {
    return code.match(/moveUp\(\)|moveDown\(\)|moveLeft\(\)|moveRight\(\)|for|\{|\}|\(|\)|<|>|<=|>=|==|!=|&&|\|\||[0-9]+|let|i|;|\+\+|<|=|\+|\s+|./g) || [];
}

function buildCommands(code) {
    // Allow only: movement calls + for (let i = 0; i < N; i++) { ... } or single-line form
    const disallowed = /(?<![A-Za-z0-9_])(while|async|await|fetch|XMLHttpRequest|function|=>|class|import|export|new|window|document|eval)/;
    if (disallowed.test(code)) throw new Error('Disallowed syntax detected.');

    let expanded = code;
    // Normalize line endings
    expanded = expanded.replace(/\r\n?/g, '\n');

    // Expand brace for-loops iteratively (supports nesting depth in a simple way)
    const braceFor = /for\s*\(\s*let\s+i\s*=\s*0\s*;\s*i\s*<\s*(\d{1,2})\s*;\s*i\+\+\s*\)\s*\{([\s\S]*?)\}/m;
    let guard = 0;
    while (braceFor.test(expanded) && guard < 20) {
        expanded = expanded.replace(braceFor, (m, nStr, body) => {
            const n = parseInt(nStr,10);
            if (n > 20) throw new Error('Loop upper bound too large (max 20).');
            return Array.from({length:n}, () => body).join('\n');
        });
        guard++;
    }
    if (guard === 20) throw new Error('Loop expansion depth limit reached.');

    // Expand single-line for without braces: for (let i = 0; i < N; i++) moveRight();
    const singleLineFor = /for\s*\(\s*let\s+i\s*=\s*0\s*;\s*i\s*<\s*(\d{1,2})\s*;\s*i\+\+\s*\)\s*([^;\n\{]+);?/g;
    expanded = expanded.replace(singleLineFor, (m, nStr, stmt) => {
        const n = parseInt(nStr,10);
        if (n > 20) throw new Error('Loop upper bound too large (max 20).');
        return Array.from({length:n}, () => stmt.trim() + ';').join('\n');
    });

    // After expansion, reject any remaining 'for (' occurrences
    if (/for\s*\(/.test(expanded)) {
        throw new Error('Only basic for loops with i from 0 to N-1 are allowed.');
    }

    // Now translate movement calls into command pushes
    const commands = [];
    const processedCode = expanded
        .replace(/\/\/.*$/gm, '') // strip line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // strip block comments
        .replace(/moveUp\(\)\s*;?/g,   () => { commands.push('up');   return ''; })
        .replace(/moveDown\(\)\s*;?/g, () => { commands.push('down'); return ''; })
        .replace(/moveLeft\(\)\s*;?/g, () => { commands.push('left'); return ''; })
        .replace(/moveRight\(\)\s*;?/g,() => { commands.push('right');return ''; });

    return commands;
}

async function executeUserCode() {
    if (isRunning) return;
    isRunning = true;
    runBtn.disabled = true;
    moveCommands = [];
    moveCount = 0;
    const code = codeInput.value.trim();
    if (!code) {
        updateStatus('❌ Please write some movement commands!', 'error');
        isRunning=false; runBtn.disabled=false; return;
    }
    try {
        updateStatus('🤖 Parsing code...', 'info');
        moveCommands = buildCommands(code);
        if (moveCommands.length > MOVE_LIMIT) {
            throw new Error(`Too many moves (${moveCommands.length}). Limit is ${MOVE_LIMIT}.`);
        }
        // Debug visibility for player
        console.log('🧭 Parsed command sequence:', moveCommands.join(' -> ') || '[none]');
        if (moveCommands.length) {
            const first = moveCommands[0];
            // Predict outcome of first move to give clearer feedback
            let testX = robotPos.x;
            let testY = robotPos.y;
            if (first === 'up') testY--; else if (first === 'down') testY++; else if (first === 'left') testX--; else if (first === 'right') testX++;
            if (!isValidMove(testX, testY)) {
                console.log(`⚠️ Pre-run check: First move '${first}' is blocked (wall / door w/o key / boundary).`);
                console.log('💡 Tip: Use showMaze() to inspect the grid. Starting downward hits a wall beneath the start. Try moving right first.');
            }
        }
        updateStatus('🚀 Executing robot commands...', 'info');
        console.log(`📋 Executing ${moveCommands.length} moves`);
        for (let i=0; i<moveCommands.length; i++) {
            const c = moveCommands[i];
            let ok=false;
            switch(c){
                case 'up': ok=moveUp(); break;
                case 'down': ok=moveDown(); break;
                case 'left': ok=moveLeft(); break;
                case 'right': ok=moveRight(); break;
            }
            moveCount++;
            if(!ok){
                updateStatus(`❌ Invalid move '${c}' at step ${i+1}.`, 'error');
                console.log('Move blocked.');
                break;
            }
            updateRobotPosition();
            if (checkCellActions()) break;
            await new Promise(r=>setTimeout(r,400));
        }
        if (!runBtn.disabled) updateStatus('✅ Execution finished. Adjust code if needed.', 'info');
    } catch(err) {
        updateStatus(`❌ Code error: ${err.message}`,'error');
        console.error(err);
    }
    isRunning=false; runBtn.disabled=false;
}

// Reset maze to initial state
function resetMaze() {
    console.log('🔄 Resetting maze...');
    hasKey=false; isRunning=false; moveCommands=[]; moveCount=0;
    cloneMaze();
    initMaze();
    updateStatus('Maze reset! Ready for your next attempt.', '');
    runBtn.disabled=false;
}

// Event listeners - fixed to properly check if elements exist
if (runBtn) runBtn.addEventListener('click', executeUserCode);
if (resetBtn) resetBtn.addEventListener('click', resetMaze);

// Console helper functions for players
window.showMaze = function() {
    console.log('🗺️ Current maze layout:');
    for (let y = 0; y < MAZE_SIZE; y++) {
        console.log(maze[y].join(' '));
    }
};

window.showPosition = function() {
    console.log(`🤖 Robot position: (${robotPos.x}, ${robotPos.y})`);
    console.log(`🔑 Has key: ${hasKey ? 'Yes' : 'No'}`);
};

window.hint = function() {
    console.log('💡 MAZE SOLVING HINTS:');
    console.log('1. Start by moving right to collect the key');
    console.log('2. Navigate through the open paths');
    console.log('3. Use the key to open the door');
    console.log('4. Reach the flag to win!');
    console.log('5. Use loops to make your code shorter');
    console.log('');
    console.log('🎯 Try: showMaze() to see the layout');
    console.log('🤖 Try: showPosition() to see robot status');
};

// Initialize the maze on page load - fixed DOM ready check
document.addEventListener('DOMContentLoaded', function() {
    // Ensure all DOM elements exist before initializing
    if (mazeGrid && codeInput && runBtn && resetBtn && statusDiv) {
        cloneMaze();
        initMaze();
        updateStatus('Welcome! Collect the key, open the door, reach the flag. Write code and click Run.', '');
        console.log('\n🎮 Console commands: hint(), showMaze(), showPosition()');
    } else {
        console.error('Required DOM elements not found');
    }
});