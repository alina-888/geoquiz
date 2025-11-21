import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, Lightbulb } from 'lucide-react';
import { createQuestion, getQuizDetail, createQuestionTranslation, createOptionTranslation, createHintTranslation } from '../api/api';
import LocationPicker from './LocationPicker';
import HintsModal from '../components/HintsModal';
import TranslationForm from '../components/TranslationForm';
import { useTranslation } from 'react-i18next';

export default function QuestionCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const quizId = Number(id);
  const { t } = useTranslation();

  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [questionWarning, setQuestionWarning] = useState(null); // { type: 'option' | 'hint' | 'file', key: string, params?: object }

  const [qText, setQText] = useState('');
  const [qType, setQType] = useState('multiple_choice');
  const [qPoints, setQPoints] = useState(10);
  const [qCorrect, setQCorrect] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [audioFiles, setAudioFiles] = useState([]);
  const [videoFiles, setVideoFiles] = useState([]);
  const [qGeolocation, setQGeolocation] = useState(null);
  const [hints, setHints] = useState([]);
  const [options, setOptions] = useState([
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
  ]);
  const [translations, setTranslations] = useState([]);
  const [optionTranslations, setOptionTranslations] = useState({});  // { optionIndex: [{ language, option_text }] }
  const [hintTranslations, setHintTranslations] = useState({});  // { hintIndex: [{ language, hint_text }] }
  const [isHintsModalOpen, setIsHintsModalOpen] = useState(false);

  // Refs to reset file inputs
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const videoInputRef = useRef(null);

  useEffect(() => {
    if (questionWarning) {
      document.getElementById(`warning-${questionWarning.type}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [questionWarning]);

  useEffect(() => {
    let mounted = true;
    async function fetchQuiz() {
      try {
        const detail = await getQuizDetail(quizId);
        if (mounted) {
          setQuiz(detail);
          // If this quiz is not geo-enabled, ensure any prior geolocation is cleared
          if (!detail?.is_geo) {
            setQGeolocation(null);
          }
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load quiz');
      }
    }
    if (quizId) fetchQuiz();
    return () => {
      mounted = false;
    };
  }, [quizId]);
  
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
  const isMaxFilesReached = imageFiles.length + audioFiles.length + videoFiles.length >= MAX_FILES_PER_QUESTION;

  // Helper functions for file management
  const handleImageSelect = (e) => {
    const newFiles = Array.from(e.target.files || []);
    const currentTotal = imageFiles.length + audioFiles.length + videoFiles.length;
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
    const currentTotal = imageFiles.length + audioFiles.length + videoFiles.length;
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
    const currentTotal = imageFiles.length + audioFiles.length + videoFiles.length;
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

  // Helper function to reset all form fields
  const resetForm = () => {
    setQText('');
    setQPoints(10);
    setQType('multiple_choice');
    setQCorrect('');
    setImageFiles([]);
    setAudioFiles([]);
    setVideoFiles([]);
    setQGeolocation(null);
    setHints([]);
    setOptions([
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
    ]);
    setTranslations([]);
    setOptionTranslations({});
    setHintTranslations({});
    // Reset file input values
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const onAddQuestion = async (e) => {
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
      const createdQuestion = await createQuestion(quiz.id, payload);

      // Save translations if provided
      const validTranslations = translations.filter(
        tr => tr.language && tr.question_text && tr.question_text.trim()
      );

      if (validTranslations.length > 0 && createdQuestion && createdQuestion.id) {
        for (const translation of validTranslations) {
          try {
            await createQuestionTranslation({
              question: createdQuestion.id,
              language: translation.language,
              question_text: translation.question_text,
              correct_answer: translation.correct_answer || ''
            });
          } catch (err) {
            console.error(`Failed to save translation for ${translation.language}:`, err);
          }
        }
      }

      // Save option translations if provided
      if (createdQuestion && createdQuestion.options && Object.keys(optionTranslations).length > 0) {
        console.log('Created question options:', createdQuestion.options);
        console.log('Option translations to save:', optionTranslations);

        for (const [optionIndex, optTrans] of Object.entries(optionTranslations)) {
          // Match by option text since indices may shift after filtering empty options
          const originalOptionText = options[parseInt(optionIndex)]?.option_text;
          const option = createdQuestion.options.find(o => o.option_text === originalOptionText);
          console.log(`Matching option for index ${optionIndex}:`, option);
          if (!option) continue;

          for (const tr of optTrans) {
            if (tr.language && tr.option_text && tr.option_text.trim()) {
              try {
                const payload = {
                  option: option.id,
                  language: tr.language,
                  option_text: tr.option_text
                };
                console.log('Saving option translation:', payload);
                await createOptionTranslation(payload);
              } catch (err) {
                console.error(`Failed to save option translation for ${tr.language}:`, err.message);
              }
            }
          }
        }
      }

      // Save hint translations if provided
      if (createdQuestion && createdQuestion.hints && Object.keys(hintTranslations).length > 0) {
        console.log('Created question hints:', createdQuestion.hints);
        console.log('Hint translations to save:', hintTranslations);

        for (const [hintIndex, hintTrans] of Object.entries(hintTranslations)) {
          // Match by hint_text and hint_order since indices may shift
          const localHint = hints[parseInt(hintIndex)];
          const serverHint = createdQuestion.hints.find(
            h => h.hint_text === localHint?.hint_text && h.hint_order === localHint?.hint_order
          );
          console.log(`Matching hint for index ${hintIndex}:`, serverHint);
          if (!serverHint) continue;

          for (const tr of hintTrans) {
            if (tr.language && tr.hint_text && tr.hint_text.trim()) {
              try {
                const payload = {
                  hint: serverHint.id,
                  language: tr.language,
                  hint_text: tr.hint_text
                };
                console.log('Saving hint translation:', payload);
                await createHintTranslation(payload);
              } catch (err) {
                console.error(`Failed to save hint translation for ${tr.language}:`, err.message);
              }
            }
          }
        }
      }

      resetForm(); // Use the helper function
      // Refresh quiz details to update question count
      window.scrollTo({ top: 0, behavior: 'smooth' });

      try {
        const detail = await getQuizDetail(quiz.id);
        setQuiz(detail);
      } catch (_) {}
    } catch (err) {
      setError(err.message || 'Failed to add question');
    } finally {
      setSaving(false);
    }
  };

  const onDone = async () => {
    if (!quiz) return navigate(`/quizzes/${quizId}/`);
    if (saving) return; // prevent double submit

    // If there's no question text, just navigate away
    if (!qText || qText.trim().length === 0) {
      return navigate(`/quizzes/${quizId}/`);
    }

    // Run same validations as Add
    if (qType === 'multiple_choice') {
      const nonEmptyOptions = options.filter(o => o.option_text.trim().length > 0);
      const hasCorrect = nonEmptyOptions.some(o => o.is_correct);
      if (!hasCorrect) {
        setQuestionWarning({ type: 'option', key: 'question.create.selectCorrectOption' });
        return; // stay on page
      }
    }
    if (qType === 'true_false' && (!qCorrect || String(qCorrect).trim() === '')) {
      setQuestionWarning({ type: 'option', key: 'question.create.selectTrueFalse' });
      return; // stay on page
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
      const createdQuestion = await createQuestion(quiz.id, payload);

      // Save translations if provided
      const validTranslations = translations.filter(
        tr => tr.language && tr.question_text && tr.question_text.trim()
      );

      if (validTranslations.length > 0 && createdQuestion && createdQuestion.id) {
        for (const translation of validTranslations) {
          try {
            await createQuestionTranslation({
              question: createdQuestion.id,
              language: translation.language,
              question_text: translation.question_text,
              correct_answer: translation.correct_answer || ''
            });
          } catch (err) {
            console.error(`Failed to save translation for ${translation.language}:`, err);
          }
        }
      }

      // Save option translations if provided
      if (createdQuestion && createdQuestion.options && Object.keys(optionTranslations).length > 0) {
        console.log('Created question options:', createdQuestion.options);
        console.log('Option translations to save:', optionTranslations);

        for (const [optionIndex, optTrans] of Object.entries(optionTranslations)) {
          // Match by option text since indices may shift after filtering empty options
          const originalOptionText = options[parseInt(optionIndex)]?.option_text;
          const option = createdQuestion.options.find(o => o.option_text === originalOptionText);
          console.log(`Matching option for index ${optionIndex}:`, option);
          if (!option) continue;

          for (const tr of optTrans) {
            if (tr.language && tr.option_text && tr.option_text.trim()) {
              try {
                const payload = {
                  option: option.id,
                  language: tr.language,
                  option_text: tr.option_text
                };
                console.log('Saving option translation:', payload);
                await createOptionTranslation(payload);
              } catch (err) {
                console.error(`Failed to save option translation for ${tr.language}:`, err.message);
              }
            }
          }
        }
      }

      // After successful save, navigate back to quiz
      navigate(`/quizzes/${quizId}/`);
    } catch (err) {
      setError(err.message || 'Failed to add question');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mt-4" style={{ maxWidth: '700px' }}>
      <h1 className="h4 fw-bold mb-2">{t('question.create.title')}</h1>
      {quiz && (
        <div className="alert alert-info mb-3">
          {t('question.create.addingQuestionTo', { number: (quiz?.questions?.length || 0) + 1 })} <strong>{quiz.title}</strong>
        </div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={onAddQuestion}>
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
            <input value={qCorrect} onChange={(e)=>setQCorrect(e.target.value)} className="form-control" placeholder="e.g. Hermione | Hermione Granger" />
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
          <div className="card">
            <div className="card-body p-3">
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <div
                    className={`border rounded p-3 text-center ${isMaxFilesReached ? 'border-secondary bg-secondary bg-opacity-10' : imageFiles.length > 0 ? 'border-primary bg-primary bg-opacity-10' : 'border-secondary'}`}
                    style={{ cursor: isMaxFilesReached ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: isMaxFilesReached ? 0.5 : 1 }}
                    onClick={() => !isMaxFilesReached && imageInputRef.current?.click()}
                    onMouseEnter={(e) => !isMaxFilesReached && imageFiles.length === 0 && (e.currentTarget.style.borderColor = '#0d6efd')}
                    onMouseLeave={(e) => !isMaxFilesReached && imageFiles.length === 0 && (e.currentTarget.style.borderColor = '')}
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
                      <div className="small text-success fw-semibold mb-1">✓ {imageFiles.length} file{imageFiles.length > 1 ? 's' : ''}</div>
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
                    className={`border rounded p-3 text-center ${isMaxFilesReached ? 'border-secondary bg-secondary bg-opacity-10' : audioFiles.length > 0 ? 'border-primary bg-primary bg-opacity-10' : 'border-secondary'}`}
                    style={{ cursor: isMaxFilesReached ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: isMaxFilesReached ? 0.5 : 1 }}
                    onClick={() => !isMaxFilesReached && audioInputRef.current?.click()}
                    onMouseEnter={(e) => !isMaxFilesReached && audioFiles.length === 0 && (e.currentTarget.style.borderColor = '#0d6efd')}
                    onMouseLeave={(e) => !isMaxFilesReached && audioFiles.length === 0 && (e.currentTarget.style.borderColor = '')}
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
                      <div className="small text-success fw-semibold mb-1">✓ {audioFiles.length} file{audioFiles.length > 1 ? 's' : ''}</div>
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
                    className={`border rounded p-3 text-center ${isMaxFilesReached ? 'border-secondary bg-secondary bg-opacity-10' : videoFiles.length > 0 ? 'border-primary bg-primary bg-opacity-10' : 'border-secondary'}`}
                    style={{ cursor: isMaxFilesReached ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: isMaxFilesReached ? 0.5 : 1 }}
                    onClick={() => !isMaxFilesReached && videoInputRef.current?.click()}
                    onMouseEnter={(e) => !isMaxFilesReached && videoFiles.length === 0 && (e.currentTarget.style.borderColor = '#0d6efd')}
                    onMouseLeave={(e) => !isMaxFilesReached && videoFiles.length === 0 && (e.currentTarget.style.borderColor = '')}
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
                      <div className="small text-success fw-semibold mb-1">✓ {videoFiles.length} file{videoFiles.length > 1 ? 's' : ''}</div>
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
                  <strong>{imageFiles.length + audioFiles.length + videoFiles.length}/{MAX_FILES_PER_QUESTION}</strong>
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
                  console.log('Location changed:', location);
                  setQGeolocation(location);
                }}
                onRemove={() => {
                  console.log('Remove location clicked');
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
                <small className="text-muted d-block mt-1">
                  {t('question.create.geoQuizHelpText')}
                </small>
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

        {/* Translation form */}
        <TranslationForm
          translations={translations}
          onChange={setTranslations}
          defaultLanguage={quiz?.default_language}
          fields={[
            { name: 'question_text', label: t('translations.questionText'), multiline: true, rows: 3 },
            ...(qType === 'text' ? [{ name: 'correct_answer', label: t('translations.correctAnswer') }] : [])
          ]}
        />

        <div className="d-flex gap-2 mt-3">
          <button type="submit" disabled={saving} className="btn btn-primary">{saving ? t('question.create.creating') : t('question.create.addAnother')}</button>
          <button type="button" disabled={saving} onClick={onDone} className="btn btn-secondary">{t('question.create.finish')}</button>
        </div>
      </form>
    </div>
  );
}