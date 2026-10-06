import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { MessageSquare, Send, Trash2, Bell, MessageCircle, Mail, Copy, Check, X, Sparkles } from 'lucide-react';
import { InteractiveCatScene } from './components/InteractiveCatScene';
import { AnimatedTeddy } from './components/AnimatedTeddy';

interface ChatItem {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

interface FloatingHeart {
  id: number;
  left: number;
  size: number;
  duration: number;
  icon: string;
}

const MEALS = [
  { name: 'Pizza', emoji: '🍕' },
  { name: 'Sushi', emoji: '🍣' },
  { name: 'Burgers', emoji: '🍔' },
  { name: 'Tacos', emoji: '🌮' },
  { name: 'Pasta', emoji: '🍝' },
  { name: 'Ramen', emoji: '🍜' },
];

const LOCAL_STORAGE_SENDER_ID = 'palak-chat-sender-id';
const LOCAL_STORAGE_DISPLAY_NAME = 'palak-chat-display-name';
const LOCAL_STORAGE_MESSAGES = 'palak-chat-messages-store';
const ARVIND_EMAIL = 'arvindkumar6392230@gmail.com';

function getButtonBounds(el: HTMLElement) {
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  return {
    minLeft: 12,
    maxLeft: Math.max(12, window.innerWidth - w - 12),
    minTop: 12,
    maxTop: Math.max(12, window.innerHeight - h - 12),
  };
}

function clampPosition(pos: { left: number; top: number }, bounds: ReturnType<typeof getButtonBounds>) {
  const maxL = Math.max(bounds.minLeft, bounds.maxLeft);
  const maxT = Math.max(bounds.minTop, bounds.maxTop);
  return {
    left: Math.min(Math.max(pos.left, bounds.minLeft), maxL),
    top: Math.min(Math.max(pos.top, bounds.minTop), maxT),
  };
}

function isSafePosition(container: HTMLElement, btn: HTMLElement, target: { left: number; top: number }) {
  const box = {
    left: target.left,
    right: target.left + btn.offsetWidth,
    top: target.top,
    bottom: target.top + btn.offsetHeight,
  };
  return !Array.from(container.querySelectorAll('button:not(.no-button), a, input, textarea, select')).some((el) => {
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const padding = 5;
    return (
      box.left < rect.right + padding &&
      box.right > rect.left - padding &&
      box.top < rect.bottom + padding &&
      box.bottom > rect.top - padding
    );
  });
}

function calculateDodge(container: HTMLElement, btn: HTMLElement, currentPos: { left: number; top: number }) {
  const bounds = getButtonBounds(btn);
  for (let i = 0; i < 80; i++) {
    const candidate = {
      left: bounds.minLeft + Math.random() * Math.max(0, bounds.maxLeft - bounds.minLeft),
      top: bounds.minTop + Math.random() * Math.max(0, bounds.maxTop - bounds.minTop),
    };
    const distance = Math.hypot(candidate.left - currentPos.left, candidate.top - currentPos.top) > 90;
    if (isSafePosition(container, btn, candidate) && distance) {
      return { left: Math.round(candidate.left), top: Math.round(candidate.top) };
    }
  }
  return currentPos;
}

function formatChatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return 'just now';
  }
}

export default function App() {
  const [step, setStep] = useState(1);
  const [noPosition, setNoPosition] = useState<{ left: number; top: number } | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [dateError, setDateError] = useState('');
  const [selectedMeal, setSelectedMeal] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [paid, setPaid] = useState(false);

  // Notification state
  const [notificationCopied, setNotificationCopied] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);

  // Background scene mode: 'animated' (HD Cursor Tracking) or 'video' (Looping Video)
  const [bgMode, setBgMode] = useState<'animated' | 'video'>('animated');

  // Periodic Floating Hearts state
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);

  // Periodically generate floating hearts over the card
  useEffect(() => {
    const icons = ['💖', '💕', '💗', '🌸', '✨', '💓', '🥰', '💝'];
    const interval = setInterval(() => {
      const newHeart: FloatingHeart = {
        id: Date.now() + Math.random(),
        left: Math.floor(Math.random() * 84) + 8, // 8% to 92% across card
        size: Math.floor(Math.random() * 10) + 16, // 16px to 26px
        duration: +(Math.random() * 1.5 + 3.8).toFixed(1), // 3.8s to 5.3s
        icon: icons[Math.floor(Math.random() * icons.length)],
      };

      setFloatingHearts((prev) => {
        const now = Date.now();
        // Keep active hearts
        const active = prev.filter((h) => now - h.id < h.duration * 1000);
        return [...active, newHeart];
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // Chat state
  const [senderId, setSenderId] = useState('');
  const [storedName, setStoredName] = useState('');
  const [chatName, setChatName] = useState('');
  const [chatContent, setChatContent] = useState('');
  const [chatReady, setChatReady] = useState(false);
  const [messages, setMessages] = useState<ChatItem[]>([]);

  const containerRef = useRef<HTMLElement>(null);
  const yesButtonRef = useRef<HTMLButtonElement>(null);
  const noButtonRef = useRef<HTMLButtonElement>(null);

  // Initialize Chat storage
  useEffect(() => {
    try {
      let sId = localStorage.getItem(LOCAL_STORAGE_SENDER_ID);
      if (!sId) {
        sId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : 'user_' + Date.now();
        localStorage.setItem(LOCAL_STORAGE_SENDER_ID, sId);
      }
      const sName = localStorage.getItem(LOCAL_STORAGE_DISPLAY_NAME) ?? '';
      setSenderId(sId);
      setStoredName(sName);
      setChatName(sName);

      const storedMsgs = localStorage.getItem(LOCAL_STORAGE_MESSAGES);
      if (storedMsgs) {
        setMessages(JSON.parse(storedMsgs));
      }
      setChatReady(true);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = chatName.trim();
    const trimmedContent = chatContent.trim();
    if (!trimmedName || !trimmedContent || !senderId) return;

    const shortName = trimmedName.slice(0, 32);
    localStorage.setItem(LOCAL_STORAGE_DISPLAY_NAME, shortName);
    setStoredName(shortName);

    const newMsg: ChatItem = {
      id: Date.now().toString(),
      senderId,
      senderName: shortName,
      content: trimmedContent,
      createdAt: new Date().toISOString(),
    };

    const next = [...messages, newMsg];
    setMessages(next);
    setChatContent('');
    try {
      localStorage.setItem(LOCAL_STORAGE_MESSAGES, JSON.stringify(next));
    } catch {
      // Ignore
    }
  };

  const handleUnsendMessage = (id: string) => {
    const next = messages.filter((m) => m.id !== id);
    setMessages(next);
    try {
      localStorage.setItem(LOCAL_STORAGE_MESSAGES, JSON.stringify(next));
    } catch {
      // Ignore
    }
  };

  // Position runaway button initially beside YES button
  useLayoutEffect(() => {
    const shell = containerRef.current;
    const yesBtn = yesButtonRef.current;
    const noBtn = noButtonRef.current;
    if (!shell || !yesBtn || !noBtn) return;

    const yesRect = yesBtn.getBoundingClientRect();
    const bounds = getButtonBounds(noBtn);
    setNoPosition(clampPosition({ left: yesRect.right + 16, top: yesRect.top }, bounds));
  }, []);

  // Reposition runaway button on resize / scroll
  useEffect(() => {
    const shell = containerRef.current;
    if (!shell) return;

    const handleResize = () => {
      const noBtn = noButtonRef.current;
      if (!noBtn) return;
      const bounds = getButtonBounds(noBtn);
      setNoPosition((prev) => {
        if (!prev) return prev;
        const clamped = clampPosition(prev, bounds);
        return isSafePosition(shell, noBtn, clamped) ? clamped : calculateDodge(shell, noBtn, clamped);
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, []);

  const dodgeNo = () => {
    const shell = containerRef.current;
    const noBtn = noButtonRef.current;
    if (!shell || !noBtn) return;
    const rect = noBtn.getBoundingClientRect();
    const curr = noPosition ?? { left: rect.left, top: rect.top };
    setNoPosition(calculateDodge(shell, noBtn, curr));
  };

  // YES Click Animation & Transition
  const handleYesClick = () => {
    // Joyful heart & sparkling confetti animation
    confetti({
      particleCount: 90,
      spread: 85,
      origin: { y: 0.6 },
      colors: ['#ff4081', '#f06292', '#f48fb1', '#ff80ab', '#ffffff', '#ffd166'],
    });

    setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#c2185b', '#e91e63', '#ff80ab'],
      });
    }, 280);

    setStep(2);
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      window.prompt('Copy this link to share:', window.location.href);
    }
  };

  const handleDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      setDateError('Pick both a date and a time first ♥');
      return;
    }
    setDateError('');
    setStep(4);
  };

  // Notification generation
  const generateNotificationSummary = () => {
    const dateText = selectedDate || 'To be decided';
    const timeText = selectedTime || '6:00 PM';
    const mealText = selectedMeal || 'Surprise treat';
    return (
      `💖 Palak said YES to your date invite! 💖\n\n` +
      `📅 Date: ${dateText}\n` +
      `⏰ Time: ${timeText}\n` +
      `🍽️ Craving: ${mealText}\n` +
      `🚗 Ready by 6 PM!\n\n` +
      `Can't wait! ♥`
    );
  };

  // Automatically post notification message directly into local chat
  const postAutoNotificationToChat = (overrideDate?: string, overrideTime?: string, overrideMeal?: string) => {
    const d = overrideDate || selectedDate || 'To be decided';
    const t = overrideTime || selectedTime || '6:00 PM';
    const m = overrideMeal || selectedMeal || 'Surprise treat';

    const notifyContent =
      `💖 RSVP Confirmed: Palak said YES! 💖\n\n` +
      `📅 Date: ${d}\n` +
      `⏰ Time: ${t}\n` +
      `🍽️ Craving: ${m}\n` +
      `🚗 Ready by 6 PM! Can't wait! 🥰✨`;

    const newMsg: ChatItem = {
      id: 'rsvp_' + Date.now(),
      senderId: 'palak_auto_rsvp',
      senderName: 'Palak (RSVP)',
      content: notifyContent,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => {
      // Keep only latest auto-rsvp to avoid duplicate clutter
      const filtered = prev.filter((msg) => !msg.content.includes('RSVP Confirmed'));
      const next = [...filtered, newMsg];
      try {
        localStorage.setItem(LOCAL_STORAGE_MESSAGES, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  // Automatically trigger when entering step 6
  useEffect(() => {
    if (step === 6) {
      postAutoNotificationToChat();
    }
  }, [step, selectedDate, selectedTime, selectedMeal]);

  const handleNotifyWhatsApp = () => {
    const text = encodeURIComponent(generateNotificationSummary());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleNotifyEmail = () => {
    const subject = encodeURIComponent('Palak said YES! 💖 (Date Invite RSVP)');
    const body = encodeURIComponent(generateNotificationSummary());
    window.open(`mailto:${ARVIND_EMAIL}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleCopyNotification = () => {
    navigator.clipboard.writeText(generateNotificationSummary());
    setNotificationCopied(true);
    setTimeout(() => setNotificationCopied(false), 3000);
  };

  const isFormValid = chatReady && chatName.trim().length > 0 && chatContent.trim().length > 0;

  return (
    <>
      {/* Background: HD Interactive Animated Cat Scene or Looping Video */}
      {bgMode === 'animated' ? (
        <InteractiveCatScene />
      ) : (
        <div className="bg-video-container" aria-hidden="true">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="bg-video"
            src="/cat-bg.mp4"
          >
            <source src="/cat-bg.mp4" type="video/mp4" />
            <source src="/cat-seamless.mp4" type="video/mp4" />
          </video>
        </div>
      )}
      <div className="bg-overlay" aria-hidden="true" />

      {/* Background Mode Switcher Pill */}
      <button
        type="button"
        onClick={() => setBgMode(bgMode === 'animated' ? 'video' : 'animated')}
        className="fixed bottom-4 left-4 z-40 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-white/75 hover:bg-white/90 backdrop-blur-md border border-white/80 shadow-md text-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
        title="Toggle between HD cursor-following cat animation and video"
      >
        <Sparkles size={12} className="text-pink-500" />
        <span>{bgMode === 'animated' ? '🐱 Eyes Follow Cursor (HD)' : '🎬 Video Mode'}</span>
        <span className="text-[10px] text-rose-600 font-bold underline">Switch</span>
      </button>

      {/* Floating Notification Button so Arvind can always see choices */}
      {step >= 2 && (
        <button
          type="button"
          className="floating-notify-trigger"
          onClick={() => setShowNotifyModal(true)}
          aria-label="View choices & notify Arvind"
        >
          <Bell size={14} className="text-pink-600 animate-pulse" />
          <span>Choices Summary 🔔</span>
        </button>
      )}

      {/* Main Invitation Shell */}
      <main className="invite-shell" ref={containerRef}>
        <section className="invite-card" aria-label="A little date invitation">
          {/* Periodic Floating Hearts Layer over the Card */}
          <div className="floating-hearts-layer" aria-hidden="true">
            {floatingHearts.map((heart) => (
              <span
                key={heart.id}
                className="floating-heart-item"
                style={{
                  left: `${heart.left}%`,
                  fontSize: `${heart.size}px`,
                  animationDuration: `${heart.duration}s`,
                }}
              >
                {heart.icon}
              </span>
            ))}
          </div>

          {/* Progress dots 1 to 6 */}
          <div
            className="progress"
            role="progressbar"
            aria-label={`Step ${step} of 6`}
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={6}
          >
            {Array.from({ length: 6 }, (_, idx) => (
              <span
                key={idx}
                className={`progress-dot${step === idx + 1 ? ' is-active' : ''}`}
              />
            ))}
          </div>

          {/* STEP 1: The Original Letter & Proposal */}
          <section className={`step${step === 1 ? ' is-active' : ''}`} data-step="1">
            <AnimatedTeddy />
            <h1>Palak, I like you so much.</h1>
            <div className="intro-copy">
              <p>
                Actually, I’ve liked you since the very first time I saw you in 11th. The moment I saw you, I fell for you… like I was falling into a black hole. Till 12th I was stuck in the event horizon, trying so hard to escape, but I couldn’t. Even after our farewell, I still kept falling.
              </p>
              <p>So this is it.</p>
            </div>
            <p className="intro-question">Will you be mine?</p>
            <div className="action-row">
              <button
                ref={yesButtonRef}
                className="pill-button yes-button"
                type="button"
                onClick={handleYesClick}
                data-testid="button-yes"
              >
                YES ♥
              </button>
              <div className="no-zone" aria-hidden="true" />
            </div>
            <button
              className="link-button"
              type="button"
              onClick={copyInviteLink}
              data-testid="button-copy-invite"
            >
              Copy private invite link ♥
            </button>
            <p className="copy-status" aria-live="polite">
              {copiedLink ? 'Invite link copied ♥' : ''}
            </p>
          </section>

          {/* STEP 2: Wait you actually said yes?? */}
          <section className={`step${step === 2 ? ' is-active' : ''}`} data-step="2">
            <div className="step-illustration" aria-hidden="true">
              🧽
            </div>
            <h2>WAIT YOU ACTUALLY SAID YES??</h2>
            <p className="step-copy">I was so ready for you to say no 😂</p>
            <button
              className="pill-button"
              type="button"
              onClick={() => setStep(3)}
              data-testid="button-okay-okay"
            >
              okay okay! →
            </button>
          </section>

          {/* STEP 3: When are you free? */}
          <section className={`step${step === 3 ? ' is-active' : ''}`} data-step="3">
            <div className="step-illustration" aria-hidden="true">
              📅
            </div>
            <h2>So... when are you free?</h2>
            <form className="date-form" onSubmit={handleDateSubmit}>
              <div className="form-row">
                <div>
                  <label className="field-label" htmlFor="date-input">
                    pick a date
                  </label>
                  <input
                    className="date-input"
                    id="date-input"
                    type="date"
                    required
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    data-testid="input-date"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="time-select">
                    pick a time
                  </label>
                  <select
                    className="time-select"
                    id="time-select"
                    required
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    data-testid="select-time"
                  >
                    <option value="" disabled>
                      select time
                    </option>
                    {Array.from({ length: 9 }, (_, idx) => {
                      const hr = idx + 12;
                      const label = hr === 12 ? '12:00 PM' : `${hr - 12}:00 PM`;
                      return (
                        <option key={hr} value={label}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <p className="error-message" aria-live="polite">
                {dateError}
              </p>
              <button className="pill-button" type="submit" data-testid="button-set-date">
                set the date! ♥
              </button>
            </form>
          </section>

          {/* STEP 4: What are we feeling? */}
          <section className={`step${step === 4 ? ' is-active' : ''}`} data-step="4">
            <h2>What are we feeling? 🍽✨</h2>
            <p className="step-copy">pick your vibe</p>
            <div className="vibe-grid" role="group" aria-label="Choose what to eat">
              {MEALS.map((meal) => (
                <button
                  key={meal.name}
                  className="choice-card"
                  type="button"
                  aria-pressed={selectedMeal === meal.name}
                  onClick={() => {
                    setSelectedMeal(meal.name);
                    setStep(5);
                  }}
                  data-testid={`choice-meal-${meal.name.toLowerCase()}`}
                >
                  <span className="choice-emoji" aria-hidden="true">
                    {meal.emoji}
                  </span>
                  {meal.name}
                </button>
              ))}
            </div>
          </section>

          {/* STEP 5: Glad you didn't say no */}
          <section className={`step${step === 5 ? ' is-active' : ''}`} data-step="5">
            <div className="step-illustration" aria-hidden="true">
              🚗
            </div>
            <h2>glad you didn't say no. be ready by 6, I'm coming to get you 🚗</h2>
            <button
              className="pill-button"
              type="button"
              onClick={() => setStep(6)}
              data-testid="button-accept"
            >
              ok I accept ✨
            </button>
          </section>

          {/* STEP 6: One small fee & Shared Chat */}
          <section className={`step${step === 6 ? ' is-active' : ''}`} data-step="6">
            <div className="step-illustration" aria-hidden="true">
              💌
            </div>
            <h2>one small fee</h2>
            <p className="step-copy">it is a normal transaction.</p>
            <div className="receipt" aria-label="Date Agreement receipt">
              <div className="receipt-line">
                <span className="receipt-title">Date Agreement™</span>
                <span className="receipt-label">due today</span>
              </div>
              <div className="receipt-line">
                <span className="receipt-label">total</span>
                <span className="receipt-total">$499</span>
              </div>
            </div>
            <button
              className="pill-button"
              type="button"
              onClick={() => {
                window.alert('Transaction Complete! See you at 6!');
                setPaid(true);
              }}
              data-testid="button-pay-joke"
            >
              pay $499 & confirm ♥
            </button>
            <p className="just-kidding">Just kidding! No payment needed ♥</p>
            <a className="link-button" href="#shared-chat" data-testid="link-open-chat">
              Open our shared chat ♥
            </a>
            {paid && (
              <p className="success-note" role="status">
                paid in affection. ♥
              </p>
            )}

            {/* Notification Section: So Arvind gets notified of what she chose */}
            <div className="notify-box" aria-label="Notification details">
              <div className="notify-header">
                <span className="notify-title">
                  <Bell size={16} /> Auto-Notify Arvind
                </span>
                <span className="notify-badge">Auto-Sent to Chat Below ✓</span>
              </div>
              <div className="notify-details">
                <p>
                  <strong>Status:</strong> She said YES! 💖
                </p>
                <p>
                  <strong>Date & Time:</strong> {selectedDate || 'Not specified'} at {selectedTime || 'Evening'}
                </p>
                <p>
                  <strong>Food Craving:</strong> {selectedMeal || 'Not specified'}
                </p>
              </div>

              <div className="mb-3 text-xs font-medium text-rose-800 bg-rose-100/70 p-2.5 rounded-xl border border-rose-200/70 flex items-center justify-between">
                <span>💬 Auto-sent to our conversation below!</span>
                <a href="#shared-chat" className="underline font-bold text-rose-900 hover:text-rose-950">
                  View in chat ↓
                </a>
              </div>

              <div className="notify-actions">
                <button
                  type="button"
                  onClick={handleNotifyWhatsApp}
                  className="notify-action-btn whatsapp"
                  title="Notify Arvind on WhatsApp"
                >
                  <MessageCircle size={14} /> Send on WhatsApp
                </button>
                <button
                  type="button"
                  onClick={handleNotifyEmail}
                  className="notify-action-btn email"
                  title="Email choices to Arvind"
                >
                  <Mail size={14} /> Email Arvind
                </button>
                <button
                  type="button"
                  onClick={handleCopyNotification}
                  className="notify-action-btn copy"
                  title="Copy choices summary"
                >
                  {notificationCopied ? (
                    <>
                      <Check size={14} className="text-emerald-600" />
                      <span>Copied! ♥</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        </section>

        {/* Runaway No button (only on step 1) */}
        {step === 1 && (
          <button
            ref={noButtonRef}
            className={`pill-button no-button${noPosition ? ' is-positioned' : ''}`}
            type="button"
            style={noPosition ? { left: noPosition.left, top: noPosition.top } : undefined}
            onPointerEnter={dodgeNo}
            onFocus={dodgeNo}
            onClick={dodgeNo}
            data-testid="button-no"
          >
            no ☁
          </button>
        )}

        {/* STEP 6: THE EXACT INLINE CHAT SECTION */}
        {step === 6 && (
          <section
            id="shared-chat"
            className="palak-inline-chat"
            aria-label="Our shared conversation"
            data-testid="section-inline-chat"
          >
            <header className="palak-inline-chat-heading">
              <span className="palak-inline-chat-icon" aria-hidden="true">
                <MessageSquare size={18} />
              </span>
              <div>
                <p className="palak-inline-chat-eyebrow">A little space for us</p>
                <h2>Our conversation</h2>
                <p className="palak-inline-chat-subtitle">The date invite, continued.</p>
              </div>
              <span className="palak-inline-chat-presence">
                <i aria-hidden="true" />
                just us
              </span>
            </header>

            <div
              className="palak-inline-chat-thread"
              aria-label="Messages"
              aria-live="polite"
              aria-relevant="additions text"
            >
              {messages.length === 0 ? (
                <div className="palak-inline-chat-state" data-testid="status-inline-chat-empty">
                  <strong>Say the first thing.</strong>
                  <span>Plans, questions, little thoughts — they can all start here.</span>
                </div>
              ) : (
                <div className="palak-inline-chat-list">
                  <div className="palak-inline-chat-divider">
                    <span>today</span>
                  </div>
                  {messages.map((msg) => {
                    const isOwn = msg.senderId === senderId;
                    const isRsvp = msg.senderId === 'palak_auto_rsvp' || msg.content.includes('RSVP Confirmed');
                    return (
                      <article
                        key={msg.id}
                        className={`palak-inline-chat-message${isOwn ? ' is-own' : ''}`}
                        data-testid={`inline-chat-message-${msg.id}`}
                      >
                        {!isOwn && (
                          <span className="palak-inline-chat-avatar" aria-hidden="true">
                            {isRsvp ? '💖' : (msg.senderName.trim().slice(0, 1).toUpperCase() || '?')}
                          </span>
                        )}
                        <div className="palak-inline-chat-message-body">
                          <div className="palak-inline-chat-meta">
                            <span>{isOwn ? 'You' : msg.senderName}</span>
                            <time dateTime={msg.createdAt}>{formatChatTime(msg.createdAt)}</time>
                          </div>
                          <div className={`palak-inline-chat-bubble${isRsvp ? ' is-rsvp' : ''}`}>
                            {msg.content}
                          </div>
                        </div>
                        {isOwn && !isRsvp && (
                          <button
                            className="palak-inline-chat-unsend"
                            type="button"
                            onClick={() => handleUnsendMessage(msg.id)}
                            aria-label={`Unsend message`}
                            title="Unsend message"
                          >
                            <Trash2 size={13} aria-hidden="true" />
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <form className="palak-inline-chat-composer" onSubmit={handleSendMessage}>
              <div className="palak-inline-chat-name">
                <label htmlFor="palak-inline-chat-name">Your name</label>
                <input
                  id="palak-inline-chat-name"
                  type="text"
                  value={chatName}
                  onChange={(e) => setChatName(e.target.value.slice(0, 32))}
                  placeholder="What should they call you?"
                  maxLength={32}
                  autoComplete="nickname"
                  data-testid="input-inline-chat-name"
                />
                <span>{storedName ? 'saved for next time' : 'only shown in this chat'}</span>
              </div>

              <div className="palak-inline-chat-compose">
                <label className="palak-inline-chat-sr-only" htmlFor="palak-inline-chat-message">
                  Write a message
                </label>
                <textarea
                  id="palak-inline-chat-message"
                  value={chatContent}
                  onChange={(e) => setChatContent(e.target.value.slice(0, 1000))}
                  placeholder="Write something sweet..."
                  rows={1}
                  maxLength={1000}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  data-testid="input-inline-chat-message"
                />
                <button
                  type="submit"
                  disabled={!isFormValid}
                  aria-label="Send message"
                  data-testid="button-inline-chat-send"
                >
                  <Send size={16} aria-hidden="true" />
                </button>
              </div>

              <div className="palak-inline-chat-foot">
                <span>Enter to send · Shift + Enter for a new line</span>
                <span>{chatContent.length}/1000</span>
              </div>
            </form>
          </section>
        )}
      </main>

      {/* Floating Choices Summary Popover Modal */}
      {showNotifyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowNotifyModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl relative"
            style={{
              background: 'rgba(255, 252, 248, 0.88)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1.5px solid rgba(255, 255, 255, 0.9)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-rose-100">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-pink-600" />
                <h3 className="text-base font-bold text-slate-800">What She Chose 💖</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNotifyModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-2.5 text-xs text-slate-700">
              <div className="p-3 rounded-xl bg-white/70 border border-rose-100/60">
                <p className="font-semibold text-rose-700">Status: She Said YES! ♥</p>
                <p className="mt-1">
                  <strong>Date:</strong> {selectedDate || 'Pending pick'}
                </p>
                <p>
                  <strong>Time:</strong> {selectedTime || 'Pending pick'}
                </p>
                <p>
                  <strong>Meal / Vibe:</strong> {selectedMeal || 'Pending pick'}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleNotifyWhatsApp}
                className="w-full py-2.5 px-4 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
              >
                <MessageCircle size={15} />
                <span>Notify Arvind on WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={handleNotifyEmail}
                className="w-full py-2.5 px-4 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-2 bg-rose-400 hover:bg-rose-500 shadow-sm"
              >
                <Mail size={15} />
                <span>Email to Arvind</span>
              </button>
              <button
                type="button"
                onClick={handleCopyNotification}
                className="w-full py-2 px-4 rounded-xl text-slate-700 bg-white/80 hover:bg-white text-xs font-semibold flex items-center justify-center gap-2 border border-rose-200"
              >
                <Copy size={14} />
                <span>{notificationCopied ? 'Copied to Clipboard! ♥' : 'Copy Summary'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
