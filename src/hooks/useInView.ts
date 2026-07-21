import { useEffect, useRef, useState } from 'react';

interface UseInViewOptions {
  /** Fraction of element visible before triggering (0–1). Default: 0.1 */
  threshold?: number;
  /** Root margin for earlier/later triggering. Default: '0px' */
  rootMargin?: string;
  /** If true, fires only once then disconnects. Default: true */
  triggerOnce?: boolean;
}

/**
 * Intersection Observer hook. Returns a ref to attach to the target element
 * and a boolean indicating whether it's currently (or was) in view.
 */
export function useInView(options: UseInViewOptions = {}) {
  const { threshold = 0.1, rootMargin = '0px', triggerOnce = true } = options;
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (triggerOnce) observer.disconnect();
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return [ref, isInView] as const;
}
