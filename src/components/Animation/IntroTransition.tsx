import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface IntroTransitionProps {
  isVisible: boolean;
  onComplete: () => void;
}

const IntroTransition = ({ isVisible, onComplete }: IntroTransitionProps) => {
  const [show, setShow] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [particles, setParticles] = useState<{ id: number; angle: number }[]>([]);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      const particleArray = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        angle: (i * 360) / 12,
      }));
      setParticles(particleArray);

      // After intro animation plays, call onComplete (navigates while overlay is opaque)
      const timer = setTimeout(() => onComplete(), 2400);
      return () => clearTimeout(timer);
    } else {
      // Parent set isVisible=false → trigger exit fade-out
      setShow(false);
    }
  }, [isVisible]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple = { id: Date.now(), x, y };
    setRipples((prev) => [...prev, newRipple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 1000);
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    onComplete();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro-overlay"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={styles.overlay}
          onClick={handleClick}
        >
          {/* Animated background gradient */}
          <motion.div
            style={styles.backgroundGradient}
            animate={{
              background: [
                'radial-gradient(circle at 30% 30%, rgba(16, 185, 129, 0.15) 0%, transparent 50%)',
                'radial-gradient(circle at 70% 70%, rgba(16, 185, 129, 0.15) 0%, transparent 50%)',
                'radial-gradient(circle at 30% 30%, rgba(16, 185, 129, 0.15) 0%, transparent 50%)',
              ],
            }}
            transition={{ duration: 4, repeat: Infinity }}
          />

          {/* Ripple effects */}
          {ripples.map((ripple) => (
            <motion.div
              key={ripple.id}
              style={{
                position: 'absolute',
                left: ripple.x,
                top: ripple.y,
                width: 100,
                height: 100,
                borderRadius: '50%',
                border: '2px solid rgba(16, 185, 129, 0.6)',
                pointerEvents: 'none',
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ scale: 0, opacity: 0.6 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          ))}

          <motion.div style={styles.content}>
            {/* Logo Container */}
            <motion.div
              style={styles.logoWrapper}
              onHoverStart={() => setIsHovered(true)}
              onHoverEnd={() => setIsHovered(false)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Orbiting particles */}
              {particles.map((particle) => (
                <motion.div
                  key={particle.id}
                  style={{
                    position: 'absolute',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    boxShadow: '0 0 10px #10b981',
                  }}
                  animate={{
                    x: [
                      Math.cos((particle.angle * Math.PI) / 180) * 70,
                      Math.cos(((particle.angle + 360) * Math.PI) / 180) * 70,
                    ],
                    y: [
                      Math.sin((particle.angle * Math.PI) / 180) * 70,
                      Math.sin(((particle.angle + 360) * Math.PI) / 180) * 70,
                    ],
                    opacity: [0.3, 1, 0.3],
                    scale: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: particle.id * 0.15,
                    ease: 'linear',
                  }}
                />
              ))}

              {/* Pulsing rings */}
              <motion.div
                style={styles.pulseRing}
                animate={{
                  scale: [1, 1.5],
                  opacity: [0.5, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
              />
              <motion.div
                style={styles.pulseRing}
                animate={{
                  scale: [1, 1.5],
                  opacity: [0.5, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeOut',
                  delay: 0.5,
                }}
              />

              {/* Main Logo Circle */}
              <motion.div
                style={styles.logoOuter}
                initial={{ scale: 0, rotate: -180 }}
                animate={{
                  scale: 1,
                  rotate: 0,
                  boxShadow: isHovered
                    ? '0 0 60px rgba(16, 185, 129, 0.8)'
                    : '0 0 30px rgba(16, 185, 129, 0.4)',
                }}
                transition={{
                  duration: 0.8,
                  ease: 'easeOut',
                  boxShadow: { duration: 0.3 },
                }}
              >
                {/* Inner rotating design */}
                <motion.div
                  style={styles.logoInner}
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                >
                  {/* Leaf/Plant design */}
                  <motion.svg
                    width="50"
                    height="50"
                    viewBox="0 0 50 50"
                    style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                  >
                    <motion.path
                      d="M25 5 C25 5, 40 15, 40 30 C40 40, 32 45, 25 45 C18 45, 10 40, 10 30 C10 15, 25 5, 25 5"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.5, ease: 'easeInOut' }}
                    />
                    <motion.path
                      d="M25 15 L25 40"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 0.5, ease: 'easeInOut' }}
                    />
                    <motion.path
                      d="M25 22 C20 22, 15 18, 15 18"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: 1, ease: 'easeInOut' }}
                    />
                    <motion.path
                      d="M25 28 C30 28, 35 24, 35 24"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: 1.2, ease: 'easeInOut' }}
                    />
                  </motion.svg>
                </motion.div>

                {/* Center dot */}
                <motion.div
                  style={styles.centerDot}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </motion.div>
            </motion.div>

            {/* Brand text with letter animation */}
            <motion.div style={styles.textContainer}>
              {['A', 'N', 'N', 'A', 'M'].map((letter, index) => (
                <motion.span
                  key={index}
                  style={styles.text}
                  initial={{ opacity: 0, y: 30, scale: 0 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  whileHover={{
                    scale: 1.3,
                    color: '#10b981',
                    textShadow: '0 0 20px rgba(16, 185, 129, 0.8)',
                  }}
                  transition={{
                    duration: 0.5,
                    delay: 0.8 + index * 0.1,
                    ease: 'backOut',
                  }}
                >
                  {letter}
                </motion.span>
              ))}
            </motion.div>

            {/* Tagline */}
            <motion.p
              style={styles.tagline}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.8, y: 0 }}
              transition={{ duration: 0.8, delay: 1.5 }}
            >
              Experience Excellence
            </motion.p>

            {/* Progress bar */}
            <motion.div style={styles.progressContainer}>
              <motion.div
                style={styles.progressBar}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2.5, ease: 'linear' }}
              />
            </motion.div>
          </motion.div>

          {/* Skip button */}
          <motion.button
            style={styles.skipButton}
            onClick={handleSkip}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.7, y: 0 }}
            whileHover={{
              opacity: 1,
              scale: 1.05,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            }}
            whileTap={{ scale: 0.95 }}
            transition={{ delay: 0.8 }}
          >
            Skip Intro →
          </motion.button>

          {/* Interactive hint */}
          <motion.div
            style={styles.hint}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{ duration: 3, delay: 1.5 }}
          >
            Click anywhere to create ripples ✨
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#064e3b',
    cursor: 'pointer',
    overflow: 'hidden',
  },
  backgroundGradient: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
  },
  content: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
    zIndex: 1,
  },
  logoWrapper: {
    position: 'relative',
    width: 150,
    height: 150,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  pulseRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: '50%',
    border: '2px solid rgba(16, 185, 129, 0.5)',
    pointerEvents: 'none',
  },
  logoOuter: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '3px solid rgba(255, 255, 255, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backdropFilter: 'blur(10px)',
  },
  logoInner: {
    width: '100%',
    height: '100%',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: '#10b981',
    boxShadow: '0 0 15px #10b981',
  },
  textContainer: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '1rem',
  },
  text: {
    color: '#ffffff',
    fontSize: '2rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    userSelect: 'none',
    cursor: 'pointer',
    fontFamily: 'system-ui, sans-serif',
  },
  tagline: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.9rem',
    fontWeight: 300,
    letterSpacing: '0.3em',
    textTransform: 'uppercase',
    userSelect: 'none',
  },
  progressContainer: {
    width: 200,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: '1.5rem',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10b981',
    boxShadow: '0 0 10px rgba(16, 185, 129, 0.8)',
    borderRadius: 3,
  },
  skipButton: {
    position: 'absolute',
    bottom: '2rem',
    right: '2rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '2rem',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    backdropFilter: 'blur(10px)',
    zIndex: 2,
    outline: 'none',
  },
  hint: {
    position: 'absolute',
    bottom: '2rem',
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '0.85rem',
    fontWeight: 300,
    letterSpacing: '0.1em',
    userSelect: 'none',
  },
};

export default IntroTransition;