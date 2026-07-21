import './LoadingSkeleton.css';

interface LoadingSkeletonProps {
  /** Visual variant. Default: 'page' */
  variant?: 'page' | 'card' | 'inline';
}

/**
 * Animated loading placeholder shown during lazy-loaded route transitions
 * and async data fetches.
 */
export function LoadingSkeleton({ variant = 'page' }: LoadingSkeletonProps) {
  if (variant === 'inline') {
    return (
      <div className="skeleton-inline" role="status" aria-label="Loading">
        <div className="skeleton-bar skeleton-bar-short" />
        <div className="skeleton-bar" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="skeleton-card" role="status" aria-label="Loading">
        <div className="skeleton-card-image" />
        <div className="skeleton-card-body">
          <div className="skeleton-bar skeleton-bar-short" />
          <div className="skeleton-bar" />
          <div className="skeleton-bar skeleton-bar-medium" />
        </div>
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  return (
    <div className="skeleton-page" role="status" aria-label="Loading page">
      <div className="skeleton-page-inner">
        <div className="skeleton-spinner" />
        <p className="skeleton-text">Loading…</p>
      </div>
    </div>
  );
}
