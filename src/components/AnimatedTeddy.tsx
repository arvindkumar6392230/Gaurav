import React, { useEffect, useRef, useState, useCallback } from 'react';

interface FloatingEmote {
  id: number;
  x: number;
  y: number;
  icon: string;
}

export const AnimatedTeddy: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const headGroupRef = useRef<HTMLDivElement>(null);
  const leftEarRef = useRef<HTMLDivElement>(null);
  const rightEarRef = useRef<HTMLDivElement>(null);
  const leftPupilRef = useRef<HTMLDivElement>(null);
  const rightPupilRef = useRef<HTMLDivElement>(null);

  const [isBlinking, setIsBlinking] = useState(false);
  const [isWinking, setIsWinking] = useState(false);
  const [blushOpacity, setBlushOpacity] = useState(0.4);
  const [emotes, setEmotes] = useState<FloatingEmote[]>([]);
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Play pleasant soft chime on tap
  const playCuteChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.14); // G5
      osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.25); // C6

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.38);
    } catch {
      // Audio may be blocked until user gesture, safely ignore
    }
  }, []);

  // Smooth Cursor & Touch Tracking Physics Loop
  useEffect(() => {
    let animId: number;

    let targetRotY = 0;
    let targetRotX = 0;
    let targetRotZ = 0;
    let targetTransX = 0;
    let targetTransY = 0;
    let targetPupilX = 0;
    let targetPupilY = 0;
    let targetEarLag = 0;
    let targetBlush = 0.4;

    let currentRotY = 0;
    let currentRotX = 0;
    let currentRotZ = 0;
    let currentTransX = 0;
    let currentTransY = 0;
    let currentPupilX = 0;
    let currentPupilY = 0;
    let currentEarLag = 0;
    let currentBlush = 0.4;

    const handlePointerMove = (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const teddyCenterX = rect.left + rect.width / 2;
      const teddyCenterY = rect.top + rect.height * 0.42; // Center of teddy's face

      const dx = clientX - teddyCenterX;
      const dy = clientY - teddyCenterY;
      const dist = Math.hypot(dx, dy);

      const halfW = Math.max(window.innerWidth / 2, 320);
      const halfH = Math.max(window.innerHeight / 2, 320);
      const normX = Math.max(-1, Math.min(1, dx / halfW));
      const normY = Math.max(-1, Math.min(1, dy / halfH));

      // Neck turning angles: smooth 3D rotation towards cursor
      targetRotY = normX * 24; // up to ±24 degrees neck rotation left/right
      targetRotX = -normY * 16; // up to ±16 degrees pitch tilt up/down
      targetRotZ = normX * 5.5; // natural cute head tilt
      targetTransX = normX * 6; // parallax shift
      targetTransY = normY * 4;

      // Pupil offset inside eye sockets (up to ±5px)
      targetPupilX = normX * 4.8;
      targetPupilY = normY * 3.8;

      // Soft ear wiggle lag
      targetEarLag = -normX * 8;

      // Blush glow when cursor gets close (within 280px)
      const proximity = Math.max(0, 1 - dist / 300);
      targetBlush = 0.35 + proximity * 0.65;
    };

    const onMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    const lerp = (curr: number, targ: number, speed: number) => curr + (targ - curr) * speed;

    const startTime = performance.now();

    const loop = (time: number) => {
      const elapsed = time - startTime;

      // Gentle natural breathing cycle (subtle vertical rise and fall)
      const breath = Math.sin(elapsed * 0.0024) * 1.6;

      // Spring lerp for butter-smooth movement
      currentRotY = lerp(currentRotY, targetRotY, 0.08);
      currentRotX = lerp(currentRotX, targetRotX, 0.08);
      currentRotZ = lerp(currentRotZ, targetRotZ, 0.08);
      currentTransX = lerp(currentTransX, targetTransX, 0.08);
      currentTransY = lerp(currentTransY, targetTransY, 0.08);
      currentPupilX = lerp(currentPupilX, targetPupilX, 0.12);
      currentPupilY = lerp(currentPupilY, targetPupilY, 0.12);
      currentEarLag = lerp(currentEarLag, targetEarLag, 0.06);
      currentBlush = lerp(currentBlush, targetBlush, 0.06);

      setBlushOpacity(+currentBlush.toFixed(3));

      // Apply 3D neck rotation and transform
      if (headGroupRef.current) {
        headGroupRef.current.style.transform = `
          perspective(900px)
          translate3d(${currentTransX.toFixed(2)}px, ${(currentTransY + breath).toFixed(2)}px, 0px)
          rotateY(${currentRotY.toFixed(2)}deg)
          rotateX(${currentRotX.toFixed(2)}deg)
          rotateZ(${currentRotZ.toFixed(2)}deg)
        `;
      }

      // Apply ears secondary motion
      if (leftEarRef.current) {
        leftEarRef.current.style.transform = `rotate(${(currentEarLag * 0.5).toFixed(1)}deg)`;
      }
      if (rightEarRef.current) {
        rightEarRef.current.style.transform = `rotate(${(-currentEarLag * 0.5).toFixed(1)}deg)`;
      }

      // Apply pupils offset
      if (leftPupilRef.current) {
        leftPupilRef.current.style.transform = `translate(${currentPupilX.toFixed(1)}px, ${currentPupilY.toFixed(1)}px)`;
      }
      if (rightPupilRef.current) {
        rightPupilRef.current.style.transform = `translate(${currentPupilX.toFixed(1)}px, ${currentPupilY.toFixed(1)}px)`;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  // Natural organic blinking cycle
  useEffect(() => {
    let blinkTimeout: NodeJS.Timeout;

    const scheduleBlink = () => {
      const delay = Math.random() * 2200 + 2600; // blink every 2.6s - 4.8s
      blinkTimeout = setTimeout(() => {
        setIsBlinking(true);

        setTimeout(() => {
          setIsBlinking(false);

          // 25% chance of an adorable double-blink
          if (Math.random() < 0.28) {
            setTimeout(() => {
              setIsBlinking(true);
              setTimeout(() => {
                setIsBlinking(false);
                scheduleBlink();
              }, 120);
            }, 140);
          } else {
            scheduleBlink();
          }
        }, 150);
      }, delay);
    };

    scheduleBlink();

    return () => clearTimeout(blinkTimeout);
  }, []);

  // Click interaction: happy bounce, wink, cute hearts, and playful sound
  const handleTeddyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    playCuteChime();

    // Trigger wink
    setIsWinking(true);
    setTimeout(() => setIsWinking(false), 450);

    // Pop speech bubble
    const quotes = [
      'You & Me Forever ♥',
      'Please say YES! 🥺💖',
      'I will love you forever! 🥰',
      'You are my universe! 🌌♥',
      'Happy date invite! ✨🧸',
    ];
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    setSpeechBubble(quote);

    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    speechTimeoutRef.current = setTimeout(() => {
      setSpeechBubble(null);
    }, 2400);

    // Spawn floating heart emote from click position
    const rect = e.currentTarget.getBoundingClientRect();
    const newEmote: FloatingEmote = {
      id: Date.now() + Math.random(),
      x: e.clientX - rect.left - 12,
      y: e.clientY - rect.top - 20,
      icon: ['💖', '💕', '✨', '🧸', '🥰'][Math.floor(Math.random() * 5)],
    };

    setEmotes((prev) => [...prev.slice(-6), newEmote]);

    setTimeout(() => {
      setEmotes((prev) => prev.filter((item) => item.id !== newEmote.id));
    }, 1800);
  };

  return (
    <div
      ref={containerRef}
      className="relative mx-auto select-none my-2 cursor-pointer group"
      style={{
        width: 'clamp(148px, 21vw, 195px)',
        height: 'clamp(160px, 25vw, 225px)',
      }}
      onClick={handleTeddyClick}
      title="Click the cute teddy! 🧸💖"
      role="button"
      tabIndex={0}
      aria-label="Adorable animated teddy bear tracking your cursor"
    >
      {/* Speech bubble popup */}
      {speechBubble && (
        <div
          className="absolute -top-10 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full text-xs font-bold text-rose-700 bg-white/95 shadow-lg border border-rose-200 whitespace-nowrap animate-bounce pointer-events-none"
          style={{ animationDuration: '0.8s' }}
        >
          {speechBubble}
          <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-2.5 h-2.5 bg-white rotate-45 border-r border-b border-rose-200" />
        </div>
      )}

      {/* Floating click hearts */}
      {emotes.map((em) => (
        <span
          key={em.id}
          className="absolute z-30 pointer-events-none text-lg animate-float-fade"
          style={{
            left: `${em.x}px`,
            top: `${em.y}px`,
          }}
        >
          {em.icon}
        </span>
      ))}

      {/* Outer framing card matching original website aesthetics */}
      <div
        className="relative w-full h-full rounded-[28px] overflow-hidden border-[5px] border-white shadow-[0_14px_28px_rgba(125,48,77,0.18)] bg-gradient-to-b from-[#fdf6ee] via-[#faefe3] to-[#f6e2d5] transition-all duration-300 group-hover:shadow-[0_18px_36px_rgba(225,29,72,0.25)] group-hover:border-rose-100 flex items-center justify-center p-2"
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Soft background glow */}
        <div className="absolute inset-0 bg-radial from-rose-100/40 via-transparent to-amber-100/30 pointer-events-none" />

        {/* CUTE ANIMATED TEDDY BEAR SCENE */}
        <div
          className="relative w-full h-full flex flex-col items-center justify-center"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* TEDDY HEAD & NECK LAYER (Pivoted at Neck Base for Smooth Neck Turns) */}
          <div
            ref={headGroupRef}
            className="relative z-20 flex flex-col items-center origin-[50%_90%] will-change-transform"
            style={{
              transformStyle: 'preserve-3d',
              transition: 'transform 0.04s cubic-bezier(0.2, 0.8, 0.4, 1)',
              width: '128px',
              height: '118px',
              marginTop: '4px',
            }}
          >
            {/* ROUND BEAR EARS */}
            <div className="absolute top-0 w-full flex justify-between px-2 pointer-events-none z-10">
              {/* Left Round Bear Ear */}
              <div
                ref={leftEarRef}
                className="w-9 h-9 rounded-full bg-[#c98e5e] border-2 border-[#b07445] shadow-sm flex items-center justify-center transition-transform duration-150"
              >
                {/* Inner Ear Pad */}
                <div className="w-5 h-5 rounded-full bg-[#f5b8c6] opacity-90 shadow-inner" />
              </div>

              {/* Right Round Bear Ear */}
              <div
                ref={rightEarRef}
                className="w-9 h-9 rounded-full bg-[#c98e5e] border-2 border-[#b07445] shadow-sm flex items-center justify-center transition-transform duration-150"
              >
                {/* Inner Ear Pad */}
                <div className="w-5 h-5 rounded-full bg-[#f5b8c6] opacity-90 shadow-inner" />
              </div>
            </div>

            {/* TEDDY MAIN HEAD */}
            <div
              className="relative z-20 w-[116px] h-[98px] mt-2.5 rounded-[48px] bg-gradient-to-b from-[#dda06d] via-[#d59664] to-[#c28453] border-2 border-[#b57745] shadow-[0_6px_14px_rgba(95,45,20,0.18)] flex flex-col items-center justify-center overflow-hidden"
            >
              {/* Soft forehead highlight */}
              <div className="absolute top-1 w-16 h-5 rounded-full bg-white/20 blur-[2px]" />

              {/* EYE LEVEL CONTAINER */}
              <div className="relative w-full flex justify-between px-6 mt-1 z-20">
                {/* LEFT EYE */}
                <div className="relative w-5 h-5 rounded-full bg-[#201511] shadow-[inset_0_1px_3px_rgba(0,0,0,0.8),0_1px_2px_rgba(255,255,255,0.4)] overflow-hidden flex items-center justify-center">
                  {/* Dynamic Pupil with Sparkles */}
                  <div
                    ref={leftPupilRef}
                    className="relative w-full h-full flex items-center justify-center will-change-transform"
                  >
                    {/* Big glossy catchlight sparkle */}
                    <div className="absolute top-0.5 right-1 w-2 h-2 rounded-full bg-white shadow-[0_0_2px_#fff]" />
                    {/* Small secondary twinkle */}
                    <div className="absolute bottom-1 left-1 w-1 h-1 rounded-full bg-white/80" />
                  </div>

                  {/* Left Eyelid Blink Layer */}
                  <div
                    className="absolute inset-0 bg-[#c98e5e] origin-top transition-transform duration-100 ease-in-out border-b border-[#a0683a]"
                    style={{
                      transform: isBlinking || isWinking ? 'scaleY(1)' : 'scaleY(0)',
                    }}
                  />
                </div>

                {/* RIGHT EYE */}
                <div className="relative w-5 h-5 rounded-full bg-[#201511] shadow-[inset_0_1px_3px_rgba(0,0,0,0.8),0_1px_2px_rgba(255,255,255,0.4)] overflow-hidden flex items-center justify-center">
                  {/* Dynamic Pupil with Sparkles */}
                  <div
                    ref={rightPupilRef}
                    className="relative w-full h-full flex items-center justify-center will-change-transform"
                  >
                    {/* Big glossy catchlight sparkle */}
                    <div className="absolute top-0.5 right-1 w-2 h-2 rounded-full bg-white shadow-[0_0_2px_#fff]" />
                    {/* Small secondary twinkle */}
                    <div className="absolute bottom-1 left-1 w-1 h-1 rounded-full bg-white/80" />
                  </div>

                  {/* Right Eyelid Blink Layer (stays open during wink) */}
                  <div
                    className="absolute inset-0 bg-[#c98e5e] origin-top transition-transform duration-100 ease-in-out border-b border-[#a0683a]"
                    style={{
                      transform: isBlinking && !isWinking ? 'scaleY(1)' : 'scaleY(0)',
                    }}
                  />
                </div>
              </div>

              {/* ROSY BLUSH CHEEKS */}
              <div className="absolute top-[42px] w-full flex justify-between px-3 pointer-events-none z-20">
                {/* Left Cheek */}
                <div
                  className="w-5 h-3 rounded-full bg-[#ff6b98] blur-[1px] transition-opacity duration-200"
                  style={{ opacity: blushOpacity }}
                />
                {/* Right Cheek */}
                <div
                  className="w-5 h-3 rounded-full bg-[#ff6b98] blur-[1px] transition-opacity duration-200"
                  style={{ opacity: blushOpacity }}
                />
              </div>

              {/* TEDDY SNOUT / MUZZLE */}
              <div className="relative z-30 -mt-1 w-12 h-9 rounded-[20px] bg-[#faedd9] border border-[#dfcaa9] shadow-sm flex flex-col items-center justify-center pt-0.5">
                {/* Cute Black Button Nose with Shine */}
                <div className="relative w-4 h-2.5 rounded-[8px] bg-[#221612] shadow-sm flex items-center justify-center">
                  <div className="absolute top-0.5 left-1 w-1.5 h-0.5 rounded-full bg-white/70" />
                </div>

                {/* Stitched Bear Smile */}
                <div className="flex flex-col items-center mt-0.5">
                  <div className="w-[1.5px] h-1.5 bg-[#543520]" />
                  <div className="w-4 h-1.5 border-b-2 border-[#543520] rounded-b-full -mt-0.5" />
                </div>
              </div>
            </div>
          </div>

          {/* TEDDY BODY & PAWS HOLDING A VALENTINE HEART */}
          <div
            className="relative z-10 -mt-3.5 flex flex-col items-center"
            style={{ width: '120px' }}
          >
            {/* Torso */}
            <div className="relative w-[88px] h-[52px] rounded-t-[32px] rounded-b-[24px] bg-gradient-to-b from-[#cf9362] to-[#b87c4d] border-2 border-[#ab7042] shadow-md flex items-center justify-center overflow-hidden">
              {/* Cream tummy patch */}
              <div className="w-12 h-9 rounded-full bg-[#faedd9] opacity-80 mt-1" />
            </div>

            {/* CUTE RED HEART HELD IN PAWS */}
            <div className="absolute top-1 z-30 flex items-center justify-center">
              {/* Left Teddy Paw */}
              <div className="w-5 h-5 rounded-full bg-[#dda06d] border border-[#b87c4d] shadow-sm -mr-1 z-40 transform rotate-12" />

              {/* Pulsing Love Heart */}
              <div
                className="relative mx-0.5 animate-pulse flex items-center justify-center"
                style={{ animationDuration: '2.2s' }}
              >
                <div className="w-7 h-7 bg-gradient-to-tr from-rose-600 via-rose-500 to-pink-400 rounded-full flex items-center justify-center shadow-lg border border-rose-300">
                  <span className="text-white text-xs font-bold leading-none select-none">♥</span>
                </div>
              </div>

              {/* Right Teddy Paw */}
              <div className="w-5 h-5 rounded-full bg-[#dda06d] border border-[#b87c4d] shadow-sm -ml-1 z-40 transform -rotate-12" />
            </div>
          </div>
        </div>

        {/* Delicate Corner Badge */}
        <div className="absolute bottom-2 right-2 z-20 w-5 h-5 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-[11px] text-rose-500 opacity-80 group-hover:opacity-100 transition-opacity">
          🧸
        </div>
      </div>
    </div>
  );
};

// Also export as AnimatedPuppy for backwards compatibility
export const AnimatedPuppy = AnimatedTeddy;
export default AnimatedTeddy;
