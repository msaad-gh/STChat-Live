import React, { useState, useEffect, useCallback, useRef } from 'react';

const GRID_SIZE = 15;
const CELL_SIZE = 18;
const INITIAL_SPEED = 150;
const LOADING_DURATION = 30000;

const SnakeGame = () => {
    const [snake, setSnake] = useState([{ x: 7, y: 7 }]);
    const [food, setFood] = useState({ x: 10, y: 10 });
    const [direction, setDirection] = useState({ x: 1, y: 0 });
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loadProgress, setLoadProgress] = useState(0);
    const [showGame, setShowGame] = useState(false);
    const gameLoopRef = useRef(null);
    const directionRef = useRef(direction);

    useEffect(() => {
        const startTime = Date.now();
        const progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / LOADING_DURATION) * 100, 100);
            setLoadProgress(progress);
            
            if (progress >= 100) {
                clearInterval(progressInterval);
            }
        }, 100);

        return () => clearInterval(progressInterval);
    }, []);

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
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                case 's':
                    if (directionRef.current.y !== -1) {
                        directionRef.current = { x: 0, y: 1 };
                        setDirection({ x: 0, y: 1 });
                    }
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                case 'a':
                    if (directionRef.current.x !== 1) {
                        directionRef.current = { x: -1, y: 0 };
                        setDirection({ x: -1, y: 0 });
                    }
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                case 'd':
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
            overflow: 'auto',
            padding: '20px 16px',
            boxSizing: 'border-box'
        }}>
            <style>{`
                @keyframes slither {
                    0%, 100% { transform: translateX(0) rotate(0deg); }
                    25% { transform: translateX(-8px) rotate(-5deg); }
                    75% { transform: translateX(8px) rotate(5deg); }
                }
                @keyframes glow-pulse {
                    0%, 100% { filter: drop-shadow(0 0 20px rgba(34, 211, 238, 0.4)); }
                    50% { filter: drop-shadow(0 0 40px rgba(34, 211, 238, 0.8)); }
                }
                @keyframes shimmer {
                    0% { background-position: -100% 0; }
                    100% { background-position: 200% 0; }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulse-food {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
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
                zIndex: 1,
                animation: 'fadeIn 0.8s ease-out',
                width: '100%',
                maxWidth: '420px'
            }}>
                <div style={{
                    fontSize: '64px',
                    marginBottom: '16px',
                    animation: 'slither 2s ease-in-out infinite, glow-pulse 3s ease-in-out infinite',
                    filter: 'drop-shadow(0 0 20px rgba(34, 211, 238, 0.4))'
                }}>
                    🐍
                </div>

                <h1 style={{
                    fontSize: 'clamp(32px, 8vw, 48px)',
                    fontWeight: '700',
                    background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 50%, #0891b2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    marginBottom: '8px',
                    letterSpacing: '-0.02em',
                    animation: 'float 3s ease-in-out infinite'
                }}>
                    LOADING
                </h1>

                <p style={{
                    fontSize: '14px',
                    color: '#94a3b8',
                    marginBottom: '32px',
                    fontWeight: '500',
                    letterSpacing: '0.05em',
                    opacity: 0.8
                }}>
                    Preparing your experience...
                </p>

                <div style={{
                    width: '100%',
                    maxWidth: '320px',
                    height: '6px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    position: 'relative',
                    boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(34, 211, 238, 0.2)',
                    margin: '0 auto'
                }}>
                    <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        width: `${loadProgress}%`,
                        background: 'linear-gradient(90deg, #06b6d4 0%, #22d3ee 50%, #06b6d4 100%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 2s linear infinite',
                        borderRadius: '8px',
                        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 0 20px rgba(34, 211, 238, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                    }} />
                </div>

                <div style={{
                    marginTop: '16px',
                    fontSize: '13px',
                    color: '#64748b',
                    fontWeight: '600',
                    fontVariantNumeric: 'tabular-nums'
                }}>
                    {Math.round(loadProgress)}%
                </div>

                <p style={{
                    marginTop: '24px',
                    fontSize: '12px',
                    color: '#475569',
                    fontStyle: 'italic',
                    opacity: 0.6
                }}>
                    This may take up to 30 seconds
                </p>

                {!showGame && (
                    <button
                        onClick={() => setShowGame(true)}
                        style={{
                            marginTop: '32px',
                            padding: '12px 28px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#0f172a',
                            background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 4px 20px rgba(34, 211, 238, 0.4)',
                            letterSpacing: '0.02em',
                            animation: 'slideUp 0.6s ease-out 0.5s both'
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

                {showGame && (
                    <div style={{
                        marginTop: '32px',
                        background: 'rgba(15, 23, 42, 0.6)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '16px',
                        padding: '20px',
                        border: '1px solid rgba(34, 211, 238, 0.2)',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                        animation: 'slideUp 0.5s ease-out'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px',
                            flexWrap: 'wrap',
                            gap: '12px'
                        }}>
                            <div style={{
                                fontSize: '20px',
                                fontWeight: '700',
                                background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                letterSpacing: '-0.01em'
                            }}>
                                SNAKE
                            </div>
                            <div style={{
                                fontSize: '18px',
                                fontWeight: '700',
                                color: '#22d3ee',
                                background: 'rgba(34, 211, 238, 0.1)',
                                padding: '6px 16px',
                                borderRadius: '8px',
                                border: '1px solid rgba(34, 211, 238, 0.3)',
                                fontVariantNumeric: 'tabular-nums'
                            }}>
                                {score}
                            </div>
                        </div>

                        <div style={{
                            width: '100%',
                            maxWidth: '270px',
                            aspectRatio: '1',
                            display: 'grid',
                            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                            gap: '1px',
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '2px solid rgba(34, 211, 238, 0.3)',
                            borderRadius: '12px',
                            padding: '1px',
                            margin: '0 auto',
                            overflow: 'hidden',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 40px rgba(6, 182, 212, 0.08)'
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
                                    marginTop: '16px',
                                    width: '100%',
                                    padding: '12px 24px',
                                    fontSize: '15px',
                                    fontWeight: '700',
                                    color: '#0f172a',
                                    background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    boxShadow: '0 4px 16px rgba(34, 211, 238, 0.4)',
                                    letterSpacing: '0.03em'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 6px 24px rgba(34, 211, 238, 0.6)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = '0 4px 16px rgba(34, 211, 238, 0.4)';
                                }}
                            >
                                {gameOver ? '🔄 PLAY AGAIN' : '▶ START GAME'}
                            </button>
                        )}

                        <div style={{
                            marginTop: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <button 
                                onClick={() => handleTouch('up')}
                                style={{
                                    width: '52px',
                                    height: '52px',
                                    fontSize: '20px',
                                    background: 'rgba(34, 211, 238, 0.1)',
                                    border: '2px solid rgba(34, 211, 238, 0.3)',
                                    borderRadius: '10px',
                                    color: '#22d3ee',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    fontWeight: '700',
                                    touchAction: 'manipulation'
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
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {['left', 'down', 'right'].map((dir, idx) => (
                                    <button
                                        key={dir}
                                        onClick={() => handleTouch(dir)}
                                        style={{
                                            width: '52px',
                                            height: '52px',
                                            fontSize: '20px',
                                            background: 'rgba(34, 211, 238, 0.1)',
                                            border: '2px solid rgba(34, 211, 238, 0.3)',
                                            borderRadius: '10px',
                                            color: '#22d3ee',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            fontWeight: '700',
                                            touchAction: 'manipulation'
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
                            marginTop: '12px',
                            textAlign: 'center',
                            fontSize: '11px',
                            color: '#64748b',
                            fontWeight: '500'
                        }}>
                            Arrow keys or WASD
                        </p>
                    </div>
                )}
            </div>

            <div style={{
                position: 'absolute',
                bottom: '20px',
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
};

export default SnakeGame;
