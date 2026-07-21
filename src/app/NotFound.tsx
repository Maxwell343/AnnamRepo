import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import './NotFound.css';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <div className="not-found-code">404</div>
        <h1 className="not-found-title">Page not found</h1>
        <p className="not-found-description">
          The page you're looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>
        <div className="not-found-actions">
          <button
            className="not-found-btn not-found-btn-primary"
            onClick={() => navigate('/')}
            aria-label="Go to home page"
          >
            <Home size={18} />
            <span>Back to Home</span>
          </button>
          <button
            className="not-found-btn not-found-btn-secondary"
            onClick={() => navigate(-1)}
            aria-label="Go back to previous page"
          >
            <ArrowLeft size={18} />
            <span>Go Back</span>
          </button>
        </div>
      </div>

      {/* Decorative background elements */}
      <div className="not-found-bg" aria-hidden="true">
        <div className="not-found-circle not-found-circle-1" />
        <div className="not-found-circle not-found-circle-2" />
        <div className="not-found-circle not-found-circle-3" />
      </div>
    </div>
  );
}
