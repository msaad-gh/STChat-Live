import React, { useState, useEffect, useCallback, useRef } from 'react';

const GRID_SIZE = 15;
const CELL_SIZE = 18;
const INITIAL_SPEED = 150;
const LOADING_DURATION = 2000;

const SnakeGame = () => {
    const [snake, setSnake] = useState([{ x: 7, y: 7 }]);
    const [food, setFood] = useState({ x: 10, y: 10 });
    const [direction, setDirection] = useState({ x: 1, y: 0 });
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadProgress, setLoadProgress] = useState(0);
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
                setTimeout(() => setIsLoading(false), 300);
            }
        }, 50);

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

    if (isLoading) {
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
                    animation: 'fadeIn 0.8s ease-out'
                }}>
                    <div style={{
                        fontSize: '80px',
                        marginBottom: '20px',
                        animation: 'slither 2s ease-in-out infinite, glow-pulse 3s ease-in-out infinite',
                        filter: 'drop-shadow(0 0 20px rgba(34, 211, 238, 0.4))'
                    }}>
                        🐍
                    </div>

                    <h1 style={{
                        fontSize: '48px',
                        fontWeight: '700',
                        background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 50%, #0891b2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        marginBottom: '12px',
                        letterSpacing: '-0.02em',
                        animation: 'float 3s ease-in-out infinite'
                    }}>
                        SNAKE
                    </h1>

                    <p style={{
                        fontSize: '16px',
                        color: '#94a3b8',
                        marginBottom: '48px',
                        fontWeight: '500',
                        letterSpacing: '0.05em',
                        opacity: 0.8
                    }}>
                        INITIALIZING GAME ENGINE
                    </p>

                    <div style={{
                        width: '320px',
                        height: '6px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        position: 'relative',
                        boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.5)',
                        border: '1px solid rgba(34, 211, 238, 0.2)'
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
                        marginTop: '20px',
                        fontSize: '14px',
                        color: '#64748b',
                        fontWeight: '600',
                        fontVariantNumeric: 'tabular-nums'
                    }}>
                        {Math.round(loadProgress)}%
                    </div>

                    <p style={{
                        marginTop: '32px',
                        fontSize: '13px',
                        color: '#475569',
                        fontStyle: 'italic',
                        opacity: 0.6
                    }}>
                        May take up to 30 seconds to load
                    </p>
                </div>

                <div style={{
                    position: 'absolute',
                    bottom: '40px',
                    display: 'flex',
                    gap: '8px',
                    opacity: 0.3
                }}>
                    {[0, 1, 2].map(i => (
                        <div key={i} style={{
                            width: '6px',
                            height: '6px',
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
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <style>{`
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(34, 211, 238, 0.3); }
                    50% { box-shadow: 0 0 40px rgba(34, 211, 238, 0.6); }
                }
                @keyframes bounce-in {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>

            <div style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.02,
                backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(34, 211, 238, 0.3) 40px, rgba(34, 211, 238, 0.3) 41px)`,
                pointerEvents: 'none'
            }} />

            <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                padding: '32px',
                border: '1px solid rgba(34, 211, 238, 0.2)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                animation: 'bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                    gap: '40px'
                }}>
                    <div style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        letterSpacing: '-0.02em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <span style={{ filter: 'drop-shadow(0 0 10px rgba(34, 211, 238, 0.6))' }}>🐍</span>
                        SNAKE
                    </div>
                    <div style={{
                        fontSize: '24px',
                        fontWeight: '700',
                        color: '#22d3ee',
                        background: 'rgba(34, 211, 238, 0.1)',
                        padding: '8px 20px',
                        borderRadius: '12px',
                        border: '1px solid rgba(34, 211, 238, 0.3)',
                        fontVariantNumeric: 'tabular-nums'
                    }}>
                        {score}
                    </div>
                </div>

                <div style={{
                    width: Math.min(GRID_SIZE * CELL_SIZE, window.innerWidth - 100),
                    height: Math.min(GRID_SIZE * CELL_SIZE, window.innerWidth - 100),
                    display: 'grid',
                    gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                    gap: '1px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '2px solid rgba(34, 211, 238, 0.3)',
                    borderRadius: '12px',
                    padding: '1px',
                    position: 'relative',
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
                                               'rgba(30, 41, 59, 0.4)',
                                    borderRadius: isSnake || isFood ? '3px' : '1px',
                                    transition: 'all 0.15s ease',
                                    boxShadow: isHead ? '0 0 15px rgba(34, 211, 238, 0.8)' :
                                               isSnake ? '0 0 8px rgba(8, 145, 178, 0.5)' :
                                               isFood ? '0 0 15px rgba(244, 63, 94, 0.8)' : 'none',
                                    animation: isFood ? 'pulse-glow 2s infinite' : 'none'
                                }}
                            />
                        );
                    })}
                </div>

                {!isPlaying && (
                    <button 
                        onClick={resetGame}
                        style={{
                            marginTop: '24px',
                            width: '100%',
                            padding: '16px 32px',
                            fontSize: '18px',
                            fontWeight: '700',
                            color: '#0f172a',
                            background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 4px 20px rgba(34, 211, 238, 0.4)',
                            letterSpacing: '0.05em'
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
                        {gameOver ? '🔄 PLAY AGAIN' : '▶ START GAME'}
                    </button>
                )}

                <div style={{
                    marginTop: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <button 
                        onClick={() => handleTouch('up')}
                        style={{
                            width: '60px',
                            height: '60px',
                            fontSize: '24px',
                            background: 'rgba(34, 211, 238, 0.1)',
                            border: '2px solid rgba(34, 211, 238, 0.3)',
                            borderRadius: '12px',
                            color: '#22d3ee',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontWeight: '700'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(34, 211, 238, 0.2)';
                            e.target.style.borderColor = 'rgba(34, 211, 238, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(34, 211, 238, 0.1)';
                            e.target.style.borderColor = 'rgba(34, 211, 238, 0.3)';
                        }}
                    >
                        ↑
                    </button>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {['left', 'down', 'right'].map((dir, idx) => (
                            <button
                                key={dir}
                                onClick={() => handleTouch(dir)}
                                style={{
                                    width: '60px',
                                    height: '60px',
                                    fontSize: '24px',
                                    background: 'rgba(34, 211, 238, 0.1)',
                                    border: '2px solid rgba(34, 211, 238, 0.3)',
                                    borderRadius: '12px',
                                    color: '#22d3ee',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    fontWeight: '700'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'rgba(34, 211, 238, 0.2)';
                                    e.target.style.borderColor = 'rgba(34, 211, 238, 0.5)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'rgba(34, 211, 238, 0.1)';
                                    e.target.style.borderColor = 'rgba(34, 211, 238, 0.3)';
                                }}
                            >
                                {['←', '↓', '→'][idx]}
                            </button>
                        ))}
                    </div>
                </div>

                <p style={{
                    marginTop: '20px',
                    textAlign: 'center',
                    fontSize: '14px',
                    color: '#64748b',
                    fontWeight: '500',
                    letterSpacing: '0.02em'
                }}>
                    Use arrow keys or WASD to play
                </p>
            </div>
        </div>
    );
};

export default SnakeGame;
