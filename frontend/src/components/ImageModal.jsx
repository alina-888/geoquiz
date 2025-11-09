import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ImageModal({ images, currentIndex, onClose, onNavigate }) {
  // Keyboard navigation - must be called before any early returns
  useEffect(() => {
    if (!images || images.length === 0) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === 'ArrowRight' && currentIndex < images.length - 1) onNavigate(currentIndex + 1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images, currentIndex, onClose, onNavigate]);

  // Now safe to do early return after all hooks
  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex];
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 9999,
        cursor: 'zoom-out'
      }}
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="btn btn-light position-absolute top-0 end-0 m-3"
        style={{ zIndex: 10000 }}
        title="Close (ESC)"
      >
        <X size={24} />
      </button>

      {/* Image Counter */}
      {images.length > 1 && (
        <div
          className="position-absolute top-0 start-50 translate-middle-x mt-3 px-3 py-2 bg-dark text-white rounded"
          style={{ zIndex: 10000, opacity: 0.8 }}
        >
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Previous Arrow */}
      {hasPrevious && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex - 1);
          }}
          className="btn btn-light position-absolute start-0 top-50 translate-middle-y ms-3"
          style={{ zIndex: 10000, width: '50px', height: '50px' }}
          title="Previous (←)"
        >
          <ChevronLeft size={32} />
        </button>
      )}

      {/* Image */}
      <img
        src={currentImage.src}
        alt={currentImage.alt}
        className="img-fluid"
        style={{
          maxWidth: '90%',
          maxHeight: '90%',
          objectFit: 'contain',
          cursor: 'default'
        }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Next Arrow */}
      {hasNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex + 1);
          }}
          className="btn btn-light position-absolute end-0 top-50 translate-middle-y me-3"
          style={{ zIndex: 10000, width: '50px', height: '50px' }}
          title="Next (→)"
        >
          <ChevronRight size={32} />
        </button>
      )}
    </div>
  );
}
