import React, { useState } from 'react';
import { Menu, Lightbulb, Lock, Unlock, X } from 'lucide-react';
import AudioPlayer from './AudioPlayer';
import VideoPlayer from './VideoPlayer';
import ImageModal from './ImageModal';

export default function HintsMenu({ hints, onUnlockHint, currentScore }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedHint, setSelectedHint] = useState(null);
  const [modalImages, setModalImages] = useState([]);
  const [modalIndex, setModalIndex] = useState(0);

  // Resolve absolute media URL if backend returned a relative path
  const resolveMediaUrl = (url) => {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/media/')) return `http://localhost:8000${url}`;
    return url;
  };

  if (!hints || hints.length === 0) {
    return null; // No hints available
  }

  const handleUnlockClick = (hint) => {
    setSelectedHint(hint);
    setShowMenu(false); // Close hints menu first
    setShowConfirm(true); // Then show confirmation
  };

  const confirmUnlock = async () => {
    if (selectedHint && onUnlockHint) {
      await onUnlockHint(selectedHint.id);
      setShowConfirm(false);
      setSelectedHint(null);
      setShowMenu(true); // Reopen hints menu to show unlocked hint
    }
  };

  const cancelUnlock = () => {
    setShowConfirm(false);
    setSelectedHint(null);
    setShowMenu(true); // Reopen hints menu
  };

  const unlockedCount = hints.filter(h => h.is_unlocked).length;
  const totalHints = hints.length;

  return (
    <>
      {/* Burger Menu Button */}
      <button
        onClick={() => setShowMenu(true)}
        className="btn btn-warning position-fixed"
        style={{
          bottom: '20px',
          right: '20px',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          zIndex: 1000
        }}
        title="View Hints"
      >
        <div className="d-flex flex-column align-items-center">
          <Lightbulb size={24} />
          <small style={{ fontSize: '0.65rem', marginTop: '-4px' }}>
            {unlockedCount}/{totalHints}
          </small>
        </div>
      </button>

      {/* Hints Menu Modal */}
      {showMenu && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowMenu(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-dialog-scrollable"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <Lightbulb size={20} className="me-2" />
                  Hints ({unlockedCount}/{totalHints} unlocked)
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowMenu(false)}
                ></button>
              </div>
              <div className="modal-body">
                {hints.map((hint) => (
                  <div
                    key={hint.id}
                    className={`card mb-3 ${
                      hint.is_unlocked ? 'border-success' : 'border-warning'
                    }`}
                  >
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="mb-0">
                          {hint.is_unlocked ? (
                            <Unlock size={16} className="text-success me-2" />
                          ) : (
                            <Lock size={16} className="text-warning me-2" />
                          )}
                          Hint {hint.hint_order}
                        </h6>
                        <span
                          className={`badge ${
                            hint.is_unlocked ? 'bg-success' : 'bg-warning text-dark'
                          }`}
                        >
                          -{hint.points_penalty} points
                        </span>
                      </div>

                      {hint.is_unlocked ? (
                        <>
                          {/* Show hint content when unlocked */}
                          {hint.hint_text && (
                            <p className="mb-2">{hint.hint_text}</p>
                          )}

                          {/* Show hint media when unlocked - use direct fields instead of media_url */}
                          {hint.hint_image && (
                            <div className="border rounded p-3 bg-light mb-2">
                              <div className="text-center">
                                <img
                                  src={resolveMediaUrl(hint.hint_image)}
                                  alt={`Hint ${hint.hint_order}`}
                                  className="img-fluid rounded shadow-sm"
                                  style={{ maxHeight: '300px', objectFit: 'contain', cursor: 'zoom-in' }}
                                  onClick={() => {
                                    setModalImages([{
                                      src: resolveMediaUrl(hint.hint_image),
                                      alt: `Hint ${hint.hint_order}`
                                    }]);
                                    setModalIndex(0);
                                  }}
                                  title="Click to enlarge"
                                />
                              </div>
                            </div>
                          )}

                          {hint.hint_audio && (
                            <AudioPlayer
                              src={resolveMediaUrl(hint.hint_audio)}
                              label={`Hint ${hint.hint_order} Audio`}
                            />
                          )}

                          {hint.hint_video && (
                            <VideoPlayer src={resolveMediaUrl(hint.hint_video)} />
                          )}
                        </>
                      ) : (
                        <>
                          {/* Locked state */}
                          <p className="text-muted mb-2">
                            🔒 This hint is locked. Unlock it to reveal helpful information.
                          </p>
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => handleUnlockClick(hint)}
                            disabled={
                              hint.hint_order > 1 &&
                              !hints.find(h => h.hint_order === hint.hint_order - 1)?.is_unlocked
                            }
                          >
                            {hint.hint_order > 1 &&
                            !hints.find(h => h.hint_order === hint.hint_order - 1)?.is_unlocked
                              ? `Unlock Hint ${hint.hint_order - 1} first`
                              : `Unlock for ${hint.points_penalty} points`}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {currentScore !== undefined && (
                  <div className="alert alert-info mt-3">
                    <strong>Current Score:</strong> {currentScore} points
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && selectedHint && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1050 }}
          onClick={cancelUnlock}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Unlock</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={cancelUnlock}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to unlock <strong>Hint {selectedHint.hint_order}</strong>?
                </p>
                <div className="alert alert-warning">
                  <strong>{selectedHint.points_penalty} points</strong> will be
                  deducted from your score.
                </div>
                {currentScore !== undefined && (
                  <p className="text-muted">
                    Your score will become:{' '}
                    <strong>{Math.max(0, currentScore - selectedHint.points_penalty)}</strong> points
                  </p>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cancelUnlock}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-warning"
                  onClick={confirmUnlock}
                >
                  Yes, Unlock Hint
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {modalImages.length > 0 && (
        <ImageModal
          images={modalImages}
          currentIndex={modalIndex}
          onClose={() => setModalImages([])}
          onNavigate={setModalIndex}
        />
      )}
    </>
  );
}
