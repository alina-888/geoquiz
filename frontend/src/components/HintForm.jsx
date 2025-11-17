import React from 'react';
import { Lightbulb, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Simple hint form component that manages hints in local state
 * Works like media files - collects data and sends with question save
 */
export default function HintForm({ hints, onChange }) {
  const { t } = useTranslation();

  const addHint = () => {
    if (hints.length >= 3) {
      alert(t('hints.maxHints'));
      return;
    }

    const newHint = {
      hint_text: '',
      points_penalty: 5,
      hint_order: hints.length + 1,
      hint_image: null,
      hint_audio: null,
      hint_video: null,
    };

    onChange([...hints, newHint]);
  };

  const updateHint = (index, field, value) => {
    const updated = [...hints];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeHint = (index) => {
    const updated = hints.filter((_, i) => i !== index);
    // Reorder remaining hints
    updated.forEach((hint, i) => {
      hint.hint_order = i + 1;
    });
    onChange(updated);
  };

  return (
    <div className="card mb-3">
      <div className="card-header d-flex justify-content-between align-items-center bg-light">
        <h6 className="mb-0">
          <Lightbulb size={18} className="me-2" style={{ display: 'inline' }} />
          {t('hints.title')} ({hints.length}/3) <span className="text-muted small">{t('hints.optional')}</span>
        </h6>
        {hints.length < 3 && (
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={addHint}
          >
            <Plus size={14} className="me-1" />
            {t('hints.addHint')}
          </button>
        )}
      </div>

      {hints.length > 0 && (
        <div className="card-body">
          {hints.map((hint, index) => (
            <div key={index} className="border rounded p-3 mb-3 bg-light">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <h6 className="mb-0">
                  {t('hints.hint')} {hint.hint_order}
                  <span className="badge bg-warning text-dark ms-2">
                    -{hint.points_penalty} {t('hints.points')}
                  </span>
                </h6>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => removeHint(index)}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="row g-2 mb-2">
                <div className="col-md-6">
                  <label className="form-label small mb-1">{t('hints.pointsPenalty')} *</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    min="1"
                    value={hint.points_penalty}
                    onChange={(e) =>
                      updateHint(index, 'points_penalty', Number(e.target.value))
                    }
                    required
                  />
                  <small className="text-muted">{t('hints.pointsDeducted')}</small>
                </div>
              </div>

              <div className="mb-2">
                <label className="form-label small mb-1">{t('hints.hintText')}</label>
                <textarea
                  className="form-control form-control-sm"
                  rows={2}
                  value={hint.hint_text}
                  onChange={(e) => updateHint(index, 'hint_text', e.target.value)}
                  placeholder={t('hints.hintTextPlaceholder')}
                />
              </div>

              <div className="row g-2">
                <div className="col-md-4">
                  <label className="form-label small mb-1">{t('question.create.image')}</label>
                  <input
                    type="file"
                    className="form-control form-control-sm"
                    accept="image/*"
                    onChange={(e) =>
                      updateHint(index, 'hint_image', e.target.files[0] || null)
                    }
                  />
                  {hint.hint_image && (
                    <small className="text-success d-block mt-1">
                      ✓ {hint.hint_image.name}
                    </small>
                  )}
                </div>

                <div className="col-md-4">
                  <label className="form-label small mb-1">{t('question.create.audio')}</label>
                  <input
                    type="file"
                    className="form-control form-control-sm"
                    accept="audio/*"
                    onChange={(e) =>
                      updateHint(index, 'hint_audio', e.target.files[0] || null)
                    }
                  />
                  {hint.hint_audio && (
                    <small className="text-success d-block mt-1">
                      ✓ {hint.hint_audio.name}
                    </small>
                  )}
                </div>

                <div className="col-md-4">
                  <label className="form-label small mb-1">{t('question.create.video')}</label>
                  <input
                    type="file"
                    className="form-control form-control-sm"
                    accept="video/*"
                    onChange={(e) =>
                      updateHint(index, 'hint_video', e.target.files[0] || null)
                    }
                  />
                  {hint.hint_video && (
                    <small className="text-success d-block mt-1">
                      ✓ {hint.hint_video.name}
                    </small>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {hints.length === 0 && (
        <div className="card-body text-center text-muted py-4">
          <Lightbulb size={32} className="mb-2 opacity-50" />
          <p className="mb-0 small">{t('hints.noHints')}</p>
        </div>
      )}
    </div>
  );
}
