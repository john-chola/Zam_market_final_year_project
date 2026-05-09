import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchMessages, addMessage, setTyping, setOnline,
  setPendingCount, updateConversationPreview, sendMessageREST, clearMessages,
} from '../store/slices/chatSlice';
import { initSocket, getSocket } from '../utils/socket';
import { queueMessage, getQueuedMessages, dequeueMessage } from '../utils/offlineQueue';

export default function ChatPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id: conversationId } = useParams();
  const { messages, messagesLoading, currentConversation, isTyping, isOnline, pendingCount }
    = useSelector((s) => s.chat);
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
      dispatch(updateConversationPreview({
        conversationId,
        lastMessage: { text: message.text, sentAt: message.createdAt },
      }));
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
        await dispatch(sendMessageREST({
          conversationId: item.conversationId,
          text: item.text,
        })).unwrap();
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
      dispatch(addMessage({
        _id: `offline_${Date.now()}`,
        conversation: conversationId,
        sender: { _id: user._id, name: user.name },
        text: trimmed,
        createdAt: new Date().toISOString(),
        offline: true,
      }));
    }

    setSending(false);
  };

  // ── Helpers ────────────────────────────────────────────
  const other = currentConversation
    ? (user?._id === currentConversation.buyer?._id
        ? currentConversation.seller
        : currentConversation.buyer)
    : null;

  const isMine = (msg) =>
    (msg.sender?._id || msg.sender) === user?._id ||
    (msg.sender?._id || msg.sender)?.toString() === user?._id?.toString();

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column',
      background: 'var(--cream)' }}>

      {/* Header */}
      <nav style={{ background: 'var(--coal)', padding: '0.9rem 1.25rem',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={() => navigate('/chat')}
          style={{ background: 'transparent', border: 'none', color: 'white',
            fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>←</button>

        <div style={{ width: 36, height: 36, borderRadius: '50%',
          background: 'var(--ember)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14 }}>
          {other?.name?.charAt(0)?.toUpperCase() || '?'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: 'white', fontWeight: 500, fontSize: 14,
            margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {other?.name || 'Chat'}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, margin: 0 }}>
            📍 {other?.neighbourhood?.replace('_', ' ') || ''}
          </p>
        </div>

        {/* Online/offline indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%',
            background: isOnline ? '#6FCF97' : '#888780' }} />
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </nav>

      {/* Listing context banner */}
      {currentConversation?.listing && (
        <div style={{ background: '#2C2C2A', padding: '8px 1.25rem',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 16 }}>🪵</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: 'white', fontSize: 12, fontWeight: 500, margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentConversation.listing.title}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 0 }}>
              K{currentConversation.listing.pricePerBag} per {currentConversation.listing.unit}
            </p>
          </div>
        </div>
      )}

      {/* Offline queue banner */}
      {!isOnline && (
        <div style={{ background: '#BA7517', padding: '8px 1.25rem',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 14 }}>📵</span>
          <p style={{ color: 'white', fontSize: 12, margin: 0 }}>
            You are offline. Messages will be sent when you reconnect.
            {pendingCount > 0 && ` (${pendingCount} queued)`}
          </p>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem',
        display: 'flex', flexDirection: 'column', gap: 8 }}>

        {messagesLoading && (
          <p style={{ textAlign: 'center', color: 'var(--ash)', marginTop: '2rem' }}>
            Loading messages...
          </p>
        )}

        {!messagesLoading && messages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>👋</div>
            <p style={{ color: 'var(--ash)', fontSize: 14 }}>
              Start the conversation — ask about availability, collection point, or price.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const mine = isMine(msg);
          return (
            <div key={msg._id} style={{ display: 'flex',
              justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%',
                background: mine ? 'var(--ember)' : 'white',
                color: mine ? 'white' : 'var(--coal)',
                borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                padding: '10px 14px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                opacity: msg.offline ? 0.7 : 1,
                border: msg.offline ? '1px dashed rgba(255,255,255,0.4)' : 'none',
              }}>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{msg.text}</p>
                <p style={{
                  margin: '4px 0 0', fontSize: 10,
                  color: mine ? 'rgba(255,255,255,0.65)' : 'var(--ash)',
                  textAlign: 'right',
                }}>
                  {msg.offline ? '⏳ queued' :
                    new Date(msg.createdAt).toLocaleTimeString('en-ZM', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                </p>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ background: 'white', borderRadius: '14px 14px 14px 4px',
              padding: '10px 14px', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%', background: 'var(--ash)',
                    animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend}
        style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)',
          background: 'white', display: 'flex', gap: 8, flexShrink: 0 }}>
        <input
          type="text"
          placeholder={isOnline ? 'Type a message...' : 'Offline — message will be queued'}
          value={text}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend(e)}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 24,
            border: '1px solid var(--border)', outline: 'none',
            background: isOnline ? 'white' : '#F5F4F0',
            fontSize: 14 }}
        />
        <button type="submit" disabled={!text.trim() || sending}
          style={{
            width: 42, height: 42, borderRadius: '50%', border: 'none', flexShrink: 0,
            background: text.trim() ? 'var(--ember)' : 'var(--border)',
            color: 'white', cursor: text.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, transition: 'background 0.15s',
          }}>
          ↑
        </button>
      </form>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}