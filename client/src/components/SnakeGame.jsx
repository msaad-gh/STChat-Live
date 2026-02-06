import React, { useState, useEffect, useCallback, useRef } from 'react';

const GRID_SIZE = 15;
const INITIAL_SPEED = 150;

const SnakeGame = () => {
    const [snake, setSnake] = useState([{ x: 7, y: 7 }]);
    const [food, setFood] = useState({ x: 10, y: 10 });
    const [direction, setDirection] = useState({ x: 1, y: 0 });
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showPlayButton, setShowPlayButton] = useState(false);
    const [showGame, setShowGame] = useState(false);
    const gameLoopRef = useRef(null);
    const directionRef = useRef(direction);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowPlayButton(true);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const generateFood = useCallback(() => {
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE)
            };
        } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
        return newFood;
    }, [snake]);

    const resetGame = () => {
        const initialSnake = [{ x: 7, y: 7 }];
        setSnake(initialSnake);
        setFood({ x: 10, y: 10 });
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
                case 'W':
                    if (directionRef.current.y !== 1) {
                        directionRef.current = { x: 0, y: -1 };
                        setDirection({ x: 0, y: -1 });
                    }
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    if (directionRef.current.y !== -1) {
                        directionRef.current = { x: 0, y: 1 };
                        setDirection({ x: 0, y: 1 });
                    }
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    if (directionRef.current.x !== 1) {
                        directionRef.current = { x: -1, y: 0 };
                        setDirection({ x: -1, y: 0 });
                    }
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    if (directionRef.current.x !== -1) {
                        directionRef.current = { x: 1, y: 0 };
                        setDirection({ x: 1, y: 0 });
                    }
                    e.preventDefault();
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

    if (!showGame) {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1729 100%)',
                fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
                overflow: 'hidden'
            }}>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes float {
                        0%, 100% { transform: translateY(0px); }
                        50% { transform: translateY(-10px); }
                    }
                `}</style>

                <div style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.03,
                    backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34, 211, 238, 0.3) 2px, rgba(34, 211, 238, 0.3) 4px)`,
                    pointerEvents: 'none'
                }} />

                <div style={{
                    textAlign: 'center',
                    zIndex: 1
                }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        border: '4px solid rgba(34, 211, 238, 0.2)',
                        borderTop: '4px solid #22d3ee',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto',
                        boxShadow: '0 0 40px rgba(34, 211, 238, 0.3)'
                    }} />

                    {showPlayButton && (
                        <button
                            onClick={() => setShowGame(true)}
                            style={{
                                marginTop: '40px',
                                padding: '14px 32px',
                                fontSize: '16px',
                                fontWeight: '600',
                                color: '#0f172a',
                                background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 20px rgba(34, 211, 238, 0.4)',
                                letterSpacing: '0.02em',
                                animation: 'fadeIn 0.6s ease-out'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 8px 30px rgba(34, 211, 238, 0.6)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 4px 20px rgba(34, 211, 238, 0.4)';
                            }}
                        >
                            🎮 Play Snake While You Wait
                        </button>
                    )}
                </div>

                <div style={{
                    position: 'absolute',
                    bottom: '40px',
                    display: 'flex',
                    gap: '6px',
                    opacity: 0.3
                }}>
                    {[0, 1, 2].map(i => (
                        <div key={i} style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            background: '#22d3ee',
                            animation: `float 2s ease-in-out ${i * 0.3}s infinite`
                        }} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1729 100%)',
            fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
            overflow: 'hidden',
            padding: '16px',
            boxSizing: 'border-box'
        }}>
            <style>{`
                @keyframes pulse-food {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.15); }
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>

            <div style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.03,
                backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34, 211, 238, 0.3) 2px, rgba(34, 211, 238, 0.3) 4px)`,
                pointerEvents: 'none'
            }} />

            <div style={{
                width: '100%',
                maxWidth: '600px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                justifyContent: 'center',
                animation: 'slideIn 0.5s ease-out'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                    width: '100%',
                    maxWidth: '90vmin',
                    padding: '0 8px'
                }}>
                    <div style={{
                        fontSize: 'clamp(20px, 5vw, 28px)',
                        fontWeight: '700',
                        background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        letterSpacing: '-0.01em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span style={{ filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.6))' }}>🐍</span>
                        SNAKE
                    </div>
                    <div style={{
                        fontSize: 'clamp(18px, 4vw, 24px)',
                        fontWeight: '700',
                        color: '#22d3ee',
                        background: 'rgba(34, 211, 238, 0.1)',
                        padding: 'clamp(6px, 1.5vw, 8px) clamp(12px, 3vw, 20px)',
                        borderRadius: '10px',
                        border: '1px solid rgba(34, 211, 238, 0.3)',
                        fontVariantNumeric: 'tabular-nums',
                        minWidth: 'clamp(50px, 12vw, 70px)',
                        textAlign: 'center'
                    }}>
                        {score}
                    </div>
                </div>

                <div style={{
                    width: '90vmin',
                    height: '90vmin',
                    maxWidth: '500px',
                    maxHeight: '500px',
                    display: 'grid',
                    gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                    gap: '1px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '2px solid rgba(34, 211, 238, 0.3)',
                    borderRadius: '12px',
                    padding: '2px',
                    overflow: 'hidden',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), inset 0 0 60px rgba(6, 182, 212, 0.1)'
                }}>
                    {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                        const x = i % GRID_SIZE;
                        const y = Math.floor(i / GRID_SIZE);
                        const isSnake = snake.some(s => s.x === x && s.y === y);
                        const isHead = snake[0]?.x === x && snake[0]?.y === y;
                        const isFood = food.x === x && food.y === y;

                        return (
                            <div
                                key={i}
                                style={{
                                    background: isHead ? 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)' :
                                               isSnake ? 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)' :
                                               isFood ? 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' :
                                               'rgba(30, 41, 59, 0.3)',
                                    borderRadius: isSnake || isFood ? '2px' : '1px',
                                    transition: 'all 0.1s ease',
                                    boxShadow: isHead ? '0 0 12px rgba(34, 211, 238, 0.8)' :
                                               isSnake ? '0 0 6px rgba(8, 145, 178, 0.4)' :
                                               isFood ? '0 0 12px rgba(244, 63, 94, 0.8)' : 'none',
                                    animation: isFood ? 'pulse-food 1.5s infinite' : 'none'
                                }}
                            />
                        );
                    })}
                </div>

                {!isPlaying && (
                    <button 
                        onClick={resetGame}
                        style={{
                            marginTop: '20px',
                            width: '100%',
                            maxWidth: '90vmin',
                            padding: 'clamp(12px, 3vw, 16px) clamp(24px, 5vw, 32px)',
                            fontSize: 'clamp(14px, 3.5vw, 18px)',
                            fontWeight: '700',
                            color: '#0f172a',
                            background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 4px 20px rgba(34, 211, 238, 0.4)',
                            letterSpacing: '0.03em'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 6px 24px rgba(34, 211, 238, 0.6)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 4px 20px rgba(34, 211, 238, 0.4)';
                        }}
                    >
                        {gameOver ? '🔄 PLAY AGAIN' : '▶ START GAME'}
                    </button>
                )}

                <div style={{
                    marginTop: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'clamp(8px, 2vw, 12px)',
                    width: '100%',
                    maxWidth: '300px'
                }}>
                    <button 
                        onClick={() => handleTouch('up')}
                        style={{
                            width: 'clamp(48px, 12vw, 60px)',
                            height: 'clamp(48px, 12vw, 60px)',
                            fontSize: 'clamp(20px, 5vw, 24px)',
                            background: 'rgba(34, 211, 238, 0.1)',
                            border: '2px solid rgba(34, 211, 238, 0.3)',
                            borderRadius: '10px',
                            color: '#22d3ee',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontWeight: '700',
                            touchAction: 'manipulation',
                            WebkitTapHighlightColor: 'transparent'
                        }}
                        onMouseDown={(e) => {
                            e.target.style.background = 'rgba(34, 211, 238, 0.25)';
                            e.target.style.transform = 'scale(0.95)';
                        }}
                        onMouseUp={(e) => {
                            e.target.style.background = 'rgba(34, 211, 238, 0.1)';
                            e.target.style.transform = 'scale(1)';
                        }}
                        onTouchStart={(e) => {
                            e.currentTarget.style.background = 'rgba(34, 211, 238, 0.25)';
                            e.currentTarget.style.transform = 'scale(0.95)';
                        }}
                        onTouchEnd={(e) => {
                            e.currentTarget.style.background = 'rgba(34, 211, 238, 0.1)';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        ↑
                    </button>
                    <div style={{ 
                        display: 'flex', 
                        gap: 'clamp(8px, 2vw, 12px)',
                        justifyContent: 'center'
                    }}>
                        {['left', 'down', 'right'].map((dir, idx) => (
                            <button
                                key={dir}
                                onClick={() => handleTouch(dir)}
                                style={{
                                    width: 'clamp(48px, 12vw, 60px)',
                                    height: 'clamp(48px, 12vw, 60px)',
                                    fontSize: 'clamp(20px, 5vw, 24px)',
                                    background: 'rgba(34, 211, 238, 0.1)',
                                    border: '2px solid rgba(34, 211, 238, 0.3)',
                                    borderRadius: '10px',
                                    color: '#22d3ee',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    fontWeight: '700',
                                    touchAction: 'manipulation',
                                    WebkitTapHighlightColor: 'transparent'
                                }}
                                onMouseDown={(e) => {
                                    e.target.style.background = 'rgba(34, 211, 238, 0.25)';
                                    e.target.style.transform = 'scale(0.95)';
                                }}
                                onMouseUp={(e) => {
                                    e.target.style.background = 'rgba(34, 211, 238, 0.1)';
                                    e.target.style.transform = 'scale(1)';
                                }}
                                onTouchStart={(e) => {
                                    e.currentTarget.style.background = 'rgba(34, 211, 238, 0.25)';
                                    e.currentTarget.style.transform = 'scale(0.95)';
                                }}
                                onTouchEnd={(e) => {
                                    e.currentTarget.style.background = 'rgba(34, 211, 238, 0.1)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                {['←', '↓', '→'][idx]}
                            </button>
                        ))}
                    </div>
                </div>

                <p style={{
                    marginTop: '16px',
                    textAlign: 'center',
                    fontSize: 'clamp(11px, 2.5vw, 13px)',
                    color: '#64748b',
                    fontWeight: '500'
                }}>
                    Arrow keys or WASD
                </p>
            </div>
        </div>
    );
};

export default SnakeGame;
