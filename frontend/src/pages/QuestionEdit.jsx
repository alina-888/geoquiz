import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, ChevronLeft, ChevronRight, Lightbulb } from 'lucide-react';
import { getQuestion, updateQuestion, getQuizDetail, deleteQuestionMedia, createQuestionTranslation, updateQuestionTranslation, deleteQuestionTranslation, createOptionTranslation, updateOptionTranslation, deleteOptionTranslation, createHintTranslation } from '../api/api';
import LocationPicker from './LocationPicker';
import HintsModal from '../components/HintsModal';
import TranslationForm from '../components/TranslationForm';
import { useTranslation } from 'react-i18next';

export default function QuestionEdit() {
  const navigate = useNavigate();
  const { quizId, questionId } = useParams();
  const { t } = useTranslation();

  const [quiz, setQuiz] = useState(null);
  const [question, setQuestion] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [questionWarning, setQuestionWarning] = useState(null); // { type: 'option' | 'hint' | 'file', key: string, params?: object }
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [prevQuestionId, setPrevQuestionId] = useState(null);
  const [nextQuestionId, setNextQuestionId] = useState(null);

  const [qText, setQText] = useState('');
  const [qType, setQType] = useState('multiple_choice');
  const [qPoints, setQPoints] = useState(10);
  const [qCorrect, setQCorrect] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [audioFiles, setAudioFiles] = useState([]);
  const [videoFiles, setVideoFiles] = useState([]);
  const [qGeolocation, setQGeolocation] = useState(null);
  const [existingMediaFiles, setExistingMediaFiles] = useState([]);
  const [hints, setHints] = useState([]);
  const [translations, setTranslations] = useState([]);
  const [originalTranslations, setOriginalTranslations] = useState([]);
  const [optionTranslations, setOptionTranslations] = useState({});  // { optionIndex: [{ id?, language, option_text }] }
  const [originalOptionTranslations, setOriginalOptionTranslations] = useState({});
  const [hintTranslations, setHintTranslations] = useState({});  // { hintIndex: [{ language, hint_text }] }
  const [isHintsModalOpen, setIsHintsModalOpen] = useState(false);
  const [options, setOptions] = useState([
    { option_text: '', is_correct: false, id: null },
    { option_text: '', is_correct: false, id: null },
  ]);

  // Refs to reset file inputs
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const videoInputRef = useRef(null);

  useEffect(() => {
    if (questionWarning) {
      document.getElementById(`warning-${questionWarning.type}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [questionWarning]);

  // Load quiz and question data
  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        const [quizDetail, questionDetail] = await Promise.all([
          getQuizDetail(quizId),
          getQuestion(questionId)
        ]);

        if (!mounted) return;

        // Check if user is the quiz creator
        const currentUser = localStorage.getItem('auth.username');
        if (!quizDetail.creator_username || quizDetail.creator_username !== currentUser) {
          setError('You do not have permission to edit this question.');
          setLoading(false);
          return;
        }

        setQuiz(quizDetail);
        setQuestion(questionDetail);

        // Find current question's position and adjacent questions
        if (quizDetail.questions && quizDetail.questions.length > 0) {
          const currentIndex = quizDetail.questions.findIndex(q => q.id === parseInt(questionId));
          setCurrentQuestionIndex(currentIndex);

          if (currentIndex > 0) {
            setPrevQuestionId(quizDetail.questions[currentIndex - 1].id);
          } else {
            setPrevQuestionId(null);
          }

          if (currentIndex >= 0 && currentIndex < quizDetail.questions.length - 1) {
            setNextQuestionId(quizDetail.questions[currentIndex + 1].id);
          } else {
            setNextQuestionId(null);
          }
        }

        // Pre-populate form with question data
        setQText(questionDetail.question_text || '');
        setQType(questionDetail.question_type || 'multiple_choice');
        setQPoints(questionDetail.points_value || 10);
        setQCorrect(questionDetail.correct_answer || '');
        setQGeolocation(questionDetail.geolocation);

        // Set existing media files from the new media_files array
        if (questionDetail.media_files && questionDetail.media_files.length > 0) {
          setExistingMediaFiles(questionDetail.media_files);
        }

        // Load options for multiple choice
        if (questionDetail.question_type === 'multiple_choice' && questionDetail.options) {
          setOptions(questionDetail.options.map(opt => ({
            id: opt.id,
            option_text: opt.option_text,
            is_correct: opt.is_correct
          })));

          // Load option translations
          const optTrans = {};
          const origOptTrans = {};
          questionDetail.options.forEach((opt, idx) => {
            if (opt.translations && opt.translations.length > 0) {
              optTrans[idx] = opt.translations.map(tr => ({
                id: tr.id,
                language: tr.language,
                option_text: tr.option_text || ''
              }));
              origOptTrans[idx] = opt.translations.map(tr => ({
                id: tr.id,
                language: tr.language,
                option_text: tr.option_text || ''
              }));
            }
          });
          setOptionTranslations(optTrans);
          setOriginalOptionTranslations(origOptTrans);
        }

        // Load existing hints
        if (questionDetail.hints && questionDetail.hints.length > 0) {
          setHints(questionDetail.hints.map(hint => ({
            hint_text: hint.hint_text || '',
            points_penalty: hint.points_penalty,
            hint_order: hint.hint_order,
            hint_image: null,  // Existing files stay on server
            hint_audio: null,
            hint_video: null,
          })));

          // Load hint translations
          const hintTrans = {};
          questionDetail.hints.forEach((hint, idx) => {
            if (hint.translations && hint.translations.length > 0) {
              hintTrans[idx] = hint.translations.map(tr => ({
                id: tr.id,
                language: tr.language,
                hint_text: tr.hint_text || ''
              }));
            }
          });
          setHintTranslations(hintTrans);
        }

        // Load existing translations
        if (questionDetail.translations && questionDetail.translations.length > 0) {
          const loadedTranslations = questionDetail.translations.map(tr => ({
            id: tr.id,
            language: tr.language,
            question_text: tr.question_text || '',
            correct_answer: tr.correct_answer || ''
          }));
          setTranslations(loadedTranslations);
          setOriginalTranslations(loadedTranslations);
        }

        setLoading(false);
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to load question');
          setLoading(false);
        }
      }
    }
    if (quizId && questionId) fetchData();
    return () => {
      mounted = false;
    };
  }, [quizId, questionId]);

  const addOption = () => setOptions([...options, { option_text: '', is_correct: false }]);
  const updateOption = (idx, key, value) => {
    const copy = options.slice();
    copy[idx] = { ...copy[idx], [key]: value };
    setOptions(copy);
  };
  const removeOption = (idx) => setOptions(options.filter((_, i) => i !== idx));

  const handleHintsSave = (updatedHints, updatedHintTranslations) => {
    setHints(updatedHints);
    setHintTranslations(updatedHintTranslations);
  };

  // Constants
  const MAX_FILES_PER_QUESTION = 8;

  // Check if maximum files reached
  const isMaxFilesReached = existingMediaFiles.length + imageFiles.length + audioFiles.length + videoFiles.length >= MAX_FILES_PER_QUESTION;

  // Helper functions for file management
  const handleImageSelect = (e) => {
    const newFiles = Array.from(e.target.files || []);
    const currentTotal = existingMediaFiles.length + imageFiles.length + audioFiles.length + videoFiles.length;
    const remainingSlots = MAX_FILES_PER_QUESTION - currentTotal;

    if (remainingSlots <= 0) {
      setQuestionWarning({ type: 'file', key: 'question.create.maxFilesReached', params: { max: MAX_FILES_PER_QUESTION } });
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }

    const filesToAdd = newFiles.slice(0, remainingSlots);
    if (filesToAdd.length < newFiles.length) {
      setQuestionWarning({ type: 'file', key: 'question.create.onlyFilesAdded', params: { count: filesToAdd.length, max: MAX_FILES_PER_QUESTION } });
    }

    setImageFiles([...imageFiles, ...filesToAdd]);
    // Reset input value to allow selecting same file again
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleAudioSelect = (e) => {
    const newFiles = Array.from(e.target.files || []);
    const currentTotal = existingMediaFiles.length + imageFiles.length + audioFiles.length + videoFiles.length;
    const remainingSlots = MAX_FILES_PER_QUESTION - currentTotal;

    if (remainingSlots <= 0) {
      setQuestionWarning({ type: 'file', key: 'question.create.maxFilesReached', params: { max: MAX_FILES_PER_QUESTION } });
      if (audioInputRef.current) audioInputRef.current.value = '';
      return;
    }

    const filesToAdd = newFiles.slice(0, remainingSlots);
    if (filesToAdd.length < newFiles.length) {
      setQuestionWarning({ type: 'file', key: 'question.create.onlyFilesAdded', params: { count: filesToAdd.length, max: MAX_FILES_PER_QUESTION } });
    }

    setAudioFiles([...audioFiles, ...filesToAdd]);
    // Reset input value to allow selecting same file again
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const handleVideoSelect = (e) => {
    const newFiles = Array.from(e.target.files || []);
    const currentTotal = existingMediaFiles.length + imageFiles.length + audioFiles.length + videoFiles.length;
    const remainingSlots = MAX_FILES_PER_QUESTION - currentTotal;

    if (remainingSlots <= 0) {
      setQuestionWarning({ type: 'file', key: 'question.create.maxFilesReached', params: { max: MAX_FILES_PER_QUESTION } });
      if (videoInputRef.current) videoInputRef.current.value = '';
      return;
    }

    const filesToAdd = newFiles.slice(0, remainingSlots);
    if (filesToAdd.length < newFiles.length) {
      setQuestionWarning({ type: 'file', key: 'question.create.onlyFilesAdded', params: { count: filesToAdd.length, max: MAX_FILES_PER_QUESTION } });
    }

    setVideoFiles([...videoFiles, ...filesToAdd]);
    // Reset input value to allow selecting same file again
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const removeImageFile = (idx) => {
    setImageFiles(imageFiles.filter((_, i) => i !== idx));
  };

  const removeAudioFile = (idx) => {
    setAudioFiles(audioFiles.filter((_, i) => i !== idx));
  };

  const removeVideoFile = (idx) => {
    setVideoFiles(videoFiles.filter((_, i) => i !== idx));
  };

  // Delete existing media file
  const deleteExistingMedia = async (mediaId) => {
    if (!window.confirm('Are you sure you want to delete this media file?')) {
      return;
    }
    try {
      await deleteQuestionMedia(mediaId);
      // Remove from state
      setExistingMediaFiles(existingMediaFiles.filter(m => m.id !== mediaId));
    } catch (err) {
      setError('Failed to delete media file: ' + (err.message || 'Unknown error'));
    }
  };

  const onUpdate = async (e) => {
    e.preventDefault();
    if (!quiz) return;

    if (qType === 'multiple_choice') {
      const nonEmptyOptions = options.filter(o => o.option_text.trim().length > 0);
      const hasCorrect = nonEmptyOptions.some(o => o.is_correct);
      if (!hasCorrect) {
        setQuestionWarning({ type: 'option', key: 'question.create.selectCorrectOption' });
        return;
      }
    }
    if (qType === 'true_false' && (!qCorrect || String(qCorrect).trim() === '')) {
      setQuestionWarning({ type: 'option', key: 'question.create.selectTrueFalse' });
      return;
    }

    // Validate hints - each hint must have text or media
    for (let i = 0; i < hints.length; i++) {
      const hint = hints[i];
      const hasText = hint.hint_text && hint.hint_text.trim().length > 0;
      const hasMedia = hint.hint_image || hint.hint_audio || hint.hint_video;
      if (!hasText && !hasMedia) {
        setQuestionWarning({ type: 'hint', key: 'question.create.hintEmpty', params: { number: i + 1 } });
        return;
      }
    }

    setSaving(true);
    setError('');
    setQuestionWarning(null);
    try {
      const payload = {
        question_text: qText,
        points_value: qPoints,
        question_type: qType,
        correct_answer: qType !== 'multiple_choice' ? qCorrect : undefined,
        options: qType === 'multiple_choice' ? options.filter(o => o.option_text.trim().length > 0) : [],
        images: imageFiles,
        audios: audioFiles,
        videos: videoFiles,
        geolocation: quiz?.is_geo ? qGeolocation : undefined,
        hints: hints,
      };
      const updatedQuestion = await updateQuestion(questionId, payload);

      // Handle translations
      const validTranslations = translations.filter(
        tr => tr.language && tr.question_text && tr.question_text.trim()
      );

      // Delete removed translations
      for (const original of originalTranslations) {
        const stillExists = validTranslations.find(tr => tr.id === original.id);
        if (!stillExists) {
          try {
            await deleteQuestionTranslation(original.id);
          } catch (err) {
            console.error(`Failed to delete translation ${original.id}:`, err);
          }
        }
      }

      // Create or update translations
      for (const translation of validTranslations) {
        try {
          if (translation.id) {
            // Update existing translation
            await updateQuestionTranslation(translation.id, {
              question: parseInt(questionId),
              language: translation.language,
              question_text: translation.question_text,
              correct_answer: translation.correct_answer || ''
            });
          } else {
            // Create new translation
            await createQuestionTranslation({
              question: parseInt(questionId),
              language: translation.language,
              question_text: translation.question_text,
              correct_answer: translation.correct_answer || ''
            });
          }
        } catch (err) {
          console.error(`Failed to save translation for ${translation.language}:`, err);
        }
      }

      // Handle option translations
      // Note: Options are recreated on update, so we need to match by text and create new translations
      if (updatedQuestion && updatedQuestion.options && Object.keys(optionTranslations).length > 0) {
        for (const [optIdx, optTrans] of Object.entries(optionTranslations)) {
          // Match the local option by index to get its text
          const localOption = options[parseInt(optIdx)];
          if (!localOption || !localOption.option_text.trim()) continue;

          // Find the corresponding option in the response by matching text
          const serverOption = updatedQuestion.options.find(o => o.option_text === localOption.option_text.trim());
          if (!serverOption) continue;

          const validOptTrans = optTrans.filter(tr => tr.language && tr.option_text && tr.option_text.trim());

          // Create option translations (all are new since options were recreated)
          for (const tr of validOptTrans) {
            try {
              await createOptionTranslation({
                option: serverOption.id,
                language: tr.language,
                option_text: tr.option_text
              });
            } catch (err) {
              console.error(`Failed to save option translation for ${tr.language}:`, err);
            }
          }
        }
      }

      // Handle hint translations
      // Note: Hints are recreated on update, so we need to match by text/order and create new translations
      if (updatedQuestion && updatedQuestion.hints && Object.keys(hintTranslations).length > 0) {
        for (const [hintIdx, hintTrans] of Object.entries(hintTranslations)) {
          // Match the local hint by index to get its text and order
          const localHint = hints[parseInt(hintIdx)];
          if (!localHint) continue;

          // Find the corresponding hint in the response by matching text and order
          const serverHint = updatedQuestion.hints.find(
            h => h.hint_text === localHint.hint_text && h.hint_order === localHint.hint_order
          );
          if (!serverHint) continue;

          const validHintTrans = hintTrans.filter(tr => tr.language && tr.hint_text && tr.hint_text.trim());

          // Create hint translations (all are new since hints were recreated)
          for (const tr of validHintTrans) {
            try {
              await createHintTranslation({
                hint: serverHint.id,
                language: tr.language,
                hint_text: tr.hint_text
              });
            } catch (err) {
              console.error(`Failed to save hint translation for ${tr.language}:`, err);
            }
          }
        }
      }

      navigate(`/quizzes/${quizId}/`);
    } catch (err) {
      setError(err.message || 'Failed to update question');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-center mt-4">{t('common.loading')}</p>;

  if (error && !question) {
    return (
      <div className="container mt-4" style={{ maxWidth: '700px' }}>
        <div className="alert alert-danger">{error}</div>
        <button onClick={() => navigate(`/quizzes/${quizId}/`)} className="btn btn-secondary">
          {t('common.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="container mt-4" style={{ maxWidth: '700px' }}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h1 className="h4 fw-bold mb-0">{t('question.edit.title')}</h1>
        {quiz && quiz.questions && quiz.questions.length > 1 && (
          <div className="d-flex gap-2">
            <button
              type="button"
              onClick={() => navigate(`/quizzes/${quizId}/questions/${prevQuestionId}/edit`)}
              disabled={!prevQuestionId}
              className="btn btn-sm btn-outline-secondary"
              title="Previous question"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="align-self-center text-muted" style={{ fontSize: '0.875rem' }}>
              {currentQuestionIndex + 1} / {quiz.questions.length}
            </span>
            <button
              type="button"
              onClick={() => navigate(`/quizzes/${quizId}/questions/${nextQuestionId}/edit`)}
              disabled={!nextQuestionId}
              className="btn btn-sm btn-outline-secondary"
              title="Next question"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
      {quiz && (
        <div className="alert alert-info">{t('question.edit.title')}: <strong>{quiz.title}</strong></div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={onUpdate}>
        <div className="mb-3">
          <label className="form-label">{t('question.create.questionText')}</label>
          <textarea value={qText} onChange={(e)=>setQText(e.target.value)} className="form-control" rows={3} required />
        </div>

        <div className="row mb-3">
          <div className="col">
            <label className="form-label">{t('question.create.questionType')}</label>
            <select value={qType} onChange={(e)=>setQType(e.target.value)} className="form-select">
              <option value="multiple_choice">{t('question.create.typeMultipleChoice')}</option>
              <option value="text">{t('question.create.typeText')}</option>
              <option value="true_false">{t('question.create.typeTrueFalse')}</option>
            </select>
          </div>
          <div className="col">
            <label className="form-label">{t('question.create.points')}</label>
            <input type="number" value={qPoints} onChange={(e)=>setQPoints(Number(e.target.value))} className="form-control" />
          </div>
        </div>

        {qType === 'text' ? (
          <div className="mb-3">
            <label className="form-label">{t('question.create.correctAnswer')}</label>
            <input
              value={qCorrect}
              onChange={(e)=>setQCorrect(e.target.value)}
              className="form-control"
              placeholder="e.g. Hermione | Hermione Granger"
            />
            <small className="text-muted d-block mt-1">
              💡 {t('question.create.multipleAnswersHint')}
            </small>
          </div>
        ) : qType === 'true_false' ? (
          <div className="mb-3">
            <label className="form-label d-block">{t('question.create.correctAnswer')}</label>
            {questionWarning && questionWarning.type === 'option' && (
              <div id="warning-option" className="alert alert-warning py-2 mb-2">{t(questionWarning.key, questionWarning.params)}</div>
            )}
            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="radio"
                name="tf-correct"
                id="tf-true"
                value="true"
                checked={qCorrect === 'true'}
                onChange={(e)=>setQCorrect(e.target.value)}
              />
              <label className="form-check-label" htmlFor="tf-true">{t('common.true')}</label>
            </div>
            <div className="form-check form-check-inline">
              <input
                className="form-check-input"
                type="radio"
                name="tf-correct"
                id="tf-false"
                value="false"
                checked={qCorrect === 'false'}
                onChange={(e)=>setQCorrect(e.target.value)}
              />
              <label className="form-check-label" htmlFor="tf-false">{t('common.false')}</label>
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <label className="form-label">{t('question.create.options')}</label>
            {questionWarning && questionWarning.type === 'option' && (
              <div id="warning-option" className="alert alert-warning py-2 mb-2">{t(questionWarning.key, questionWarning.params)}</div>
            )}
            {options.map((opt, idx) => (
              <div key={idx} className="d-flex align-items-center mb-2 gap-2">
                <input
                  value={opt.option_text}
                  onChange={(e)=>updateOption(idx, 'option_text', e.target.value)}
                  className="form-control"
                  placeholder={t('question.create.optionPlaceholder', { number: idx+1 })}
                />
                <div className="form-check mb-0">
                  <input type="checkbox" checked={opt.is_correct} onChange={(e)=>updateOption(idx, 'is_correct', e.target.checked)} className="form-check-input" id={`opt-${idx}`} />
                  <label className="form-check-label" htmlFor={`opt-${idx}`}>{t('question.create.correctAnswer')}</label>
                </div>
                <button type="button" onClick={()=>removeOption(idx)} className="btn btn-outline-danger btn-sm">{t('common.delete')}</button>
              </div>
            ))}
            <button type="button" onClick={addOption} className="btn btn-link p-0">{t('question.create.addOption')}</button>

            {/* Option Translations */}
            {quiz?.default_language && options.some(o => o.option_text.trim()) && (
              <div className="mt-3 p-3 border rounded bg-light">
                <h6 className="mb-3">{t('translations.title')} - {t('question.create.options')}</h6>
                {options.map((opt, optIdx) => {
                  if (!opt.option_text.trim()) return null;
                  const availableLanguages = ['en', 'ru', 'sr'].filter(lang => lang !== quiz.default_language);
                  if (availableLanguages.length === 0) return null;

                  return (
                    <div key={optIdx} className="mb-3">
                      <small className="text-muted d-block mb-2">
                        {t('question.create.optionPlaceholder', { number: optIdx + 1 })}: {opt.option_text.substring(0, 30)}{opt.option_text.length > 30 ? '...' : ''}
                      </small>
                      {availableLanguages.map(lang => (
                        <div key={lang} className="input-group input-group-sm mb-1">
                          <span className="input-group-text" style={{ width: '45px' }}>{lang.toUpperCase()}</span>
                          <input
                            type="text"
                            className="form-control"
                            placeholder={t('translations.optionText')}
                            value={optionTranslations[optIdx]?.find(tr => tr.language === lang)?.option_text || ''}
                            onChange={(e) => {
                              setOptionTranslations(prev => {
                                const updated = { ...prev };
                                if (!updated[optIdx]) updated[optIdx] = [];
                                const existing = updated[optIdx].find(tr => tr.language === lang);
                                if (existing) {
                                  existing.option_text = e.target.value;
                                } else {
                                  updated[optIdx].push({ language: lang, option_text: e.target.value });
                                }
                                return updated;
                              });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="mb-3">
          <label className="form-label d-block fw-semibold">{t('question.create.media')}</label>
          {questionWarning && questionWarning.type === 'file' && (
            <div id="warning-file" className="alert alert-warning py-2 mb-2">{t(questionWarning.key, questionWarning.params)}</div>
          )}

          {existingMediaFiles.length > 0 && (
            <div className="mb-3">
              <div className="card border-info">
                <div className="card-header bg-info bg-opacity-10">
                  <strong>{t('question.create.media')} ({existingMediaFiles.length})</strong>
                </div>
                <div className="card-body p-2">
                  {existingMediaFiles.map((media) => {
                    const resolveMediaUrl = (url) => {
                      if (!url) return url;
                      if (url.startsWith('http://') || url.startsWith('https://')) return url;
                      if (url.startsWith('/media/')) return `http://localhost:8000${url}`;
                      return url;
                    };

                    return (
                      <div key={media.id} className="p-2 mb-2 bg-light rounded border">
                        {media.media_type === 'image' && (
                          <img
                            src={resolveMediaUrl(media.file_url)}
                            alt="Existing media"
                            style={{ width: '100%', height: 'auto', maxHeight: '150px', objectFit: 'contain', borderRadius: '4px' }}
                            className="mb-2"
                          />
                        )}
                        <div className="d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center flex-grow-1">
                            <span className="badge bg-secondary me-2">{media.media_type}</span>
                            <small className="text-muted">Uploaded {new Date(media.uploaded_at).toLocaleDateString()}</small>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteExistingMedia(media.id)}
                            className="btn btn-sm btn-outline-danger"
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-body p-3">
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <div
                    className={`border rounded p-3 text-center ${isMaxFilesReached ? 'border-secondary bg-secondary bg-opacity-10' : imageFiles.length > 0 ? 'border-primary bg-primary bg-opacity-10' : existingMediaFiles.some(m => m.media_type === 'image') ? 'border-info bg-info bg-opacity-10' : 'border-secondary'}`}
                    style={{ cursor: isMaxFilesReached ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: isMaxFilesReached ? 0.5 : 1 }}
                    onClick={() => !isMaxFilesReached && imageInputRef.current?.click()}
                    onMouseEnter={(e) => !isMaxFilesReached && imageFiles.length === 0 && (e.currentTarget.style.borderColor = '#0d6efd')}
                    onMouseLeave={(e) => !isMaxFilesReached && imageFiles.length === 0 && !existingMediaFiles.some(m => m.media_type === 'image') && (e.currentTarget.style.borderColor = '')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2 text-secondary">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <div className="fw-semibold mb-2">{t('question.create.image')}</div>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleImageSelect}
                    />
                    {imageFiles.length > 0 ? (
                      <div className="small text-success fw-semibold mb-1">✓ {imageFiles.length}</div>
                    ) : existingMediaFiles.filter(m => m.media_type === 'image').length > 0 ? (
                      <div className="small text-info">{existingMediaFiles.filter(m => m.media_type === 'image').length}</div>
                    ) : (
                      <div className="small text-muted">{t('question.create.clickToUpload')}</div>
                    )}
                    {imageFiles.map((file, idx) => (
                      <div key={idx} className="mt-2 bg-white rounded border p-2">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          style={{ width: '100%', height: 'auto', maxHeight: '150px', objectFit: 'contain', borderRadius: '4px' }}
                          className="mb-2"
                        />
                        <div className="d-flex align-items-center justify-content-between">
                          <div className="small text-truncate flex-grow-1" title={file.name}>{file.name}</div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeImageFile(idx); }}
                            className="btn btn-sm btn-outline-danger ms-2"
                            style={{ padding: '0.1rem 0.3rem', fontSize: '0.75rem' }}
                          >×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div
                    className={`border rounded p-3 text-center ${isMaxFilesReached ? 'border-secondary bg-secondary bg-opacity-10' : audioFiles.length > 0 ? 'border-primary bg-primary bg-opacity-10' : existingMediaFiles.some(m => m.media_type === 'audio') ? 'border-info bg-info bg-opacity-10' : 'border-secondary'}`}
                    style={{ cursor: isMaxFilesReached ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: isMaxFilesReached ? 0.5 : 1 }}
                    onClick={() => !isMaxFilesReached && audioInputRef.current?.click()}
                    onMouseEnter={(e) => !isMaxFilesReached && audioFiles.length === 0 && (e.currentTarget.style.borderColor = '#0d6efd')}
                    onMouseLeave={(e) => !isMaxFilesReached && audioFiles.length === 0 && !existingMediaFiles.some(m => m.media_type === 'audio') && (e.currentTarget.style.borderColor = '')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2 text-secondary">
                      <path d="M9 18V5l12-2v13"></path>
                      <circle cx="6" cy="18" r="3"></circle>
                      <circle cx="18" cy="16" r="3"></circle>
                    </svg>
                    <div className="fw-semibold mb-2">{t('question.create.audio')}</div>
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleAudioSelect}
                    />
                    {audioFiles.length > 0 ? (
                      <div className="small text-success fw-semibold mb-1">✓ {audioFiles.length}</div>
                    ) : existingMediaFiles.filter(m => m.media_type === 'audio').length > 0 ? (
                      <div className="small text-info">{existingMediaFiles.filter(m => m.media_type === 'audio').length}</div>
                    ) : (
                      <div className="small text-muted">{t('question.create.clickToUpload')}</div>
                    )}
                    {audioFiles.map((file, idx) => (
                      <div key={idx} className="d-flex align-items-center justify-content-between mt-2 px-2 py-1 bg-white rounded">
                        <div className="small text-truncate flex-grow-1" title={file.name}>{file.name}</div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeAudioFile(idx); }}
                          className="btn btn-sm btn-outline-danger ms-2"
                          style={{ padding: '0.1rem 0.3rem', fontSize: '0.75rem' }}
                        >×</button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div
                    className={`border rounded p-3 text-center ${isMaxFilesReached ? 'border-secondary bg-secondary bg-opacity-10' : videoFiles.length > 0 ? 'border-primary bg-primary bg-opacity-10' : existingMediaFiles.some(m => m.media_type === 'video') ? 'border-info bg-info bg-opacity-10' : 'border-secondary'}`}
                    style={{ cursor: isMaxFilesReached ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: isMaxFilesReached ? 0.5 : 1 }}
                    onClick={() => !isMaxFilesReached && videoInputRef.current?.click()}
                    onMouseEnter={(e) => !isMaxFilesReached && videoFiles.length === 0 && (e.currentTarget.style.borderColor = '#0d6efd')}
                    onMouseLeave={(e) => !isMaxFilesReached && videoFiles.length === 0 && !existingMediaFiles.some(m => m.media_type === 'video') && (e.currentTarget.style.borderColor = '')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2 text-secondary">
                      <polygon points="23 7 16 12 23 17 23 7"></polygon>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                    </svg>
                    <div className="fw-semibold mb-2">{t('question.create.video')}</div>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleVideoSelect}
                    />
                    {videoFiles.length > 0 ? (
                      <div className="small text-success fw-semibold mb-1">✓ {videoFiles.length}</div>
                    ) : existingMediaFiles.filter(m => m.media_type === 'video').length > 0 ? (
                      <div className="small text-info">{existingMediaFiles.filter(m => m.media_type === 'video').length}</div>
                    ) : (
                      <div className="small text-muted">{t('question.create.clickToUpload')}</div>
                    )}
                    {videoFiles.map((file, idx) => (
                      <div key={idx} className="d-flex align-items-center justify-content-between mt-2 px-2 py-1 bg-white rounded">
                        <div className="small text-truncate flex-grow-1" title={file.name}>{file.name}</div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeVideoFile(idx); }}
                          className="btn btn-sm btn-outline-danger ms-2"
                          style={{ padding: '0.1rem 0.3rem', fontSize: '0.75rem' }}
                        >×</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="form-text mt-2 text-center">
                <div className="mt-1">
                  <strong>{existingMediaFiles.length + imageFiles.length + audioFiles.length + videoFiles.length}/{MAX_FILES_PER_QUESTION}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {quiz?.is_geo && (
          <>
            {qGeolocation ? (
              <LocationPicker
                value={qGeolocation}
                onChange={(location) => {
                  setQGeolocation(location);
                }}
                onRemove={() => {
                  setQGeolocation(null);
                }}
              />
            ) : (
              <div className="mb-3">
                <button
                  type="button"
                  onClick={() => {
                    // Set default location (Belgrade)
                    setQGeolocation({
                      lat: 44.8176,
                      lng: 20.4569,
                      radius: 50,
                      address: ''
                    });
                  }}
                  className="btn btn-outline-primary w-100"
                >
                  <MapPin size={16} className="me-2" style={{ display: 'inline' }} />
                  {t('question.create.pickLocation')}
                </button>
              </div>
            )}
          </>
        )}

        {/* Hints Section */}
        {questionWarning && questionWarning.type === 'hint' && (
          <div id="warning-hint" className="alert alert-warning py-2 mb-2">{t(questionWarning.key, questionWarning.params)}</div>
        )}
        <div className="mb-3">
          <button
            type="button"
            className={`btn w-100 ${hints.length > 0 ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setIsHintsModalOpen(true)}
          >
            <Lightbulb size={18} className="me-2" style={{ display: 'inline' }} />
            {hints.length > 0
              ? `${t('hints.manageHints')} (${hints.length}/3)`
              : `${t('hints.addHints')} (${t('hints.optional')})`
            }
          </button>
          {hints.length > 0 && (
            <small className="text-muted d-block mt-1">
              {hints.length} {hints.length === 1 ? t('hints.hint') : t('hints.hints')} {t('hints.added')}
            </small>
          )}
        </div>

        <HintsModal
          isOpen={isHintsModalOpen}
          onClose={() => setIsHintsModalOpen(false)}
          hints={hints}
          hintTranslations={hintTranslations}
          onChange={handleHintsSave}
          defaultLanguage={quiz?.default_language}
        />

        {/* Translations Section */}
        <TranslationForm
          translations={translations}
          onChange={setTranslations}
          defaultLanguage={quiz?.default_language}
          fields={[
            { name: 'question_text', label: t('translations.questionText'), multiline: true, rows: 3 },
            ...(qType === 'text' ? [{ name: 'correct_answer', label: t('translations.correctAnswer') }] : [])
          ]}
        />

        <div className="d-flex gap-2">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? t('question.edit.saving') : t('question.edit.save')}
          </button>
          <button type="button" onClick={() => navigate(`/quizzes/${quizId}/`)} className="btn btn-secondary">
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
