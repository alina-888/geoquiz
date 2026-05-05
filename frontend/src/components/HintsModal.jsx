import React, { useState, useEffect } from 'react';
import { Lightbulb, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Modal component for managing hints with translations
 * Provides a cleaner UX by separating hint management from the main form
 */
export default function HintsModal({
  isOpen,
  onClose,
  hints,
  hintTranslations,
  onChange,
  defaultLanguage
}) {
  const { t } = useTranslation();
  const [localHints, setLocalHints] = useState([]);
  const [localHintTranslations, setLocalHintTranslations] = useState({});
  const [expandedHints, setExpandedHints] = useState(new Set([0])); // First hint expanded by default

  // Load hints and translations when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalHints(hints || []);
      setLocalHintTranslations(hintTranslations || {});
      // Expand first hint if there are hints
      if (hints && hints.length > 0) {
        setExpandedHints(new Set([0]));
      }
    }
  }, [isOpen, hints, hintTranslations]);

  const addHint = () => {
    if (localHints.length >= 3) {
      alert(t('hints.maxHints'));
      return;
    }

    const newHint = {
      hint_text: '',
      points_penalty: 5,
      hint_order: localHints.length + 1,
      hint_image: null,
      hint_audio: null,
      hint_video: null,
    };

    const updated = [...localHints, newHint];
    setLocalHints(updated);
    // Auto-expand the new hint
    setExpandedHints(new Set([...expandedHints, localHints.length]));
  };

  const updateHint = (index, field, value) => {
    const updated = [...localHints];
    updated[index] = { ...updated[index], [field]: value };
    setLocalHints(updated);
  };

  const removeHint = (index) => {
    if (!window.confirm(t('hints.deleteConfirm'))) return;

    const updated = localHints.filter((_, i) => i !== index);
    // Reorder remaining hints
    updated.forEach((hint, i) => {
      hint.hint_order = i + 1;
    });
    setLocalHints(updated);

    // Remove translations for this hint
    const updatedTranslations = { ...localHintTranslations };
    delete updatedTranslations[index];
    // Re-index translations
    const reindexed = {};
    Object.entries(updatedTranslations).forEach(([idx, trans]) => {
      const numIdx = parseInt(idx);
      if (numIdx > index) {
        reindexed[numIdx - 1] = trans;
      } else {
        reindexed[idx] = trans;
      }
    });
    setLocalHintTranslations(reindexed);

    // Update expanded hints
    const newExpanded = new Set();
    expandedHints.forEach(idx => {
      if (idx < index) newExpanded.add(idx);
      else if (idx > index) newExpanded.add(idx - 1);
    });
    setExpandedHints(newExpanded);
  };

  const toggleExpand = (index) => {
    const newExpanded = new Set(expandedHints);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedHints(newExpanded);
  };

  const updateHintTranslation = (hintIndex, language, value) => {
    setLocalHintTranslations(prev => {
      const updated = { ...prev };
      if (!updated[hintIndex]) updated[hintIndex] = [];

      const existing = updated[hintIndex].find(tr => tr.language === language);
      if (existing) {
        existing.hint_text = value;
      } else {
        updated[hintIndex].push({ language, hint_text: value });
      }

      return updated;
    });
  };

  const handleSave = () => {
    // Validate: each hint must have text or media
    for (let i = 0; i < localHints.length; i++) {
      const hint = localHints[i];
      const hasText = hint.hint_text && hint.hint_text.trim().length > 0;
      const hasMedia = hint.hint_image || hint.hint_audio || hint.hint_video;
      if (!hasText && !hasMedia) {
        alert(t('hints.emptyHint', { number: i + 1 }));
        return;
      }
    }

    // Pass back to parent
    onChange(localHints, localHintTranslations);
    onClose();
  };

  const handleCancel = () => {
    // Revert changes
    setLocalHints(hints || []);
    setLocalHintTranslations(hintTranslations || {});
    onClose();
  };

  // Available languages for translation (exclude default language)
  const availableLanguages = defaultLanguage
    ? ['en', 'ru', 'sr'].filter(lang => lang !== defaultLanguage)
    : [];

  if (!isOpen) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <Lightbulb size={20} className="me-2" style={{ display: 'inline' }} />
              {t('hints.manageHints')} ({localHints.length}/3)
            </h5>
            <button type="button" className="btn-close" onClick={handleCancel}></button>
          </div>

          <div className="modal-body">
            {localHints.length === 0 ? (
              <div className="text-center text-muted py-5">
                <Lightbulb size={48} className="mb-3 opacity-50" />
                <p className="mb-0">{t('hints.noHints')}</p>
                <p className="small">{t('hints.clickAddHint')}</p>
              </div>
            ) : (
              <div className="accordion" id="hintsAccordion">
                {localHints.map((hint, index) => (
                  <div key={index} className="card mb-2">
                    <div className="card-header bg-light">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="flex-grow-1" style={{ cursor: 'pointer' }} onClick={() => toggleExpand(index)}>
                          <strong>{t('hints.hint')} {hint.hint_order}</strong>
                          <span className="badge bg-warning text-dark ms-2">
                            -{hint.points_penalty} {t('hints.points')}
                          </span>
                          {hint.hint_text && (
                            <div className="small text-muted mt-1">
                              {hint.hint_text.substring(0, 60)}{hint.hint_text.length > 60 ? '...' : ''}
                            </div>
                          )}
                        </div>
                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => toggleExpand(index)}
                          >
                            {expandedHints.has(index) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeHint(index)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {expandedHints.has(index) && (
                      <div className="card-body">
                        {/* Points Penalty */}
                        <div className="mb-3">
                          <label className="form-label">{t('hints.pointsPenalty')} *</label>
                          <input
                            type="number"
                            className="form-control"
                            min="1"
                            value={hint.points_penalty}
                            onChange={(e) => updateHint(index, 'points_penalty', Number(e.target.value))}
                            required
                          />
                          <small className="text-muted">{t('hints.pointsDeducted')}</small>
                        </div>

                        {/* Hint Text */}
                        <div className="mb-3">
                          <label className="form-label">{t('hints.hintText')}</label>
                          <textarea
                            className="form-control"
                            rows={3}
                            value={hint.hint_text}
                            onChange={(e) => updateHint(index, 'hint_text', e.target.value)}
                            placeholder={t('hints.hintTextPlaceholder')}
                          />
                        </div>

                        {/* Media Files */}
                        <div className="mb-3">
                          <label className="form-label">{t('question.create.media')} ({t('hints.optional')})</label>
                          <div className="row g-2">
                            <div className="col-md-4">
                              <label className="form-label small">{t('question.create.image')}</label>
                              <input
                                type="file"
                                className="form-control form-control-sm"
                                accept="image/*"
                                onChange={(e) => updateHint(index, 'hint_image', e.target.files[0] || null)}
                              />
                              {hint.hint_image && (
                                <small className="text-success d-block mt-1">
                                  ✓ {hint.hint_image.name || t('hints.imageUploaded')}
                                </small>
                              )}
                            </div>
                            <div className="col-md-4">
                              <label className="form-label small">{t('question.create.audio')}</label>
                              <input
                                type="file"
                                className="form-control form-control-sm"
                                accept="audio/*"
                                onChange={(e) => updateHint(index, 'hint_audio', e.target.files[0] || null)}
                              />
                              {hint.hint_audio && (
                                <small className="text-success d-block mt-1">
                                  ✓ {hint.hint_audio.name || t('hints.audioUploaded')}
                                </small>
                              )}
                            </div>
                            <div className="col-md-4">
                              <label className="form-label small">{t('question.create.video')}</label>
                              <input
                                type="file"
                                className="form-control form-control-sm"
                                accept="video/*"
                                onChange={(e) => updateHint(index, 'hint_video', e.target.files[0] || null)}
                              />
                              {hint.hint_video && (
                                <small className="text-success d-block mt-1">
                                  ✓ {hint.hint_video.name || t('hints.videoUploaded')}
                                </small>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Translations */}
                        {availableLanguages.length > 0 && hint.hint_text && hint.hint_text.trim() && (
                          <div className="border rounded p-3 bg-light">
                            <h6 className="mb-3">{t('translations.title')}</h6>
                            {availableLanguages.map(lang => (
                              <div key={lang} className="mb-2">
                                <label className="form-label small mb-1">
                                  {lang.toUpperCase()} - {t('hints.hintText')}
                                </label>
                                <textarea
                                  className="form-control form-control-sm"
                                  rows={2}
                                  placeholder={t('translations.hintText')}
                                  value={localHintTranslations[index]?.find(tr => tr.language === lang)?.hint_text || ''}
                                  onChange={(e) => updateHintTranslation(index, lang, e.target.value)}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {localHints.length < 3 && (
              <button
                type="button"
                className="btn btn-outline-primary w-100 mt-3"
                onClick={addHint}
              >
                <Plus size={16} className="me-2" />
                {t('hints.addHint')}
              </button>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleCancel}>
              {t('common.cancel')}
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              {t('common.save')} {localHints.length > 0 && `(${localHints.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
