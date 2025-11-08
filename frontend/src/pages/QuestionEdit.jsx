import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { getQuestion, updateQuestion, getQuizDetail } from '../api/api';
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
  const [imageFile, setImageFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [qGeolocation, setQGeolocation] = useState(null);
  const [existingMedia, setExistingMedia] = useState(null);
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

        // Set existing media info
        if (questionDetail.has_media) {
          setExistingMedia({
            type: questionDetail.media_type,
            url: questionDetail.media_url
          });
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
        image: imageFile || undefined,
        audio: audioFile || undefined,
        video: videoFile || undefined,
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
          <label className="form-label d-block fw-semibold">Media Attachment</label>

          {existingMedia && !imageFile && !audioFile && !videoFile && (
            <div className="alert alert-info py-2 mb-2 d-flex align-items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>Current media: <strong>{existingMedia.type}</strong> <small className="text-muted">(Upload new file to replace)</small></span>
            </div>
          )}

          <div className="card">
            <div className="card-body p-3">
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <div
                    className={`border rounded p-3 text-center ${imageFile ? 'border-primary bg-primary bg-opacity-10' : existingMedia?.type === 'image' ? 'border-info bg-info bg-opacity-10' : 'border-secondary'}`}
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => imageInputRef.current?.click()}
                    onMouseEnter={(e) => !imageFile && (e.currentTarget.style.borderColor = '#0d6efd')}
                    onMouseLeave={(e) => !imageFile && existingMedia?.type !== 'image' && (e.currentTarget.style.borderColor = '')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2 text-secondary">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <div className="fw-semibold mb-2">Image</div>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e)=>{
                        setImageFile(e.target.files?.[0] || null);
                        setAudioFile(null);
                        setVideoFile(null);
                        if (audioInputRef.current) audioInputRef.current.value = '';
                        if (videoInputRef.current) videoInputRef.current.value = '';
                      }}
                    />
                    {imageFile ? (
                      <>
                        <div className="small text-success fw-semibold mb-1">✓ New file</div>
                        <div className="small text-truncate text-muted" title={imageFile.name}>{imageFile.name}</div>
                      </>
                    ) : existingMedia?.type === 'image' ? (
                      <div className="small text-info">Current file</div>
                    ) : (
                      <div className="small text-muted">Click to upload</div>
                    )}
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div
                    className={`border rounded p-3 text-center ${audioFile ? 'border-primary bg-primary bg-opacity-10' : existingMedia?.type === 'audio' ? 'border-info bg-info bg-opacity-10' : 'border-secondary'}`}
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => audioInputRef.current?.click()}
                    onMouseEnter={(e) => !audioFile && (e.currentTarget.style.borderColor = '#0d6efd')}
                    onMouseLeave={(e) => !audioFile && existingMedia?.type !== 'audio' && (e.currentTarget.style.borderColor = '')}
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
                      style={{ display: 'none' }}
                      onChange={(e)=>{
                        setAudioFile(e.target.files?.[0] || null);
                        setImageFile(null);
                        setVideoFile(null);
                        if (imageInputRef.current) imageInputRef.current.value = '';
                        if (videoInputRef.current) videoInputRef.current.value = '';
                      }}
                    />
                    {audioFile ? (
                      <>
                        <div className="small text-success fw-semibold mb-1">✓ New file</div>
                        <div className="small text-truncate text-muted" title={audioFile.name}>{audioFile.name}</div>
                      </>
                    ) : existingMedia?.type === 'audio' ? (
                      <div className="small text-info">Current file</div>
                    ) : (
                      <div className="small text-muted">Click to upload</div>
                    )}
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div
                    className={`border rounded p-3 text-center ${videoFile ? 'border-primary bg-primary bg-opacity-10' : existingMedia?.type === 'video' ? 'border-info bg-info bg-opacity-10' : 'border-secondary'}`}
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => videoInputRef.current?.click()}
                    onMouseEnter={(e) => !videoFile && (e.currentTarget.style.borderColor = '#0d6efd')}
                    onMouseLeave={(e) => !videoFile && existingMedia?.type !== 'video' && (e.currentTarget.style.borderColor = '')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2 text-secondary">
                      <polygon points="23 7 16 12 23 17 23 7"></polygon>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                    </svg>
                    <div className="fw-semibold mb-2">Video</div>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      style={{ display: 'none' }}
                      onChange={(e)=>{
                        setVideoFile(e.target.files?.[0] || null);
                        setImageFile(null);
                        setAudioFile(null);
                        if (imageInputRef.current) imageInputRef.current.value = '';
                        if (audioInputRef.current) audioInputRef.current.value = '';
                      }}
                    />
                    {videoFile ? (
                      <>
                        <div className="small text-success fw-semibold mb-1">✓ New file</div>
                        <div className="small text-truncate text-muted" title={videoFile.name}>{videoFile.name}</div>
                      </>
                    ) : existingMedia?.type === 'video' ? (
                      <div className="small text-info">Current file</div>
                    ) : (
                      <div className="small text-muted">Click to upload</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="form-text mt-2 text-center">
                Click a card to upload. Selecting a new file will clear the others.
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
