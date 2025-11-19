import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getQuizQuestion, answerQuizQuestion, getQuizDetail, getQuizProgress, unlockHint } from '../api/api';
import 'bootstrap/dist/css/bootstrap.min.css';
import LocationStatus from '../components/LocationStatus';
import AudioPlayer from '../components/AudioPlayer';
import VideoPlayer from '../components/VideoPlayer';
import ImageModal from '../components/ImageModal';
import HintsMenu from '../components/HintsMenu';
import { isDebugMode, getCurrentPosition, calculateDistance, isWithinRadius } from '../utils/geolocation';
import { getTranslatedText } from '../utils/translations';

export default function Question() {
  const { id, questionId } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const [question, setQuestion] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [modalImages, setModalImages] = useState([]);
  const [modalIndex, setModalIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [tfAnswer, setTfAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Geolocation state
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [distanceToTarget, setDistanceToTarget] = useState(null);

  // Resolve absolute media URL if backend returned a relative path
  const resolveMediaUrl = (url) => {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/media/')) return `http://localhost:8000${url}`; // dev default
    return url;
  };

  // Check user's location and determine if question is locked
  const checkLocation = async () => {
    if (!question || !question.geolocation) {
      // Question doesn't have geolocation, so it's unlocked
      setIsLocked(false);
      return;
    }

    // Check DEBUG mode
    if (isDebugMode()) {
      console.log('DEBUG mode enabled - bypassing location check');
      setIsLocked(false);
      return;
    }

    // Check if quiz creator is viewing their own quiz
    const currentUser = localStorage.getItem('auth.username');
    if (quiz && quiz.creator && quiz.creator.username === currentUser) {
      console.log('Quiz creator viewing own quiz - bypassing location check');
      setIsLocked(false);
      return;
    }

    setIsCheckingLocation(true);
    setLocationError('');

    try {
      const position = await getCurrentPosition();
      setUserLocation(position);

      const distance = calculateDistance(
        position.lat,
        position.lng,
        question.geolocation.lat,
        question.geolocation.lng
      );

      setDistanceToTarget(distance);

      const withinRadius = isWithinRadius(position, question.geolocation);
      setIsLocked(!withinRadius);

      if (withinRadius) {
        console.log('User is within radius - question unlocked');
      } else {
        console.log(`User is ${distance.toFixed(0)}m away - question locked`);
      }
    } catch (err) {
      console.error('Location error:', err);
      setLocationError(err.message);
      // If we can't get location, lock the question
      setIsLocked(true);
    } finally {
      setIsCheckingLocation(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([getQuizDetail(id), getQuizQuestion(id, questionId), getQuizProgress(id)])
      .then(([q, qu, att]) => {
        setQuiz(q);
        setQuestion(qu);
        setAttempt(att);
        setLoading(false);
        // Reset local answer state when question changes
        setSelectedOption(null);
        setTextAnswer('');
        setTfAnswer('');
      })
      .catch((err) => {
        setError(err.message || 'Failed to load question');
        setLoading(false);
      });
  }, [id, questionId]);

  // Check location when question and quiz are loaded
  useEffect(() => {
    if (question && quiz && !loading) {
      checkLocation();
    }
  }, [question, quiz, loading]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      let payload;
      if (question.question_type === 'multiple_choice') {
        payload = { option: selectedOption };
      } else if (question.question_type === 'true_false') {
        payload = { text: tfAnswer };
      } else {
        payload = { text: textAnswer };
      }
      await answerQuizQuestion(id, questionId, payload);
      const updated = await getQuizProgress(id);
      const answeredIds = new Set((updated.answers || []).map(a => a.question));
      const next = (quiz.questions || []).find(q => !answeredIds.has(q.id));
      if (next) navigate(`/quizzes/${id}/question/${next.id}/`);
      else navigate(`/quizzes/${id}/complete/`);
    } catch (err) {
      setError(err.message || 'Failed to submit answer');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlockHint = async (hintId) => {
    try {
      await unlockHint(id, questionId, hintId);
      // Refresh question and attempt data to show updated hints and score
      const [updatedQuestion, updatedAttempt] = await Promise.all([
        getQuizQuestion(id, questionId),
        getQuizProgress(id)
      ]);
      setQuestion(updatedQuestion);
      setAttempt(updatedAttempt);
    } catch (err) {
      setError(err.message || 'Failed to unlock hint');
    }
  };

  if (loading) return <p className="text-center mt-4">Loading...</p>;
  if (error) return <div className="alert alert-danger mt-4">{error}</div>;
  if (!question) return null;

  return (
    <div className="container mt-4" style={{ maxWidth: '700px' }}>
      {/* Show checking location state */}
      {isCheckingLocation && (
        <div className="alert alert-info">
          Checking your location...
        </div>
      )}

      {/* Show location error if any */}
      {locationError && (
        <div className="alert alert-danger">
          <strong>Location Error:</strong> {locationError}
        </div>
      )}

      {/* Show location status if question has geolocation */}
      {question.geolocation && (
        <LocationStatus
          isLocked={isLocked}
          distance={distanceToTarget}
          targetLocation={question.geolocation}
          userLocation={userLocation}
          onRefresh={checkLocation}
          isRefreshing={isCheckingLocation}
        />
      )}

      {/* Only show question content if not locked */}
      {!isLocked && (
        <div className="card shadow-sm">
          <div className="card-body">
            <h1 className="h4 fw-bold mb-3">{getTranslatedText(question, 'question_text', currentLanguage)}</h1>

          {/* Display multiple media files from media_files array */}
          {question.media_files && question.media_files.length > 0 && (
            <div className="mb-4">
              {question.media_files.map((media, idx) => (
                <div key={media.id || idx} className="mb-3">
                  {media.media_type === 'image' && (
                    <div className="border rounded p-3 bg-light">
                      <div className="text-center">
                        <img
                          src={resolveMediaUrl(media.file_url)}
                          alt={`Question media ${idx + 1}`}
                          className="img-fluid rounded shadow-sm"
                          style={{ maxHeight: '400px', objectFit: 'contain', cursor: 'zoom-in' }}
                          onClick={() => {
                            const allImages = question.media_files
                              .filter(m => m.media_type === 'image')
                              .map((m, i) => ({
                                src: resolveMediaUrl(m.file_url),
                                alt: `Question media ${i + 1}`
                              }));
                            const clickedIndex = question.media_files.filter(m => m.media_type === 'image').findIndex(m => m.id === media.id);
                            setModalImages(allImages);
                            setModalIndex(clickedIndex);
                          }}
                          title="Click to enlarge"
                        />
                      </div>
                    </div>
                  )}
                  {media.media_type === 'audio' && (
                    <AudioPlayer
                      src={resolveMediaUrl(media.file_url)}
                      label={question.media_files.length > 1 ? `Audio Clip #${idx + 1}` : 'Audio Clip'}
                    />
                  )}
                  {media.media_type === 'video' && (
                    <VideoPlayer src={resolveMediaUrl(media.file_url)} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Fallback: Display legacy single media if no media_files array */}
          {(!question.media_files || question.media_files.length === 0) && question.has_media && (
            <div className="mb-4">
              {question.media_type === 'image' && (
                <div className="border rounded p-3 bg-light">
                  <div className="text-center">
                    <img
                      src={resolveMediaUrl(question.media_url)}
                      alt="Question media"
                      className="img-fluid rounded shadow-sm"
                      style={{ maxHeight: '400px', objectFit: 'contain', cursor: 'zoom-in' }}
                      onClick={() => {
                        setModalImages([{ src: resolveMediaUrl(question.media_url), alt: 'Question media' }]);
                        setModalIndex(0);
                      }}
                      title="Click to enlarge"
                    />
                  </div>
                </div>
              )}
              {question.media_type === 'audio' && (
                <AudioPlayer
                  src={resolveMediaUrl(question.media_url)}
                  label="Audio Clip"
                />
              )}
              {question.media_type === 'video' && (
                <VideoPlayer src={resolveMediaUrl(question.media_url)} />
              )}
            </div>
          )}

          <form onSubmit={onSubmit}>
            {question.question_type === 'multiple_choice' ? (
              <div className="mb-3">
                {(question.options || []).map(opt => (
                  <div className="form-check" key={opt.id}>
                    <input
                      className="form-check-input"
                      type="radio"
                      name="option"
                      value={opt.id}
                      id={`option-${opt.id}`}
                      onChange={() => setSelectedOption(opt.id)}
                    />
                    <label className="form-check-label" htmlFor={`option-${opt.id}`}>
                      {getTranslatedText(opt, 'option_text', currentLanguage)}
                    </label>
                  </div>
                ))}
              </div>
            ) : question.question_type === 'true_false' ? (
              <div className="mb-3">
                <label className="form-label d-block">Your answer</label>
                <div className="form-check form-check-inline">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="tf-answer"
                    id="tf-true"
                    value="true"
                    checked={tfAnswer === 'true'}
                    onChange={(e) => setTfAnswer(e.target.value)}
                  />
                  <label className="form-check-label" htmlFor="tf-true">True</label>
                </div>
                <div className="form-check form-check-inline">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="tf-answer"
                    id="tf-false"
                    value="false"
                    checked={tfAnswer === 'false'}
                    onChange={(e) => setTfAnswer(e.target.value)}
                  />
                  <label className="form-check-label" htmlFor="tf-false">False</label>
                </div>
              </div>
            ) : (
              <div className="mb-3">
                <label className="form-label">Your answer</label>
                <textarea
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  className="form-control"
                  rows={4}
                />
              </div>
            )}

            <button type="submit" disabled={saving || (question.question_type === 'multiple_choice' && !selectedOption) || (question.question_type === 'true_false' && !tfAnswer)} className="btn btn-primary">
              {saving ? 'Submitting...' : 'Submit'}
            </button>
          </form>
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

      {/* Hints Menu - only show if question is unlocked and has hints */}
      {!isLocked && question.hints && question.hints.length > 0 && (
        <HintsMenu
          hints={question.hints}
          onUnlockHint={handleUnlockHint}
          currentScore={attempt?.score}
        />
      )}
    </div>
  );
}
