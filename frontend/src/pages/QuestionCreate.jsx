import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { createQuestion, getQuizDetail } from '../api/api';
import LocationPicker from './LocationPicker';

export default function QuestionCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const quizId = Number(id);

  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [questionWarning, setQuestionWarning] = useState('');

  const [qText, setQText] = useState('');
  const [qType, setQType] = useState('multiple_choice');
  const [qPoints, setQPoints] = useState(10);
  const [qCorrect, setQCorrect] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [audioFiles, setAudioFiles] = useState([]);
  const [videoFiles, setVideoFiles] = useState([]);
  const [qGeolocation, setQGeolocation] = useState(null);
  const [options, setOptions] = useState([
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
  ]);
  
  // Refs to reset file inputs
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const videoInputRef = useRef(null);

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
      setQuestionWarning(`Maximum ${MAX_FILES_PER_QUESTION} files per question reached.`);
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }

    const filesToAdd = newFiles.slice(0, remainingSlots);
    if (filesToAdd.length < newFiles.length) {
      setQuestionWarning(`Only ${filesToAdd.length} file(s) added. Maximum ${MAX_FILES_PER_QUESTION} files per question.`);
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
      setQuestionWarning(`Maximum ${MAX_FILES_PER_QUESTION} files per question reached.`);
      if (audioInputRef.current) audioInputRef.current.value = '';
      return;
    }

    const filesToAdd = newFiles.slice(0, remainingSlots);
    if (filesToAdd.length < newFiles.length) {
      setQuestionWarning(`Only ${filesToAdd.length} file(s) added. Maximum ${MAX_FILES_PER_QUESTION} files per question.`);
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
      setQuestionWarning(`Maximum ${MAX_FILES_PER_QUESTION} files per question reached.`);
      if (videoInputRef.current) videoInputRef.current.value = '';
      return;
    }

    const filesToAdd = newFiles.slice(0, remainingSlots);
    if (filesToAdd.length < newFiles.length) {
      setQuestionWarning(`Only ${filesToAdd.length} file(s) added. Maximum ${MAX_FILES_PER_QUESTION} files per question.`);
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
    setOptions([
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
    ]);
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
        setQuestionWarning('Please select at least one correct option for multiple choice.');
        return;
      }
    }
    if (qType === 'true_false' && (!qCorrect || String(qCorrect).trim() === '')) {
      setQuestionWarning('Please select True or False as the correct answer.');
      return;
    }
    setSaving(true);
    setError('');
    setQuestionWarning('');
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
      };
      await createQuestion(quiz.id, payload);
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
        setQuestionWarning('Please select at least one correct option for multiple choice.');
        return; // stay on page
      }
    }
    if (qType === 'true_false' && (!qCorrect || String(qCorrect).trim() === '')) {
      setQuestionWarning('Please select True or False as the correct answer.');
      return; // stay on page
    }

    setSaving(true);
    setError('');
    setQuestionWarning('');
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
      };
      await createQuestion(quiz.id, payload);
      // After successful save, navigate away
      navigate(`/quizzes/${quizId}/`);
    } catch (err) {
      setError(err.message || 'Failed to add question');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mt-4" style={{ maxWidth: '700px' }}>
      <h1 className="h4 fw-bold mb-2">Add Questions</h1>
      <div className="text-muted mb-3">Creating question #{(quiz?.questions?.length || 0) + 1}</div>
      {quiz && (
        <div className="alert alert-info">Adding questions to: <strong>{quiz.title}</strong></div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={onAddQuestion}>
        <div className="mb-3">
          <label className="form-label">Question text</label>
          <textarea value={qText} onChange={(e)=>setQText(e.target.value)} className="form-control" rows={3} required />
        </div>

        <div className="row mb-3">
          <div className="col">
            <label className="form-label">Type</label>
            <select value={qType} onChange={(e)=>setQType(e.target.value)} className="form-select">
              <option value="multiple_choice">Multiple Choice</option>
              <option value="text">Text</option>
              <option value="true_false">True/False</option>
            </select>
          </div>
          <div className="col">
            <label className="form-label">Points</label>
            <input type="number" value={qPoints} onChange={(e)=>setQPoints(Number(e.target.value))} className="form-control" />
          </div>
        </div>

        {qType === 'text' ? (
          <div className="mb-3">
            <label className="form-label">Correct answer</label>
            <input value={qCorrect} onChange={(e)=>setQCorrect(e.target.value)} className="form-control" />
          </div>
        ) : qType === 'true_false' ? (
          <div className="mb-3">
            <label className="form-label d-block">Correct answer</label>
            {questionWarning && (
              <div className="alert alert-warning py-2 mb-2">{questionWarning}</div>
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
              <label className="form-check-label" htmlFor="tf-true">True</label>
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
              <label className="form-check-label" htmlFor="tf-false">False</label>
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <label className="form-label">Options</label>
            {questionWarning && (
              <div className="alert alert-warning py-2 mb-2">{questionWarning}</div>
            )}
            {options.map((opt, idx) => (
              <div key={idx} className="d-flex align-items-center mb-2 gap-2">
                <input
                  value={opt.option_text}
                  onChange={(e)=>updateOption(idx, 'option_text', e.target.value)}
                  className="form-control"
                  placeholder={`Option ${idx+1}`}
                />
                <div className="form-check mb-0">
                  <input type="checkbox" checked={opt.is_correct} onChange={(e)=>updateOption(idx, 'is_correct', e.target.checked)} className="form-check-input" id={`opt-${idx}`} />
                  <label className="form-check-label" htmlFor={`opt-${idx}`}>Correct</label>
                </div>
                <button type="button" onClick={()=>removeOption(idx)} className="btn btn-outline-danger btn-sm">Remove</button>
              </div>
            ))}
            <button type="button" onClick={addOption} className="btn btn-link p-0">+ Add option</button>
          </div>
        )}

        <div className="mb-3">
          <label className="form-label d-block fw-semibold">Media Attachments</label>
          {questionWarning && (
            <div className="alert alert-warning py-2 mb-2">{questionWarning}</div>
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
                    <div className="fw-semibold mb-2">Images</div>
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
                      <div className="small text-muted">Click to upload</div>
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
                    <div className="fw-semibold mb-2">Audio</div>
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
                      <div className="small text-muted">Click to upload</div>
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
                    <div className="fw-semibold mb-2">Videos</div>
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
                      <div className="small text-muted">Click to upload</div>
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
                Click a card to upload multiple files. You can attach images, audio, and videos together.
                <div className="mt-1">
                  <strong>{imageFiles.length + audioFiles.length + videoFiles.length}/{MAX_FILES_PER_QUESTION}</strong> files attached
                  {imageFiles.length + audioFiles.length + videoFiles.length >= MAX_FILES_PER_QUESTION && (
                    <span className="text-warning ms-2">(Maximum reached)</span>
                  )}
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
                  Add Location to Question
                </button>
                <small className="text-muted d-block mt-1">
                  This is a geo quiz. You can optionally add a location requirement to this question.
                </small>
              </div>
            )}
          </>
        )}

        <div className="d-flex gap-2">
          <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Adding...' : 'Add question'}</button>
          <button type="button" disabled={saving} onClick={onDone} className="btn btn-secondary">Done</button>
        </div>
      </form>
    </div>
  );
}