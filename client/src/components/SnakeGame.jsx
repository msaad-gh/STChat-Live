import React, { useState, useEffect, useCallback, useRef } from 'react';

const GRID_SIZE = 15;
const CELL_SIZE = 18;
const INITIAL_SPEED = 150;

const SnakeGame = () => {
    const [snake, setSnake] = useState([{ x: 7, y: 7 }]);
    const [food, setFood] = useState({ x: 10, y: 10 });
    const [direction, setDirection] = useState({ x: 1, y: 0 });
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const gameLoopRef = useRef(null);
    const directionRef = useRef(direction);

    const generateFood = useCallback(() => {
        return {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
        };
    }, []);

    const resetGame = () => {
        setSnake([{ x: 7, y: 7 }]);
        setFood(generateFood());
        setDirection({ x: 1, y: 0 });
        directionRef.current = { x: 1, y: 0 };
        setGameOver(false);
        setScore(0);
        setIsPlaying(true);
    };

    const moveSnake = useCallback(() => {
        if (gameOver) return;

        setSnake(prevSnake => {
            const newHead = {
                x: (prevSnake[0].x + directionRef.current.x + GRID_SIZE) % GRID_SIZE,
                y: (prevSnake[0].y + directionRef.current.y + GRID_SIZE) % GRID_SIZE
            };

            if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
                setGameOver(true);
                setIsPlaying(false);
                return prevSnake;
            }

            const newSnake = [newHead, ...prevSnake];

            if (newHead.x === food.x && newHead.y === food.y) {
                setScore(s => s + 10);
                setFood(generateFood());
            } else {
                newSnake.pop();
            }

            return newSnake;
        });
    }, [food, gameOver, generateFood]);

    useEffect(() => {
        if (isPlaying && !gameOver) {
            gameLoopRef.current = setInterval(moveSnake, INITIAL_SPEED);
            return () => clearInterval(gameLoopRef.current);
        }
    }, [isPlaying, gameOver, moveSnake]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isPlaying) return;

            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                    if (directionRef.current.y !== 1) {
                        directionRef.current = { x: 0, y: -1 };
                        setDirection({ x: 0, y: -1 });
                    }
                    break;
                case 'ArrowDown':
                case 's':
                    if (directionRef.current.y !== -1) {
                        directionRef.current = { x: 0, y: 1 };
                        setDirection({ x: 0, y: 1 });
                    }
                    break;
                case 'ArrowLeft':
                case 'a':
                    if (directionRef.current.x !== 1) {
                        directionRef.current = { x: -1, y: 0 };
                        setDirection({ x: -1, y: 0 });
                    }
                    break;
                case 'ArrowRight':
                case 'd':
                    if (directionRef.current.x !== -1) {
                        directionRef.current = { x: 1, y: 0 };
                        setDirection({ x: 1, y: 0 });
                    }
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying]);

    const handleTouch = (dir) => {
        if (!isPlaying) return;
        if (dir === 'up' && directionRef.current.y !== 1) {
            directionRef.current = { x: 0, y: -1 };
        } else if (dir === 'down' && directionRef.current.y !== -1) {
            directionRef.current = { x: 0, y: 1 };
        } else if (dir === 'left' && directionRef.current.x !== 1) {
            directionRef.current = { x: -1, y: 0 };
        } else if (dir === 'right' && directionRef.current.x !== -1) {
            directionRef.current = { x: 1, y: 0 };
        }
    };

    return (
        <div className="snake-game" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            minHeight: '100vh',
            padding: '10px',
            boxSizing: 'border-box',
            maxWidth: '100vw',
            overflow: 'hidden'
        }}>
            <div className="snake-header" style={{ width: '100%', maxWidth: '400px' }}>
                <span className="snake-title">🐍 Snake</span>
                <span className="snake-score">Score: {score}</span>
            </div>

            <div
                className="snake-grid"
                style={{
                    width: Math.min(GRID_SIZE * CELL_SIZE, window.innerWidth - 40),
                    height: Math.min(GRID_SIZE * CELL_SIZE, window.innerWidth - 40),
                    gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
                    flexShrink: 0,
                    margin: '10px 0'
                }}
            >
                {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                    const x = i % GRID_SIZE;
                    const y = Math.floor(i / GRID_SIZE);
                    const isSnake = snake.some(s => s.x === x && s.y === y);
                    const isHead = snake[0]?.x === x && snake[0]?.y === y;
                    const isFood = food.x === x && food.y === y;

                    return (
                        <div
                            key={i}
                            className={`snake-cell ${isSnake ? 'snake-body' : ''} ${isHead ? 'snake-head' : ''} ${isFood ? 'snake-food' : ''}`}
                        />
                    );
                })}
            </div>

            {!isPlaying && (
                <button className="snake-start-btn" onClick={resetGame} style={{ margin: '10px 0' }}>
                    {gameOver ? '🔄 Play Again' : '▶ Start Game'}
                </button>
            )}

            <div className="snake-controls" style={{ 
                marginTop: '10px', 
                marginBottom: '10px',
                flexShrink: 0 
            }}>
                <button onClick={() => handleTouch('up')}>↑</button>
                <div className="snake-controls-row">
                    <button onClick={() => handleTouch('left')}>←</button>
                    <button onClick={() => handleTouch('down')}>↓</button>
                    <button onClick={() => handleTouch('right')}>→</button>
                </div>
            </div>

            <p className="snake-hint" style={{ 
                margin: '5px 0',
                flexShrink: 0 
            }}>Use arrow keys or WASD to play</p>
        </div>
    );
};

export default SnakeGame;