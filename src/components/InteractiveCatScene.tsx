import React, { useEffect, useRef } from 'react';

export const InteractiveCatScene: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse tracking with smooth lerp
    let mouse = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
      isNearCat: false,
    };

    // Blink state
    let blinkProgress = 0; // 0 = open, 1 = closed
    let isBlinking = false;
    let nextBlinkTime = performance.now() + 3000;

    // Ear twitch state
    let leftEarTwitch = 0;
    let rightEarTwitch = 0;
    let nextEarTwitch = performance.now() + 2500;

    // Water ripple ripples list
    interface Ripple {
      x: number;
      y: number;
      radius: number;
      alpha: number;
      speed: number;
    }
    const ripples: Ripple[] = [];

    // Distant birds
    interface Bird {
      x: number;
      y: number;
      speed: number;
      wingPhase: number;
      size: number;
    }
    const birds: Bird[] = [
      { x: 100, y: height * 0.22, speed: 1.2, wingPhase: 0, size: 7 },
      { x: 140, y: height * 0.20, speed: 1.15, wingPhase: 1.5, size: 5 },
      { x: 170, y: height * 0.23, speed: 1.25, wingPhase: 3, size: 6 },
    ];

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.width = window.innerWidth * dpr;
      height = canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouse.targetX = e.touches[0].clientX;
        mouse.targetY = e.touches[0].clientY;
      }
    };

    const handleClick = (e: MouseEvent) => {
      // Add a water ripple where clicked
      ripples.push({
        x: e.clientX,
        y: Math.max(e.clientY, window.innerHeight * 0.55),
        radius: 4,
        alpha: 0.8,
        speed: 1.5,
      });

      // Quick ear flick on click
      leftEarTwitch = 0.2;
      rightEarTwitch = -0.15;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('click', handleClick);

    // Initial boat position (centered horizontally, lower third of screen)
    const render = (time: number) => {
      const t = time * 0.001; // seconds

      // Screen dimensions in CSS pixels
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;

      // Smooth mouse follow
      mouse.x += (mouse.targetX - mouse.x) * 0.075;
      mouse.y += (mouse.targetY - mouse.y) * 0.075;

      // Cat center position
      const catBaseX = screenW * 0.5;
      const catBaseY = screenH * 0.72;

      // Distance to cat
      const distToCat = Math.hypot(mouse.x - catBaseX, mouse.y - (catBaseY - 140));
      mouse.isNearCat = distToCat < 180;

      // Handle blinks
      if (time > nextBlinkTime && !isBlinking) {
        isBlinking = true;
        blinkProgress = 0;
      }
      if (isBlinking) {
        blinkProgress += 0.14;
        if (blinkProgress >= 1) {
          isBlinking = false;
          blinkProgress = 0;
          nextBlinkTime = time + 3500 + Math.random() * 3500;
        }
      }

      // Handle ear twitches
      if (time > nextEarTwitch) {
        if (Math.random() > 0.5) leftEarTwitch = 0.25;
        else rightEarTwitch = -0.25;
        nextEarTwitch = time + 2000 + Math.random() * 3000;
      }
      leftEarTwitch *= 0.88;
      rightEarTwitch *= 0.88;

      // Clear canvas
      ctx.clearRect(0, 0, screenW, screenH);

      // 1. SKY GRADIENT (Atmospheric sunrise/afternoon from Flow)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, screenH * 0.65);
      skyGrad.addColorStop(0, '#537895');
      skyGrad.addColorStop(0.35, '#82a4b8');
      skyGrad.addColorStop(0.7, '#d2b9aa');
      skyGrad.addColorStop(1, '#e8cfc2');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, screenW, screenH);

      // Atmospheric Golden Sun Glow
      const sunX = screenW * 0.68;
      const sunY = screenH * 0.32;
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 380);
      sunGrad.addColorStop(0, 'rgba(255, 245, 220, 0.55)');
      sunGrad.addColorStop(0.2, 'rgba(255, 230, 190, 0.35)');
      sunGrad.addColorStop(0.5, 'rgba(240, 200, 180, 0.12)');
      sunGrad.addColorStop(1, 'rgba(240, 200, 180, 0)');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, screenW, screenH);

      // Soft light rays shining through mist
      ctx.save();
      ctx.fillStyle = 'rgba(255, 250, 235, 0.04)';
      for (let i = 0; i < 5; i++) {
        const rayAngle = -0.4 + i * 0.18 + Math.sin(t * 0.3 + i) * 0.02;
        ctx.beginPath();
        ctx.moveTo(sunX, sunY);
        ctx.lineTo(sunX + Math.cos(rayAngle) * 900, sunY + Math.sin(rayAngle) * 900);
        ctx.lineTo(sunX + Math.cos(rayAngle + 0.12) * 900, sunY + Math.sin(rayAngle + 0.12) * 900);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Distant Birds Flying
      birds.forEach((bird) => {
        bird.x += bird.speed;
        if (bird.x > screenW + 80) bird.x = -80;
        bird.wingPhase += 0.18;
        const wingY = Math.sin(bird.wingPhase) * (bird.size * 0.6);

        ctx.strokeStyle = 'rgba(80, 70, 85, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        // Left wing
        ctx.moveTo(bird.x - bird.size, bird.y + wingY);
        ctx.quadraticCurveTo(bird.x - bird.size * 0.5, bird.y - bird.size * 0.4, bird.x, bird.y);
        // Right wing
        ctx.quadraticCurveTo(bird.x + bird.size * 0.5, bird.y - bird.size * 0.4, bird.x + bird.size, bird.y + wingY);
        ctx.stroke();
      });

      // 2. DISTANT FLOODED ANCIENT CITY / SPIRES (Silhouettes from Flow movie)
      const waterHorizonY = screenH * 0.52;
      ctx.save();
      ctx.fillStyle = 'rgba(92, 115, 128, 0.4)';

      // Spires and sunken stone towers
      const drawSpire = (x: number, y: number, w: number, h: number, isArch = false) => {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - h);
        ctx.lineTo(x + w * 0.5, y - h - w * 0.8); // Peak
        ctx.lineTo(x + w, y - h);
        ctx.lineTo(x + w, y);
        ctx.closePath();
        ctx.fill();

        if (isArch) {
          // Arch cutout
          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath();
          ctx.arc(x + w * 0.5, y - h * 0.35, w * 0.28, Math.PI, 0);
          ctx.lineTo(x + w * 0.78, y);
          ctx.lineTo(x + w * 0.22, y);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      };

      // Background architecture
      drawSpire(screenW * 0.12, waterHorizonY, 46, 120, true);
      drawSpire(screenW * 0.22, waterHorizonY, 28, 160);
      drawSpire(screenW * 0.34, waterHorizonY, 38, 95);
      drawSpire(screenW * 0.65, waterHorizonY, 52, 145, true);
      drawSpire(screenW * 0.78, waterHorizonY, 32, 110);
      drawSpire(screenW * 0.88, waterHorizonY, 44, 85);

      // Lush distant overgrown trees on submerged hills
      ctx.fillStyle = 'rgba(74, 98, 105, 0.45)';
      ctx.beginPath();
      ctx.arc(screenW * 0.08, waterHorizonY + 10, 80, Math.PI, 0);
      ctx.arc(screenW * 0.26, waterHorizonY + 12, 60, Math.PI, 0);
      ctx.arc(screenW * 0.60, waterHorizonY + 14, 75, Math.PI, 0);
      ctx.arc(screenW * 0.92, waterHorizonY + 15, 95, Math.PI, 0);
      ctx.fill();
      ctx.restore();

      // 3. CALM FLOWING WATER WITH CAUSTICS & REFLECTIONS
      const waterGrad = ctx.createLinearGradient(0, waterHorizonY, 0, screenH);
      waterGrad.addColorStop(0, '#5a828e');
      waterGrad.addColorStop(0.3, '#3f6775');
      waterGrad.addColorStop(0.7, '#2c4f5c');
      waterGrad.addColorStop(1, '#1b3742');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, waterHorizonY, screenW, screenH - waterHorizonY);

      // Shimmering Golden Water Reflection of Sun
      const waterSunGrad = ctx.createLinearGradient(sunX - 120, 0, sunX + 120, 0);
      waterSunGrad.addColorStop(0, 'rgba(255, 235, 190, 0)');
      waterSunGrad.addColorStop(0.5, 'rgba(255, 235, 190, 0.28)');
      waterSunGrad.addColorStop(1, 'rgba(255, 235, 190, 0)');
      ctx.fillStyle = waterSunGrad;
      ctx.fillRect(sunX - 160, waterHorizonY, 320, screenH - waterHorizonY);

      // Subtle Ambient Water Waves & Light Streaks
      ctx.save();
      for (let j = 0; j < 8; j++) {
        const waveY = waterHorizonY + (j + 1) * ((screenH - waterHorizonY) / 9);
        const waveSpeed = t * (0.8 + j * 0.12);
        const amplitude = 2.5 + j * 0.8;

        ctx.strokeStyle = `rgba(240, 248, 255, ${0.12 + j * 0.025})`;
        ctx.lineWidth = 1 + j * 0.35;
        ctx.beginPath();
        for (let x = 0; x <= screenW; x += 30) {
          const yOffset = Math.sin(x * 0.015 + waveSpeed) * amplitude;
          if (x === 0) ctx.moveTo(x, waveY + yOffset);
          else ctx.lineTo(x, waveY + yOffset);
        }
        ctx.stroke();
      }
      ctx.restore();

      // Render custom click ripples
      for (let r = ripples.length - 1; r >= 0; r--) {
        const rp = ripples[r];
        rp.radius += rp.speed;
        rp.alpha -= 0.012;
        if (rp.alpha <= 0) {
          ripples.splice(r, 1);
          continue;
        }
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${rp.alpha * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(rp.x, rp.y, rp.radius * 2, rp.radius * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 4. THE BOAT & DOCK (Floating & Bobbing Physics)
      // Heave & Pitch based on water movement
      const boatHeave = Math.sin(t * 1.5) * 6.5;
      const boatPitch = Math.sin(t * 1.2 + 0.5) * 0.038; // Radians

      const boatCenterY = catBaseY + 45 + boatHeave;
      const boatWidth = Math.min(screenW * 0.68, 560);
      const boatHeight = 78;

      ctx.save();
      ctx.translate(catBaseX, boatCenterY);
      ctx.rotate(boatPitch);

      // Boat Shadow / Water contact
      ctx.save();
      ctx.fillStyle = 'rgba(10, 25, 35, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, boatHeight * 0.42, boatWidth * 0.48, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Wooden Boat Hull
      ctx.beginPath();
      ctx.moveTo(-boatWidth * 0.48, -boatHeight * 0.3); // Bow left
      ctx.quadraticCurveTo(-boatWidth * 0.44, boatHeight * 0.4, 0, boatHeight * 0.48); // Bottom keel
      ctx.quadraticCurveTo(boatWidth * 0.44, boatHeight * 0.4, boatWidth * 0.48, -boatHeight * 0.3); // Stern right
      ctx.quadraticCurveTo(0, -boatHeight * 0.05, -boatWidth * 0.48, -boatHeight * 0.3); // Top gunwale curve
      ctx.closePath();

      // Wood plank gradient
      const hullGrad = ctx.createLinearGradient(0, -boatHeight * 0.3, 0, boatHeight * 0.5);
      hullGrad.addColorStop(0, '#8c5838');
      hullGrad.addColorStop(0.3, '#6f4228');
      hullGrad.addColorStop(0.7, '#4e2d19');
      hullGrad.addColorStop(1, '#2c160b');
      ctx.fillStyle = hullGrad;
      ctx.fill();

      // Wood plank lines
      ctx.strokeStyle = 'rgba(35, 18, 10, 0.5)';
      ctx.lineWidth = 1.8;
      for (let p = -1; p <= 2; p++) {
        ctx.beginPath();
        const py = p * 14;
        ctx.moveTo(-boatWidth * 0.45, py);
        ctx.quadraticCurveTo(0, py + 12, boatWidth * 0.45, py);
        ctx.stroke();
      }

      // Boat Rim / Gunwale trim highlight
      ctx.strokeStyle = '#c48b5c';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-boatWidth * 0.49, -boatHeight * 0.3);
      ctx.quadraticCurveTo(0, -boatHeight * 0.05, boatWidth * 0.49, -boatHeight * 0.3);
      ctx.stroke();

      // Boat details: ropes, deck planking, mast stub
      ctx.fillStyle = '#4a2c1b';
      ctx.fillRect(-22, -boatHeight * 0.35, 44, 8); // Bench thwart

      ctx.restore(); // Exit boat coordinate space

      // 5. THE BLACK CAT (from FLOW) SITTING ON THE BOW
      // The cat is perched gracefully, breathing, with its head & eyes tracking the cursor!
      const catX = catBaseX;
      const catY = boatCenterY - 18 + boatPitch * 40; // Follows boat motion
      const breathing = Math.sin(t * 2.2) * 1.5;

      ctx.save();
      ctx.translate(catX, catY);
      ctx.rotate(boatPitch * 0.8);

      // Cat Shadow on Boat Deck
      ctx.fillStyle = 'rgba(20, 10, 10, 0.5)';
      ctx.beginPath();
      ctx.ellipse(0, 12, 42, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cat Tail swaying smoothly behind
      const tailSway = Math.sin(t * 1.4) * 14;
      ctx.save();
      ctx.strokeStyle = '#18181c';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(26, -10);
      ctx.bezierCurveTo(46, -15, 52 + tailSway, 8, 48 + tailSway * 1.3, -25);
      ctx.stroke();
      ctx.restore();

      // Cat Body (Sleek upright posture)
      ctx.save();
      const bodyGrad = ctx.createLinearGradient(-35, -120, 35, 10);
      bodyGrad.addColorStop(0, '#242429'); // Rim light from sky
      bodyGrad.addColorStop(0.3, '#19191d');
      bodyGrad.addColorStop(1, '#0e0e11');
      ctx.fillStyle = bodyGrad;

      // Body silhouette
      ctx.beginPath();
      // Bottom / Paws
      ctx.ellipse(0, 0 + breathing * 0.3, 34, 18, 0, 0, Math.PI); // Base
      // Right flank to shoulder
      ctx.quadraticCurveTo(34, -40, 22, -90 + breathing);
      // Neck to back
      ctx.quadraticCurveTo(10, -115 + breathing, 0, -115 + breathing);
      // Left shoulder to flank
      ctx.quadraticCurveTo(-10, -115 + breathing, -22, -90 + breathing);
      ctx.quadraticCurveTo(-34, -40, -34, 0 + breathing * 0.3);
      ctx.closePath();
      ctx.fill();

      // Front paws together
      ctx.fillStyle = '#141417';
      ctx.beginPath();
      ctx.ellipse(-10, 10, 9, 7, 0, 0, Math.PI * 2);
      ctx.ellipse(10, 10, 9, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Paw divider claws
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-10, 7);
      ctx.lineTo(-10, 15);
      ctx.moveTo(10, 7);
      ctx.lineTo(10, 15);
      ctx.stroke();
      ctx.restore();

      // 6. CAT HEAD & GAZE TRACKING (Rotates & tilts toward mouse)
      const headBaseY = -120 + breathing;

      // Calculate gaze angle towards mouse
      const dxToMouse = mouse.x - catX;
      const dyToMouse = mouse.y - (catY + headBaseY);

      // Max head turn angles
      const maxHeadTurn = 0.45; // Radians
      const headTurnAngle = Math.max(-maxHeadTurn, Math.min(maxHeadTurn, dxToMouse * 0.00075));
      const headTiltY = Math.max(-7, Math.min(7, dyToMouse * 0.012));

      ctx.save();
      ctx.translate(0, headBaseY + headTiltY);
      ctx.rotate(headTurnAngle);

      // EARS
      // Left Ear
      ctx.save();
      ctx.translate(-22, -24);
      ctx.rotate(leftEarTwitch - 0.08);
      ctx.fillStyle = '#1c1c20';
      ctx.beginPath();
      ctx.moveTo(-12, 10);
      ctx.lineTo(-6, -26); // Ear tip
      ctx.lineTo(12, 4);
      ctx.closePath();
      ctx.fill();

      // Left Inner Ear (Warm dusky rose)
      ctx.fillStyle = '#48333c';
      ctx.beginPath();
      ctx.moveTo(-8, 6);
      ctx.lineTo(-4, -20);
      ctx.lineTo(8, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Right Ear
      ctx.save();
      ctx.translate(22, -24);
      ctx.rotate(rightEarTwitch + 0.08);
      ctx.fillStyle = '#1c1c20';
      ctx.beginPath();
      ctx.moveTo(12, 10);
      ctx.lineTo(6, -26); // Ear tip
      ctx.lineTo(-12, 4);
      ctx.closePath();
      ctx.fill();

      // Right Inner Ear
      ctx.fillStyle = '#48333c';
      ctx.beginPath();
      ctx.moveTo(8, 6);
      ctx.lineTo(4, -20);
      ctx.lineTo(-8, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // HEAD MAIN SHAPE
      const headGrad = ctx.createRadialGradient(-6, -10, 4, 0, 0, 38);
      headGrad.addColorStop(0, '#26262c');
      headGrad.addColorStop(0.65, '#17171a');
      headGrad.addColorStop(1, '#0e0e11');
      ctx.fillStyle = headGrad;

      ctx.beginPath();
      ctx.ellipse(0, -4, 30, 26, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cheek fluff contours
      ctx.beginPath();
      ctx.moveTo(-28, -2);
      ctx.lineTo(-34, 4);
      ctx.lineTo(-26, 8);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(28, -2);
      ctx.lineTo(34, 4);
      ctx.lineTo(26, 8);
      ctx.closePath();
      ctx.fill();

      // Cute Little Black Cat Nose
      ctx.fillStyle = '#2d252a';
      ctx.beginPath();
      ctx.moveTo(-3.5, 4);
      ctx.lineTo(3.5, 4);
      ctx.lineTo(0, 7.5);
      ctx.closePath();
      ctx.fill();

      // Mouth line
      ctx.strokeStyle = '#1a181a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, 7.5);
      ctx.lineTo(0, 10);
      ctx.moveTo(-4, 12);
      ctx.quadraticCurveTo(0, 10.5, 4, 12);
      ctx.stroke();

      // Fine Whiskers
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 0.8;
      // Left whiskers
      ctx.beginPath();
      ctx.moveTo(-12, 7);
      ctx.lineTo(-44, 2);
      ctx.moveTo(-12, 8);
      ctx.lineTo(-46, 9);
      ctx.moveTo(-12, 10);
      ctx.lineTo(-42, 16);
      // Right whiskers
      ctx.moveTo(12, 7);
      ctx.lineTo(44, 2);
      ctx.moveTo(12, 8);
      ctx.lineTo(46, 9);
      ctx.moveTo(12, 10);
      ctx.lineTo(42, 16);
      ctx.stroke();

      // 7. GLOWING AMBER EYES THAT FOLLOW THE CURSOR
      const eyeSpacing = 14;
      const eyeY = -6;
      const eyeRadiusX = 8.5;
      const eyeRadiusY = 10;

      // Calculate Pupil offset vector toward mouse
      const maxPupilOffset = 4.2;
      const pupilNormDist = Math.max(1, Math.hypot(dxToMouse, dyToMouse));
      const pupilOffsetX = Math.max(-maxPupilOffset, Math.min(maxPupilOffset, (dxToMouse / pupilNormDist) * 5));
      const pupilOffsetY = Math.max(-maxPupilOffset, Math.min(maxPupilOffset, (dyToMouse / pupilNormDist) * 4));

      // Pupil width: dilates when mouse is near!
      const pupilWidth = mouse.isNearCat ? 5.2 : 3.4;

      const drawEye = (xPos: number) => {
        ctx.save();
        ctx.translate(xPos, eyeY);

        // Clip eye shape to eyelids for natural blinking
        ctx.beginPath();
        // Normal eye oval
        ctx.ellipse(0, 0, eyeRadiusX, eyeRadiusY, 0, 0, Math.PI * 2);
        ctx.clip();

        // Eye Sclera / Golden Amber Iris (Gradient)
        const eyeGrad = ctx.createRadialGradient(-1, -1, 1, 0, 0, eyeRadiusX);
        eyeGrad.addColorStop(0, '#ffec8b');
        eyeGrad.addColorStop(0.45, '#f59e0b');
        eyeGrad.addColorStop(0.85, '#d97706');
        eyeGrad.addColorStop(1, '#92400e');
        ctx.fillStyle = eyeGrad;
        ctx.fillRect(-eyeRadiusX - 2, -eyeRadiusY - 2, (eyeRadiusX + 2) * 2, (eyeRadiusY + 2) * 2);

        // Subtle dark limbal ring
        ctx.strokeStyle = '#3d1a04';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // PUPIL (Tracks the cursor coordinates directly!)
        ctx.fillStyle = '#050507';
        ctx.beginPath();
        ctx.ellipse(pupilOffsetX, pupilOffsetY, pupilWidth * 0.5, 7.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Specular Eye Highlights (Catchlights reflecting the sky)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.arc(pupilOffsetX - 2, pupilOffsetY - 2.5, 1.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(pupilOffsetX + 1.8, pupilOffsetY + 2.2, 1.1, 0, Math.PI * 2);
        ctx.fill();

        // BLINKING EYELID OVERLAY
        if (blinkProgress > 0) {
          const currentBlink = Math.sin(blinkProgress * Math.PI); // 0 -> 1 -> 0
          ctx.fillStyle = '#121215';
          ctx.beginPath();
          // Draw eyelid lowering from top
          const lidY = -eyeRadiusY + currentBlink * (eyeRadiusY * 2.1);
          ctx.rect(-eyeRadiusX - 2, -eyeRadiusY - 2, (eyeRadiusX + 2) * 2, lidY + eyeRadiusY + 2);
          ctx.fill();

          // Eyelash crease line
          ctx.strokeStyle = '#050507';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(-eyeRadiusX, lidY);
          ctx.quadraticCurveTo(0, lidY + 1.5, eyeRadiusX, lidY);
          ctx.stroke();
        }

        ctx.restore();
      };

      // Draw Left & Right Eyes
      drawEye(-eyeSpacing);
      drawEye(eyeSpacing);

      ctx.restore(); // Exit head
      ctx.restore(); // Exit cat

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none -z-30 select-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{
          imageRendering: 'auto',
        }}
      />
    </div>
  );
};
