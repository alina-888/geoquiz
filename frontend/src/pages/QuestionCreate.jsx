import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  const [imageFile, setImageFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
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

  // Helper function to reset all form fields
  const resetForm = () => {
    setQText('');
    setQPoints(10);
    setQType('multiple_choice');
    setQCorrect('');
    setImageFile(null);
    setAudioFile(null);
    setVideoFile(null);
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
        image: imageFile || undefined,
        audio: audioFile || undefined,
        video: videoFile || undefined,
        geolocation: quiz?.is_geo ? (qGeolocation || undefined) : undefined,
      };
      await createQuestion(quiz.id, payload);
      resetForm(); // Use the helper function
      // Refresh quiz details to update question count
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
        image: imageFile || undefined,
        audio: audioFile || undefined,
        video: videoFile || undefined,
        geolocation: quiz?.is_geo ? (qGeolocation || undefined) : undefined,
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
          <label className="form-label d-block">Attach media (one of image, audio, or video)</label>
          <div className="row g-2">
            <div className="col">
              <input 
                ref={imageInputRef}
                type="file" 
                accept="image/*" 
                className="form-control" 
                onChange={(e)=>{ 
                  setImageFile(e.target.files?.[0] || null); 
                  setAudioFile(null); 
                  setVideoFile(null);
                  if (audioInputRef.current) audioInputRef.current.value = '';
                  if (videoInputRef.current) videoInputRef.current.value = '';
                }} 
              />
            </div>
            <div className="col">
              <input 
                ref={audioInputRef}
                type="file" 
                accept="audio/*" 
                className="form-control" 
                onChange={(e)=>{ 
                  setAudioFile(e.target.files?.[0] || null); 
                  setImageFile(null); 
                  setVideoFile(null);
                  if (imageInputRef.current) imageInputRef.current.value = '';
                  if (videoInputRef.current) videoInputRef.current.value = '';
                }} 
              />
            </div>
            <div className="col">
              <input 
                ref={videoInputRef}
                type="file" 
                accept="video/*" 
                className="form-control" 
                onChange={(e)=>{ 
                  setVideoFile(e.target.files?.[0] || null); 
                  setImageFile(null); 
                  setAudioFile(null);
                  if (imageInputRef.current) imageInputRef.current.value = '';
                  if (audioInputRef.current) audioInputRef.current.value = '';
                }} 
              />
            </div>
          </div>
          <div className="form-text">If you choose one, the others will be cleared automatically.</div>
        </div>

        {quiz?.is_geo && (
          <LocationPicker
            value={qGeolocation}
            onChange={(location) => {
              setQGeolocation(location);
            }}
            onRemove={() => {
              setQGeolocation(null);
            }}
          />
        )}

        <div className="d-flex gap-2">
          <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Adding...' : 'Add question'}</button>
          <button type="button" disabled={saving} onClick={onDone} className="btn btn-secondary">Done</button>
        </div>
      </form>
    </div>
  );
}