import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { getQuestion, updateQuestion, getQuizDetail, deleteQuestionMedia } from '../api/api';
import LocationPicker from './LocationPicker';

export default function QuestionEdit() {
  const navigate = useNavigate();
  const { quizId, questionId } = useParams();

  const [quiz, setQuiz] = useState(null);
  const [question, setQuestion] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [questionWarning, setQuestionWarning] = useState('');

  const [qText, setQText] = useState('');
  const [qType, setQType] = useState('multiple_choice');
  const [qPoints, setQPoints] = useState(10);
  const [qCorrect, setQCorrect] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [audioFiles, setAudioFiles] = useState([]);
  const [videoFiles, setVideoFiles] = useState([]);
  const [qGeolocation, setQGeolocation] = useState(null);
  const [existingMediaFiles, setExistingMediaFiles] = useState([]);
  const [options, setOptions] = useState([
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
  ]);

  // Refs to reset file inputs
  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const videoInputRef = useRef(null);

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
            option_text: opt.option_text,
            is_correct: opt.is_correct
          })));
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
    const currentTotal = existingMediaFiles.length + imageFiles.length + audioFiles.length + videoFiles.length;
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
    const currentTotal = existingMediaFiles.length + imageFiles.length + audioFiles.length + videoFiles.length;
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
      await updateQuestion(questionId, payload);
      navigate(`/quizzes/${quizId}/`);
    } catch (err) {
      setError(err.message || 'Failed to update question');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-center mt-4">Loading...</p>;

  if (error && !question) {
    return (
      <div className="container mt-4" style={{ maxWidth: '700px' }}>
        <div className="alert alert-danger">{error}</div>
        <button onClick={() => navigate(`/quizzes/${quizId}/`)} className="btn btn-secondary">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="container mt-4" style={{ maxWidth: '700px' }}>
      <h1 className="h4 fw-bold mb-2">Edit Question</h1>
      {quiz && (
        <div className="alert alert-info">Editing question in: <strong>{quiz.title}</strong></div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={onUpdate}>
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

          {existingMediaFiles.length > 0 && (
            <div className="mb-3">
              <div className="card border-info">
                <div className="card-header bg-info bg-opacity-10">
                  <strong>Existing Media Files ({existingMediaFiles.length})</strong>
                </div>
                <div className="card-body p-2">
                  {existingMediaFiles.map((media) => (
                    <div key={media.id} className="d-flex align-items-center justify-content-between p-2 mb-1 bg-light rounded">
                      <div className="d-flex align-items-center">
                        <span className="badge bg-secondary me-2">{media.media_type}</span>
                        <small className="text-muted">Uploaded {new Date(media.uploaded_at).toLocaleDateString()}</small>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteExistingMedia(media.id)}
                        className="btn btn-sm btn-outline-danger"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
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
                      <div className="small text-success fw-semibold mb-1">✓ {imageFiles.length} new file{imageFiles.length > 1 ? 's' : ''}</div>
                    ) : existingMediaFiles.filter(m => m.media_type === 'image').length > 0 ? (
                      <div className="small text-info">{existingMediaFiles.filter(m => m.media_type === 'image').length} existing</div>
                    ) : (
                      <div className="small text-muted">Click to upload</div>
                    )}
                    {imageFiles.map((file, idx) => (
                      <div key={idx} className="d-flex align-items-center justify-content-between mt-2 px-2 py-1 bg-white rounded">
                        <div className="small text-truncate flex-grow-1" title={file.name}>{file.name}</div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeImageFile(idx); }}
                          className="btn btn-sm btn-outline-danger ms-2"
                          style={{ padding: '0.1rem 0.3rem', fontSize: '0.75rem' }}
                        >×</button>
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
                      <div className="small text-success fw-semibold mb-1">✓ {audioFiles.length} new file{audioFiles.length > 1 ? 's' : ''}</div>
                    ) : existingMediaFiles.filter(m => m.media_type === 'audio').length > 0 ? (
                      <div className="small text-info">{existingMediaFiles.filter(m => m.media_type === 'audio').length} existing</div>
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
                      <div className="small text-success fw-semibold mb-1">✓ {videoFiles.length} new file{videoFiles.length > 1 ? 's' : ''}</div>
                    ) : existingMediaFiles.filter(m => m.media_type === 'video').length > 0 ? (
                      <div className="small text-info">{existingMediaFiles.filter(m => m.media_type === 'video').length} existing</div>
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
                  <strong>{existingMediaFiles.length + imageFiles.length + audioFiles.length + videoFiles.length}/{MAX_FILES_PER_QUESTION}</strong> files attached
                  {existingMediaFiles.length + imageFiles.length + audioFiles.length + videoFiles.length >= MAX_FILES_PER_QUESTION && (
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
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? 'Updating...' : 'Update Question'}
          </button>
          <button type="button" onClick={() => navigate(`/quizzes/${quizId}/`)} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
