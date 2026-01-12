import React, { useState, useEffect, useRef } from 'react';
import Chat from './components/Chat';
import SnakeGame from './components/SnakeGame';
import { getSharedRoomKey, encryptMessage, decryptMessage } from './utils/crypto';
import { getUserColor, getUserInitial } from './utils/userColors';

// Get WebSocket URL from environment or derive from current location
const getWebSocketUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  // Fallback: derive from current location
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = import.meta.env.VITE_WS_PORT || '3000';
  return `${protocol}//${host}:${port}`;
};

function App() {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [notification, setNotification] = useState(null);
  const [userList, setUserList] = useState([]);
  const [showUserList, setShowUserList] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [reconnectTrigger, setReconnectTrigger] = useState(0);
  const [hasCursor, setHasCursor] = useState(false);
  const [roomKey, setRoomKey] = useState(null); // E2EE room key
  const [isKeyReady, setIsKeyReady] = useState(false); // Track when key is ready
  const [usernameError, setUsernameError] = useState(''); // Username validation error
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const typingTimeoutRef = useRef({});

  // Username validation: starts with letter, only letters/numbers/underscores, min 4 chars
  const validateUsername = (name) => {
    if (name.length < 4) {
      return 'Username must be at least 4 characters';
    }
    if (!/^[a-zA-Z]/.test(name)) {
      return 'Username must start with a letter';
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
      return 'Only letters, numbers, and underscores allowed';
    }
    return '';
  };

  useEffect(() => {
    const handleMouseMove = () => {
      setHasCursor(true);
      window.removeEventListener('mousemove', handleMouseMove);
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Robust Mobile Viewport Sync
    const syncViewportHeight = () => {
      if (window.visualViewport) {
        document.documentElement.style.setProperty(
          '--viewport-height',
          `${window.visualViewport.height}px`
        );
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncViewportHeight);
      window.visualViewport.addEventListener('scroll', syncViewportHeight);
      syncViewportHeight(); // Initial sync
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', syncViewportHeight);
        window.visualViewport.removeEventListener('scroll', syncViewportHeight);
      }
    };
  }, []);
  const notificationTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const roomKeyRef = useRef(null); // Track room key in ref for async access

  // Helper to decrypt a message
  const decryptMessageData = async (msg, key) => {
    if (!key || !msg.iv) {
      return { ...msg }; // Return as-is if not encrypted
    }
    try {
      const decryptedText = await decryptMessage(key, msg.text, msg.iv);
      let decryptedReplyTo = msg.replyTo;
      if (msg.replyTo && msg.replyTo.iv) {
        const decryptedReplyText = await decryptMessage(key, msg.replyTo.text, msg.replyTo.iv);
        decryptedReplyTo = { ...msg.replyTo, text: decryptedReplyText };
      }
      return { ...msg, text: decryptedText, replyTo: decryptedReplyTo };
    } catch (e) {
      console.error('Decryption error:', e);
      return { ...msg, text: '[Decryption failed]' };
    }
  };

  // Helper to decrypt multiple messages
  const decryptMessages = async (msgs, key) => {
    if (!key) return msgs;
    const decrypted = await Promise.all(msgs.map(m => decryptMessageData(m, key)));
    return decrypted;
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    const wsUrl = getWebSocketUrl();
    console.log('Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = async () => {
      setConnectionStatus('Connected');
      console.log('Connected to WebSocket');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Emit join event (room key will be handled after server response)
      ws.send(JSON.stringify({
        type: 'join',
        user: username
      }));
    };

    // Promise to track when room key is ready
    let keyReadyResolve = null;
    const keyReadyPromise = new Promise(resolve => {
      keyReadyResolve = resolve;
    });

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      // Handle server-side errors (e.g., username taken)
      if (data.type === 'error') {
        if (data.code === 'USERNAME_TAKEN') {
          setUsernameError(data.message);
          setIsLoggedIn(false);
          ws.close();
        }
        return;
      }

      if (data.type === 'history') {
        // Wait for room key to be ready before processing history
        if (!roomKeyRef.current) {
          await keyReadyPromise;
        }
        const decrypted = await decryptMessages(data.payload, roomKeyRef.current);
        setMessages(decrypted);
      } else if (data.type === 'message') {
        // For live messages, key should already be set
        if (roomKeyRef.current) {
          const decrypted = await decryptMessageData(data.payload, roomKeyRef.current);
          setMessages((prev) => [...prev, decrypted]);
        } else {
          // Wait for key if not ready (shouldn't happen in normal flow)
          await keyReadyPromise;
          const decrypted = await decryptMessageData(data.payload, roomKeyRef.current);
          setMessages((prev) => [...prev, decrypted]);
        }
      } else if (data.type === 'history_update') {
        if (roomKeyRef.current) {
          const decrypted = await decryptMessages(data.payload, roomKeyRef.current);
          setMessages(decrypted);
        } else {
          await keyReadyPromise;
          const decrypted = await decryptMessages(data.payload, roomKeyRef.current);
          setMessages(decrypted);
        }
      } else if (data.type === 'reaction_update') {
        setMessages(prev => prev.map(m =>
          m.id === data.msgId ? { ...m, reactions: data.reactions } : m
        ));
      } else if (data.type === 'system') {
        setNotification(data.text);
        if (notificationTimeoutRef.current) {
          clearTimeout(notificationTimeoutRef.current);
        }
        notificationTimeoutRef.current = setTimeout(() => {
          setNotification(null);
        }, 2000);
      } else if (data.type === 'userList') {
        setUserList(data.users);
      } else if (data.type === 'typing') {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          if (data.isTyping) {
            next.add(data.user);
          } else {
            next.delete(data.user);
          }
          return next;
        });

        if (data.isTyping) {
          clearTimeout(typingTimeoutRef.current[data.user]);
          typingTimeoutRef.current[data.user] = setTimeout(() => {
            setTypingUsers((prev) => {
              const next = new Set(prev);
              next.delete(data.user);
              return next;
            });
          }, 3000);
        }
      }
    };

    ws.onclose = () => {
      setConnectionStatus('Disconnected');
      console.log('Disconnected from WebSocket');

      if (isLoggedIn) {
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectTrigger(prev => prev + 1);
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setConnectionStatus('Error');
      ws.close();
    };

    setSocket(ws);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      ws.close();
      setSocket(null);
    };
  }, [isLoggedIn, reconnectTrigger]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const name = username.trim();
    const error = validateUsername(name);
    if (error) {
      setUsernameError(error);
      return;
    }
    setUsernameError('');

    // E2EE: Derive key locally before joining
    try {
      const key = await getSharedRoomKey();
      setRoomKey(key);
      roomKeyRef.current = key;
      setIsKeyReady(true);
      setIsLoggedIn(true);
    } catch (err) {
      console.error('Failed to derive room key:', err);
      setUsernameError('Security error: Could not initialize encryption');
    }
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);
    // Clear error as user types if valid
    if (usernameError && value.trim()) {
      const error = validateUsername(value.trim());
      if (!error) setUsernameError('');
    }
  };

  const handleSendMessage = async (text, replyTo = null) => {
    console.log('handleSendMessage called', { socket: !!socket, readyState: socket?.readyState, keyReady: !!roomKeyRef.current });

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error('Cannot send: Socket not ready');
      return;
    }

    if (!roomKeyRef.current) {
      console.error('Cannot send: Room key not ready');
      return;
    }

    try {
      // Encrypt the message
      const encrypted = await encryptMessage(roomKeyRef.current, text);

      // Encrypt reply preview if present
      let encryptedReplyTo = null;
      if (replyTo) {
        const encryptedReplyText = await encryptMessage(roomKeyRef.current, replyTo.text);
        encryptedReplyTo = {
          id: replyTo.id,
          user: replyTo.user,
          text: encryptedReplyText.ciphertext,
          iv: encryptedReplyText.iv
        };
      }

      const message = {
        user: username,
        text: encrypted.ciphertext,
        iv: encrypted.iv,
        replyTo: encryptedReplyTo,
      };
      console.log('Sending encrypted message');
      socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error encrypting message:', error);
    }
  };

  const handleTyping = (isTyping) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'typing',
        user: username,
        isTyping: isTyping
      }));
    }
  };

  const handleReact = (msgId, emoji) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'react',
        msgId,
        emoji,
        user: username
      }));
    }
  };

  const handleDeleteRequest = (msgId) => {
    if (!msgId) return;

    // Desktop direct delete
    if (socket) {
      socket.send(JSON.stringify({
        type: 'delete_message',
        id: msgId,
        user: username
      }));
    }
  };




  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    if (socket) {
      socket.close();
    }
    setIsLoggedIn(false);
    setMessages([]);
    setTypingUsers(new Set());
    setUserList([]);
    setNotification(null);
    setUsername('');
    setShowUserList(false);
    setShowLogoutConfirm(false);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setCurrentSearchIndex(-1);
  };

  const toggleSearch = () => {
    if (isSearchOpen) {
      closeSearch();
    } else {
      setIsSearchOpen(true);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      return;
    }

    // Find all matching messages, sorted chronologically (as they appear in the UI)
    const matches = messages
      .filter(m => m.text && m.text.toLowerCase().includes(query.toLowerCase()))
      .map(m => m.id);

    setSearchResults(matches);

    if (matches.length > 0) {
      // Highlight the MOST RECENT match by default (last in the array)
      const lastMatchIndex = matches.length - 1;
      setCurrentSearchIndex(lastMatchIndex);
      // Wait for React to potentially re-render if needed, then scroll
      setTimeout(() => scrollToMessage(matches[lastMatchIndex]), 50);
    } else {
      setCurrentSearchIndex(-1);
    }
  };

  const navigateSearch = (direction) => {
    if (searchResults.length === 0) return;

    let nextIndex = currentSearchIndex + direction;

    // Wrap around logic
    if (nextIndex < 0) {
      nextIndex = searchResults.length - 1; // Go to most recent
    } else if (nextIndex >= searchResults.length) {
      nextIndex = 0; // Go to oldest
    }

    setCurrentSearchIndex(nextIndex);
    setTimeout(() => scrollToMessage(searchResults[nextIndex]), 50);
  };

  const scrollToMessage = (id) => {
    const element = document.getElementById(`msg-${id}`);
    if (element) {
      // Smooth scroll only if needed or just use behavior: smooth
      // block: 'center' ensures it's always visible and centered
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Trigger the premium blink animation
      element.classList.remove('highlight-match');
      void element.offsetWidth; // Force reflow
      element.classList.add('highlight-match');

      // The animation itself handles the fade out, but we remove the class to be ready for next time
      setTimeout(() => {
        element.classList.remove('highlight-match');
      }, 2000);
    }
  };

  // Lock body scroll when user list or modal is open
  useEffect(() => {
    if (showUserList || showLogoutConfirm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showUserList, showLogoutConfirm]);

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <form onSubmit={handleLogin} className="login-form">
          <h1>STChat</h1>
          <div className="input-wrapper">
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={handleUsernameChange}
              autoFocus
              className={usernameError ? 'input-error' : ''}
            />
            {usernameError && <span className="error-message">{usernameError}</span>}
          </div>
          <p className="username-hint">Letters, numbers, underscores. Starts with a letter. Min 4 chars.</p>
          <button type="submit">Join Chat</button>
        </form>
      </div>
    );
  }

  if (isLoggedIn && connectionStatus !== 'Connected') {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Connecting to STChat...</p>
        <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '-1rem' }}>This may take up to 30 seconds on first load</p>
        <SnakeGame />
      </div>
    );
  }

  return (
    <div className="app-container">
      {notification && (
        <div className="notification-banner">
          {notification}
        </div>
      )}
      <header className={`app-header ${isSearchOpen ? 'searching' : ''}`}>
        <div className="header-left">
          <div className="status-indicator" data-status={connectionStatus}></div>
          <div className="header-info">
            <h1 className="app-title">STChat</h1>
            <span className="status-text">
              {connectionStatus === 'Connected' ? (
                <>Connected as <strong>{username}</strong></>
              ) : (
                'Disconnected'
              )}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <div className={`search-container ${isSearchOpen ? 'open' : ''}`}>
            {isSearchOpen && (
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  autoFocus
                />
                {searchResults.length > 0 && (
                  <div className="search-nav">
                    <span>{currentSearchIndex + 1}/{searchResults.length}</span>
                    <button onClick={() => navigateSearch(-1)} title="Previous">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="18 15 12 9 6 15"></polyline>
                      </svg>
                    </button>
                    <button onClick={() => navigateSearch(1)} title="Next">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}
            <button
              className={`search-toggle ${isSearchOpen ? 'active' : ''}`}
              onClick={toggleSearch}
              title="Search Messages"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                {isSearchOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </>
                ) : (
                  <>
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </>
                )}
              </svg>
            </button>
          </div>
          <button
            className="user-list-toggle"
            onClick={() => setShowUserList(!showUserList)}
            title="Toggle Member List"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span className="user-count">{userList.length}</span>
          </button>
          <button
            className="logout-btn"
            onClick={handleLogout}
            title="Leave Chat"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </header>

      <div className="main-content">
        <Chat
          messages={messages}
          onSendMessage={handleSendMessage}
          currentUser={username}
          onTyping={handleTyping}
          typingUsers={Array.from(typingUsers)}
          onDeleteRequest={handleDeleteRequest}
          hasCursor={hasCursor}
          searchQuery={searchQuery}
          activeSearchId={searchResults[currentSearchIndex]}
          isSearchOpen={isSearchOpen}
          onReact={handleReact}
          closeSearch={closeSearch}
        />
      </div>

      {showUserList && (
        <>
          <div className="modal-backdrop" onClick={() => setShowUserList(false)}></div>
          <div className="user-list-sidebar show">
            <div className="sidebar-header">
              <h3>Members</h3>
              <button className="close-btn" onClick={() => setShowUserList(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <ul>
              {userList.map((user, index) => (
                <li key={index} className={user === username ? 'current-user' : ''}>
                  <div className="user-avatar" style={{ backgroundColor: getUserColor(user) }}>
                    {getUserInitial(user)}
                  </div>
                  <span>{user} {user === username && '(You)'}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {showLogoutConfirm && (
        <div className="modal-backdrop" onClick={() => setShowLogoutConfirm(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Leave Chat?</h3>
            <p>Are you sure you want to disconnect from the chat?</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button className="confirm-btn" onClick={confirmLogout}>Logout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
