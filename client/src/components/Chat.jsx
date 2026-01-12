import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { getUserColor, getUserInitial } from '../utils/userColors';

const Chat = ({ messages, onSendMessage, currentUser, onTyping, typingUsers, onDeleteRequest, hasCursor, searchQuery, activeSearchId, isSearchOpen, onReact, closeSearch }) => {
    const [inputText, setInputText] = useState('');
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, msgId: null });
    const contextMenuRef = useRef(null);

    // Helper to highlight search matches
    const renderMessageText = (id, text) => {
        if (!searchQuery || !searchQuery.trim()) return text;

        // Escape special regex characters
        const escapedQuery = searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));

        return parts.map((part, i) =>
            part.toLowerCase() === searchQuery.toLowerCase() ? (
                <mark key={i} className={id === activeSearchId ? 'mark-active' : ''}>
                    {part}
                </mark>
            ) : part
        );
    };
    const messagesEndRef = useRef(null);
    const longPressTimerRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (!isSearchOpen && messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isSearchOpen]);

    const handleChange = (e) => {
        const value = e.target.value;
        setInputText(value);

        // Auto-cancel search if typing a message
        if (isSearchOpen && value.trim() !== '') {
            closeSearch();
        }

        onTyping(value.length > 0);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (inputText.trim()) {
            onSendMessage(inputText, replyingTo);
            setInputText('');
            setReplyingTo(null);
            if (onTyping) {
                onTyping(false);
            }
        }
    };

    const handleContextMenu = (e, msgId, msgUser, msgText) => {
        if (e) e.preventDefault();

        // Use clientX/Y for fixed positioning to ignore scroll/container offsets
        let x = e ? e.clientX : lastTouchRef.current.x;
        let y = e ? e.clientY : lastTouchRef.current.y;

        // Menu dimensions (approximate including reaction picker and 3 items)
        const menuWidth = 240;
        const menuHeight = 150;

        // If clicking on right edge, shift left
        if (x + menuWidth > window.innerWidth) {
            x = window.innerWidth - menuWidth - 10;
        }
        if (x < 10) x = 10;

        // If clicking on bottom edge, shift up
        if (y + menuHeight > window.innerHeight) {
            y = window.innerHeight - menuHeight - 10;
        }
        if (y < 10) y = 10;

        setContextMenu({
            visible: true,
            x: x,
            y: y,
            msgId: msgId,
            msgUser: msgUser,
            msgText: msgText
        });
    };

    const handleDeleteFromContext = () => {
        if (contextMenu.msgId) {
            onDeleteRequest(contextMenu.msgId);
        }
        setContextMenu({ visible: false, x: 0, y: 0, msgId: null });
    };

    // Intelligent Positioning for Context Menu
    const [menuAdjustedPos, setMenuAdjustedPos] = useState({ x: 0, y: 0 });

    useLayoutEffect(() => {
        if (contextMenu.visible && contextMenuRef.current) {
            const menu = contextMenuRef.current;
            const rect = menu.getBoundingClientRect();
            let { x, y } = contextMenu;

            // Horizontal check
            if (x + rect.width > window.innerWidth) {
                x = window.innerWidth - rect.width - 12;
            }
            if (x < 12) x = 12;

            // Vertical check
            if (y + rect.height > window.innerHeight) {
                y = window.innerHeight - rect.height - 12;
            }
            if (y < 12) y = 12;

            setMenuAdjustedPos({ x, y });
        }
    }, [contextMenu.visible, contextMenu.x, contextMenu.y]);

    useEffect(() => {
        const handleClick = () => {
            if (contextMenu.visible) {
                setContextMenu({ visible: false, x: 0, y: 0, msgId: null });
            }
        };

        document.addEventListener('click', handleClick);
        document.addEventListener('contextmenu', (e) => {
            // Close if right-clicking elsewhere, but allow the new menu to open via its own handler
            if (!e.target.closest('.message-bubble')) {
                handleClick();
            }
        });

        return () => {
            document.removeEventListener('click', handleClick);
            // Note: cleaning up contextmenu listener on document might be tricky if we want to allow other right clicks, 
            // but for this app it's fine. We mainly just want to close our menu.
        };
    }, [contextMenu.visible]);

    const lastTouchRef = useRef({ x: 0, y: 0 });

    const handleTouchStart = (e, msgId, msgUser, msgText) => {
        const touch = e.touches[0];
        lastTouchRef.current = { x: touch.clientX, y: touch.clientY };

        longPressTimerRef.current = setTimeout(() => {
            handleContextMenu(null, msgId, msgUser, msgText);
            if (navigator.vibrate) navigator.vibrate(50); // Feedback
        }, 500);
    };

    const handleTouchEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const [replyingTo, setReplyingTo] = useState(null); // { id, user, text }
    const inputRef = useRef(null);

    const handleReplyFromContext = () => {
        if (contextMenu.msgId) {
            setReplyingTo({
                id: contextMenu.msgId,
                user: contextMenu.msgUser,
                text: contextMenu.msgText
            });
            inputRef.current?.focus();
        }
        setContextMenu({ visible: false, x: 0, y: 0, msgId: null });
    };

    const cancelReply = () => {
        setReplyingTo(null);
    };

    const scrollToMessage = (id) => {
        const element = document.getElementById(`msg-${id}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Using same highlight class for unified blinking
            element.classList.remove('highlight-match');
            void element.offsetWidth; // Trigger reflow
            element.classList.add('highlight-match');
            setTimeout(() => {
                element.classList.remove('highlight-match');
            }, 2000);
        }
    };

    const getUserReaction = (msgId) => {
        const msg = messages.find(m => m.id === msgId);
        if (!msg || !msg.reactions) return null;
        return Object.keys(msg.reactions).find(emoji =>
            msg.reactions[emoji].includes(currentUser)
        );
    };

    const otherTypingUsers = typingUsers.filter(u => u !== currentUser);

    const [showScrollButton, setShowScrollButton] = useState(false);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        // Show button if we are more than 100px away from the bottom
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollButton(!isNearBottom);
    };

    return (
        <div className="chat-container">
            <div
                className="messages-area"
                onScroll={handleScroll}
            >
                {messages.map((msg, index) => {
                    const isOwnMessage = msg.user === currentUser;

                    return (
                        <div
                            key={msg.id || index}
                            className={`message-wrapper ${isOwnMessage ? 'own-message' : 'other-message'}`}
                            id={`msg-${msg.id}`}
                        >
                            {!isOwnMessage && (
                                <div className="user-avatar message-avatar" style={{ backgroundColor: getUserColor(msg.user) }}>
                                    {getUserInitial(msg.user)}
                                </div>
                            )}
                            <div className="message-content">
                                <div
                                    className="message-bubble"
                                    data-cursor={hasCursor}
                                    onTouchStart={(e) => handleTouchStart(e, msg.id, msg.user, msg.text)}
                                    onTouchEnd={handleTouchEnd}
                                    onTouchMove={handleTouchEnd}
                                    onContextMenu={(e) => {
                                        handleContextMenu(e, msg.id, msg.user, msg.text);
                                    }}
                                >
                                    {!isOwnMessage && <div className="message-user">{msg.user}</div>}
                                    {msg.replyTo && (
                                        <div
                                            className="message-reply-preview"
                                            onClick={() => scrollToMessage(msg.replyTo.id)}
                                        >
                                            <div className="reply-user">{msg.replyTo.user === currentUser ? 'You' : msg.replyTo.user}</div>
                                            <div className="reply-text">{msg.replyTo.text}</div>
                                        </div>
                                    )}
                                    <div className="message-text">{renderMessageText(msg.id, msg.text)}</div>
                                    <div className="message-time">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                    <div className="reactions-display">
                                        {Object.entries(msg.reactions).map(([emoji, users]) => (
                                            <div
                                                key={emoji}
                                                className={`reaction-tag ${users.includes(currentUser) ? 'active' : ''}`}
                                                onClick={() => onReact(msg.id, emoji)}
                                                title={users.join(', ')}
                                            >
                                                {emoji} <span className="reaction-count">{users.length}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {otherTypingUsers.length > 0 && (
                    <div className="message-wrapper other-message">
                        <div className="message-bubble typing-bubble">
                            <div className="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                            <span className="typing-text">
                                {otherTypingUsers.join(', ')} {otherTypingUsers.length === 1 ? 'is' : 'are'} typing...
                            </span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Scroll to Bottom Button */}
            {showScrollButton && (
                <button
                    className="scroll-bottom-btn"
                    onClick={scrollToBottom}
                    aria-label="Scroll to bottom"
                >
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <polyline points="19 12 12 19 5 12"></polyline>
                    </svg>
                </button>
            )}

            {/* Custom Context Menu */}
            {contextMenu.visible && (
                <div
                    ref={contextMenuRef}
                    className="custom-context-menu"
                    style={{
                        top: menuAdjustedPos.y || contextMenu.y,
                        left: menuAdjustedPos.x || contextMenu.x,
                        visibility: menuAdjustedPos.x ? 'visible' : 'hidden' // Avoid flash before adjustment
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="reaction-picker">
                        {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => {
                            const isActive = emoji === getUserReaction(contextMenu.msgId);
                            return (
                                <button
                                    key={emoji}
                                    className={isActive ? 'active' : ''}
                                    onClick={() => {
                                        onReact(contextMenu.msgId, emoji);
                                        setContextMenu({ visible: false, x: 0, y: 0, msgId: null });
                                    }}
                                >
                                    {emoji}
                                </button>
                            );
                        })}
                    </div>
                    <button onClick={handleReplyFromContext} className="context-menu-item reply">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <path d="M3 10h10a5 5 0 0 1 5 5v5"></path>
                            <path d="M3 10l6-6"></path>
                            <path d="M3 10l6 6"></path>
                        </svg>
                        Reply
                    </button>
                    {contextMenu.msgUser === currentUser && (
                        <button onClick={handleDeleteFromContext} className="context-menu-item delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Delete Message
                        </button>
                    )}
                </div>
            )}

            <div className="input-container">
                {replyingTo && (
                    <div className="reply-preview-bar">
                        <div className="reply-info">
                            <span className="replying-to-label">Replying to <strong>{replyingTo.user === currentUser ? 'yourself' : replyingTo.user}</strong></span>
                            <span className="replying-text-preview">{replyingTo.text}</span>
                        </div>
                        <button className="cancel-reply-btn" onClick={cancelReply}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                )}
                <form onSubmit={handleSubmit} className="input-area">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputText}
                        onChange={handleChange}
                        placeholder="Type a message..."
                    />
                    <button type="submit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Chat;
