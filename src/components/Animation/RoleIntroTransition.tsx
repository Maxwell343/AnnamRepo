import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type Role = 'FARMER' | 'NGO' | 'DRIVER' | 'CUSTOMER';

interface RoleIntroTransitionProps {
  role: Role;
  isVisible: boolean;
  onComplete: () => void;
}

const roleConfig: Record<
  Role,
  {
    bg: string;
    gradient: string;
    title: string;
    icon: string;
    subtitle: string;
    particles: string[];
  }
> = {
  FARMER: {
    bg: '#b8860b',
    gradient: 'linear-gradient(135deg, #b8860b 0%, #8b6914 100%)',
    title: 'Farmer Portal',
    icon: '🌾',
    subtitle: 'Cultivating Growth',
    particles: ['🌱', '🌾', '🚜', '☀️'],
  },
  NGO: {
    bg: '#1e40af',
    gradient: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
    title: 'NGO Portal',
    icon: '🤝',
    subtitle: 'Making a Difference',
    particles: ['❤️', '🤝', '🌍', '⭐'],
  },
  DRIVER: {
    bg: '#c2410c',
    gradient: 'linear-gradient(135deg, #c2410c 0%, #9a3412 100%)',
    title: 'Driver Portal',
    icon: '🚚',
    subtitle: 'Delivering Success',
    particles: ['🚚', '📦', '🛣️', '⚡'],
  },
  CUSTOMER: {
    bg: '#7c3aed',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    title: 'Customer Portal',
    icon: '🛒',
    subtitle: 'Shop with Joy',
    particles: ['🛒', '🎁', '✨', '💚'],
  },
};

const RoleIntroTransition = ({ role, isVisible, onComplete }: RoleIntroTransitionProps) => {
  const [show, setShow] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [floatingParticles, setFloatingParticles] = useState<
    { id: number; x: number; y: number; icon: string; delay: number }[]
  >([]);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const config = roleConfig[role];

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      
      // Generate floating particles
      const particles = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        icon: config.particles[Math.floor(Math.random() * config.particles.length)],
        delay: Math.random() * 2,
      }));
      setFloatingParticles(particles);

      const timer = setTimeout(() => setShow(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [isVisible, config.particles]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newRipple = { id: Date.now(), x, y };
    setRipples((prev) => [...prev, newRipple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 1000);
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShow(false);
  };

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {show && (
        <motion.div
          key="role-intro-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{ ...styles.overlay, background: config.gradient }}
          onClick={handleClick}
        >
          {/* Animated background waves */}
          <motion.div
            style={styles.wave1}
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
          <motion.div
            style={styles.wave2}
            animate={{
              x: ['100%', '-100%'],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'linear',
            }}
          />

          {/* Subtle radial highlight */}
          <motion.div
            style={styles.radial}
            animate={{
              opacity: [0.3, 0.5, 0.3],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Floating particles */}
          {floatingParticles.map((particle) => (
            <motion.div
              key={particle.id}
              style={{
                position: 'absolute',
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                fontSize: '2rem',
                opacity: 0.4,
                pointerEvents: 'none',
              }}
              animate={{
                y: [0, -30, 0],
                x: [0, Math.sin(particle.id) * 20, 0],
                rotate: [0, 360],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: 4 + Math.random() * 2,
                repeat: Infinity,
                delay: particle.delay,
                ease: 'easeInOut',
              }}
            >
              {particle.icon}
            </motion.div>
          ))}

          {/* Click ripples */}
          {ripples.map((ripple) => (
            <motion.div
              key={ripple.id}
              style={{
                position: 'absolute',
                left: `${ripple.x}%`,
                top: `${ripple.y}%`,
                width: 100,
                height: 100,
                borderRadius: '50%',
                border: '3px solid rgba(255, 255, 255, 0.5)',
                pointerEvents: 'none',
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 5, opacity: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          ))}

          <motion.div
            style={styles.content}
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
          >
            {/* Icon container with interactive effects */}
            <motion.div
              style={styles.iconContainer}
              onHoverStart={() => setIsHovered(true)}
              onHoverEnd={() => setIsHovered(false)}
              whileHover={{ scale: 1.1, rotate: [0, -10, 10, 0] }}
              whileTap={{ scale: 0.9 }}
            >
              {/* Rotating ring behind icon */}
              <motion.div
                style={styles.iconRing}
                animate={{ rotate: 360 }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              >
                <div style={styles.ringDot} />
                <div style={{ ...styles.ringDot, transform: 'rotate(120deg)' }} />
                <div style={{ ...styles.ringDot, transform: 'rotate(240deg)' }} />
              </motion.div>

              {/* Pulse effect */}
              <motion.div
                style={styles.iconPulse}
                animate={{
                  scale: [1, 1.8, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
              />

              {/* Main icon */}
              <motion.span
                style={styles.icon}
                initial={{ scale: 0.6, rotate: -180 }}
                animate={{
                  scale: isHovered ? 1.2 : 1,
                  rotate: 0,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 12,
                  delay: 0.25,
                }}
              >
                {config.icon}
              </motion.span>
            </motion.div>

            {/* Animated title with character stagger */}
            <motion.div style={styles.titleContainer}>
              {config.title.split('').map((char, index) => (
                <motion.span
                  key={index}
                  style={styles.titleChar}
                  initial={{ opacity: 0, y: 20, rotateX: -90 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  whileHover={{
                    scale: 1.2,
                    color: '#fff',
                    textShadow: '0 0 20px rgba(255, 255, 255, 0.8)',
                  }}
                  transition={{
                    duration: 0.4,
                    delay: 0.4 + index * 0.05,
                    ease: 'backOut',
                  }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </motion.span>
              ))}
            </motion.div>

            {/* Subtitle with underline effect */}
            <motion.div style={styles.subtitleContainer}>
              <motion.p
                style={styles.subtitle}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                {config.subtitle}
              </motion.p>
              <motion.div
                style={styles.underline}
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.8, delay: 1 }}
              />
            </motion.div>

            {/* Welcome message */}
            <motion.div
              style={styles.welcomeContainer}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.2 }}
            >
              <motion.span
                style={styles.welcomeText}
                animate={{
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                Welcome to
              </motion.span>
              <motion.span
                style={styles.annamText}
                whileHover={{
                  scale: 1.1,
                  textShadow: '0 0 20px rgba(255, 255, 255, 0.8)',
                }}
              >
                ANNAM
              </motion.span>
            </motion.div>

            {/* Progress bar */}
            <motion.div
              style={styles.progressContainer}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              <motion.div
                style={styles.progressBar}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 3, ease: 'linear' }}
              />
            </motion.div>
          </motion.div>

          {/* Skip button */}
          <motion.button
            style={styles.skipButton}
            onClick={handleSkip}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 0.7, x: 0 }}
            whileHover={{
              opacity: 1,
              scale: 1.05,
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
            }}
            whileTap={{ scale: 0.95 }}
            transition={{ delay: 0.5 }}
          >
            Skip →
          </motion.button>

          {/* Interactive hint */}
          <motion.div
            style={styles.hint}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.7, 0] }}
            transition={{ duration: 3, delay: 1.8 }}
          >
            Click anywhere to interact ✨
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
    cursor: 'pointer',
    overflow: 'hidden',
  },
  wave1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.1) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  wave2: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.05) 0%, transparent 60%)',
    pointerEvents: 'none',
  },
  radial: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  content: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
    zIndex: 1,
  },
  iconContainer: {
    position: 'relative',
    width: 140,
    height: 140,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  iconRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: '50%',
    border: '3px solid rgba(255, 255, 255, 0.3)',
  },
  ringDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: '#fff',
    top: -5,
    left: '50%',
    marginLeft: -5,
    boxShadow: '0 0 10px rgba(255, 255, 255, 0.8)',
    transformOrigin: '5px 65px',
  },
  iconPulse: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    border: '2px solid rgba(255, 255, 255, 0.5)',
  },
  icon: {
    fontSize: '4.5rem',
    lineHeight: 1,
    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
    zIndex: 1,
  },
  titleContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '0.1rem',
    marginTop: '0.5rem',
  },
  titleChar: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: '2.5rem',
    fontWeight: 700,
    letterSpacing: '0.04em',
    cursor: 'pointer',
    display: 'inline-block',
    fontFamily: 'system-ui, sans-serif',
  },
  subtitleContainer: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: '1.1rem',
    fontWeight: 500,
    letterSpacing: '0.15em',
    margin: 0,
    textTransform: 'uppercase',
  },
  underline: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 1,
  },
  welcomeContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
    marginTop: '0.5rem',
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.85rem',
    fontWeight: 300,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
  },
  annamText: {
    color: '#ffffff',
    fontSize: '1.5rem',
    fontWeight: 700,
    letterSpacing: '0.3em',
    cursor: 'pointer',
    textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
  },
  progressContainer: {
    width: 250,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: '1rem',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    boxShadow: '0 0 15px rgba(255, 255, 255, 0.6)',
    borderRadius: 3,
  },
  skipButton: {
    position: 'absolute',
    top: '2rem',
    right: '2rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    borderRadius: '2rem',
    color: '#ffffff',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
    backdropFilter: 'blur(10px)',
    zIndex: 2,
    outline: 'none',
  },
  hint: {
    position: 'absolute',
    bottom: '2.5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.85rem',
    fontWeight: 300,
    letterSpacing: '0.1em',
    userSelect: 'none',
  },
};

export default RoleIntroTransition;