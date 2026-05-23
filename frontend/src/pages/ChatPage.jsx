import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchMessages,
  addMessage,
  setTyping,
  setOnline,
  setPendingCount,
  updateConversationPreview,
  sendMessageREST,
  clearMessages,
} from '../store/slices/chatSlice';
import { initSocket, getSocket } from '../utils/socket';
import { queueMessage, getQueuedMessages, dequeueMessage } from '../utils/offlineQueue';
import './mychatpage.css';

export default function ChatPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id: conversationId } = useParams();
  const { messages, messagesLoading, currentConversation, isTyping, isOnline, pendingCount } =
    useSelector((s) => s.chat);
  const { user, token } = useSelector((s) => s.auth);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const socketRef = useRef(null);

  // ── Load messages ──────────────────────────────────────
  useEffect(() => {
    dispatch(fetchMessages(conversationId));
    return () => dispatch(clearMessages());
  }, [conversationId, dispatch]);

  // ── Init Socket.io ─────────────────────────────────────
  useEffect(() => {
    const socket = initSocket(token);
    socketRef.current = socket;

    socket.emit('join_conversation', conversationId);
    socket.emit('mark_read', { conversationId });

    socket.on('new_message', ({ message }) => {
      dispatch(addMessage(message));
      dispatch(
        updateConversationPreview({
          conversationId,
          lastMessage: { text: message.text, sentAt: message.createdAt },
        })
      );
      socket.emit('mark_read', { conversationId });
    });

    socket.on('user_typing', ({ isTyping: t }) => {
      dispatch(setTyping(t));
    });

    return () => {
      socket.off('new_message');
      socket.off('user_typing');
    };
  }, [conversationId, token, dispatch]);

  // ── Online/offline detection ───────────────────────────
  useEffect(() => {
    const handleOnline = async () => {
      dispatch(setOnline(true));
      await flushOfflineQueue();
    };
    const handleOffline = () => dispatch(setOnline(false));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    dispatch(setOnline(navigator.onLine));

    // Count pending on mount
    getQueuedMessages().then((q) => dispatch(setPendingCount(q.length)));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);

  // ── Auto-scroll to bottom ──────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Flush offline queue when back online ───────────────
  const flushOfflineQueue = useCallback(async () => {
    const queued = await getQueuedMessages();
    if (queued.length === 0) return;

    for (const item of queued) {
      try {
        await dispatch(
          sendMessageREST({
            conversationId: item.conversationId,
            text: item.text,
          })
        ).unwrap();
        await dequeueMessage(item.id);
      } catch {
        break; // stop if still failing
      }
    }

    const remaining = await getQueuedMessages();
    dispatch(setPendingCount(remaining.length));
  }, [dispatch]);

  // ── Typing indicator ───────────────────────────────────
  const handleTyping = (val) => {
    setText(val);
    const socket = getSocket();
    if (!socket) return;
    socket.emit('typing', { conversationId, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('typing', { conversationId, isTyping: false });
    }, 1500);
  };

  // ── Send message ───────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setText('');
    setSending(true);

    const socket = getSocket();

    if (isOnline && socket?.connected) {
      // Real-time via Socket.io
      socket.emit('send_message', { conversationId, text: trimmed });
      socket.emit('typing', { conversationId, isTyping: false });
    } else {
      // Offline — queue in IndexedDB + show optimistically
      await queueMessage(conversationId, trimmed);
      const queued = await getQueuedMessages();
      dispatch(setPendingCount(queued.length));
      // Show optimistic message in UI
      dispatch(
        addMessage({
          _id: `offline_${Date.now()}`,
          conversation: conversationId,
          sender: { _id: user._id, name: user.name },
          text: trimmed,
          createdAt: new Date().toISOString(),
          offline: true,
        })
      );
    }

    setSending(false);
  };

  // ── Helpers ────────────────────────────────────────────
  const other = currentConversation
    ? user?._id === currentConversation.buyer?._id
      ? currentConversation.seller
      : currentConversation.buyer
    : null;

  const isMine = (msg) =>
    (msg.sender?._id || msg.sender) === user?._id ||
    (msg.sender?._id || msg.sender)?.toString() === user?._id?.toString();

  return (
    <div className="chat-container">
      {/* Header */}
      <nav className="chat-header">
        <button
          onClick={() => navigate('/chat')}
          className="chat-back-btn"
          aria-label="Back to conversations"
        >
          ←
        </button>

        <div className="chat-avatar">
          {other?.name?.charAt(0)?.toUpperCase() || '?'}
        </div>

        <div className="chat-user-info">
          <p className="chat-user-name">{other?.name || 'Chat'}</p>
          <p className="chat-user-location">
            {other?.neighbourhood?.replace('_', ' ') || ''}
          </p>
        </div>

        {/* Online/offline indicator */}
        <div className="chat-status">
          <div className={`chat-status-dot ${isOnline ? 'status-online' : 'status-offline'}`} />
          <span className="chat-status-text">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </nav>

      {/* Listing context banner */}
      {currentConversation?.listing && (
        <div className="chat-listing-banner">
          <span className="chat-listing-icon">🪵</span>
          <div className="chat-listing-info">
            <p className="chat-listing-title">
              {currentConversation.listing.title}
            </p>
            <p className="chat-listing-price">
              K{currentConversation.listing.pricePerBag} per{' '}
              {currentConversation.listing.unit}
            </p>
          </div>
        </div>
      )}

      {/* Offline queue banner */}
      {!isOnline && (
        <div className="chat-offline-banner">
          <span className="chat-offline-icon">📡</span>
          <p className="chat-offline-text">
            You are offline. Messages will be sent when you reconnect.
            {pendingCount > 0 && ` (${pendingCount} queued)`}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages">
        {messagesLoading && (
          <p className="chat-loading">Loading messages...</p>
        )}

        {!messagesLoading && messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <p className="chat-empty-text">
              Start the conversation — ask about availability, collection point, or
              price.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const mine = isMine(msg);
          return (
            <div
              key={msg._id}
              className={`message-wrapper ${mine ? 'message-mine' : 'message-other'}`}
            >
              <div
                className={`message-bubble ${
                  mine ? 'message-bubble-mine' : 'message-bubble-other'
                } ${msg.offline ? 'message-offline' : ''}`}
              >
                <p className="message-text">{msg.text}</p>
                <p
                  className={`message-time ${
                    mine ? 'message-time-mine' : 'message-time-other'
                  }`}
                >
                  {msg.offline
                    ? 'queued'
                    : new Date(msg.createdAt).toLocaleTimeString('en-ZM', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                </p>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="message-wrapper message-other">
            <div className="typing-indicator">
              <div className="typing-dots">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="typing-dot"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="chat-input-form">
        <input
          type="text"
          placeholder={
            isOnline ? 'Type a message...' : 'Offline — message will be queued'
          }
          value={text}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend(e)}
          className={`chat-input ${!isOnline ? 'chat-input-offline' : ''}`}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className={`chat-send-btn ${text.trim() ? 'send-active' : 'send-inactive'}`}
        >
          ↑
        </button>
      </form>
    </div>
  );
}