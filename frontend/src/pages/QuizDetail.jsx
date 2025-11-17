import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Edit2, Trash2, MapPin, Image, Music, Video } from 'lucide-react';
import { getQuizDetail, startQuiz, deleteQuiz, deleteQuestion } from '../api/api';
import { useTranslation } from 'react-i18next';

export default function QuizDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const username = localStorage.getItem('auth.username');
  const { t } = useTranslation();

  useEffect(() => {
    setLoading(true);
    getQuizDetail(id)
      .then((data) => {
        console.log('Quiz data:', data); // Debug: check creator structure
        setQuiz(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || t('quiz.detail.failedToLoad'));
        setLoading(false);
      });
  }, [id, t]);

  const onStart = async () => {
    try {
      await startQuiz(id);
      navigate(`/quizzes/${id}/start/`);
    } catch (err) {
      setError(err.message || t('quiz.detail.failedToStart'));
    }
  };

  const handleDelete = async () => {
    const questionCount = quiz.questions?.length || 0;
    const confirmMessage = questionCount > 0
      ? t('quiz.detail.deleteWithQuestions', { count: questionCount })
      : t('quiz.detail.deleteConfirm');

    if (window.confirm(confirmMessage)) {
      try {
        await deleteQuiz(id);
        navigate('/');
      } catch (err) {
        setError(err.message || t('quiz.detail.failedToDelete'));
      }
    }
  };

  const handleDeleteQuestion = async (questionId, questionText) => {
    if (window.confirm(t('quiz.detail.deleteQuestionConfirm', { text: questionText.substring(0, 50) }))) {
      try {
        await deleteQuestion(questionId);
        // Refresh quiz data
        const updated = await getQuizDetail(id);
        setQuiz(updated);
      } catch (err) {
        setError(err.message || t('quiz.detail.failedToDeleteQuestion'));
      }
    }
  };

  if (loading) return <div className="p-4">{t('quiz.detail.loading')}</div>;
  if (error) return <div className="p-4 alert alert-danger">{error}</div>;
  if (!quiz) return null;

  // Check if current user is the creator
  const isCreator = quiz.creator_username && quiz.creator_username === username;

  console.log('Current user:', username); // Debug
  console.log('Quiz creator_username:', quiz.creator_username); // Debug
  console.log('Is creator?', isCreator); // Debug

  return (
    <div className="container mt-4" style={{ maxWidth: '700px' }}>
      <div className="card">
        {quiz.image_url && (
          <img
            src={quiz.image_url}
            alt={quiz.title}
            className="card-img-top"
            style={{ maxHeight: '300px', objectFit: 'cover' }}
          />
        )}
        <div className="card-body">
          <h1 className="card-title h4 mb-2">{quiz.title}</h1>
          <p className="card-text mb-3">{quiz.description}</p>
          <div className="mb-3 text-muted">
            {t('quiz.detail.category')}: {t(`categories.${quiz.category}`)} • {t('quiz.detail.difficulty')}: {t(`difficulty.${quiz.difficulty_level}`)}
            {quiz.is_geo && <span className="ms-2 badge bg-info">{t('quiz.detail.geoQuiz')}</span>}
          </div>

          {username ? (
            <div className="d-flex gap-2">
              <button onClick={onStart} className="btn btn-primary">{t('quiz.detail.start')}</button>

              {isCreator && (
                <>
                  <Link to={`/quizzes/${id}/edit`} className="btn btn-warning">
                    <Edit2 size={16} className="me-1" style={{ display: 'inline' }} />
                    {t('quiz.detail.edit')}
                  </Link>
                  <button onClick={handleDelete} className="btn btn-danger">
                    <Trash2 size={16} className="me-1" style={{ display: 'inline' }} />
                    {t('quiz.detail.delete')}
                  </button>
                </>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-outline-primary">{t('quiz.detail.loginToStart')}</Link>
          )}
        </div>
      </div>

      {/* Questions list (for creator only) */}
      {isCreator && quiz.questions && quiz.questions.length > 0 && (
        <div className="card mt-4">
          <div className="card-body">
            <h5 className="card-title mb-3">{t('quiz.detail.questions')} ({quiz.questions.length})</h5>
            <ul className="list-group list-group-flush">
              {quiz.questions.map((q, index) => (
                <li key={q.id} className="list-group-item px-0">
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="mb-1">
                        <strong>Q{index + 1}:</strong> {q.question_text.length > 80 ? q.question_text.substring(0, 80) + '...' : q.question_text}
                      </div>
                      <div className="d-flex gap-2 flex-wrap">
                        <span className="badge bg-secondary">{t(`questionTypes.${q.question_type}`)}</span>
                        <span className="badge bg-primary">{q.points_value} {t('quiz.detail.points')}</span>
                        {q.geolocation && (
                          <span className="badge bg-info">
                            <MapPin size={12} style={{ display: 'inline' }} /> {t('quiz.detail.geo')}
                          </span>
                        )}
                        {/* Show badges for new media_files array */}
                        {q.media_files && q.media_files.filter(m => m.media_type === 'image').length > 0 && (
                          <span className="badge bg-success">
                            <Image size={12} style={{ display: 'inline' }} /> {q.media_files.filter(m => m.media_type === 'image').length} {q.media_files.filter(m => m.media_type === 'image').length > 1 ? t('quiz.detail.images') : t('quiz.detail.image')}
                          </span>
                        )}
                        {q.media_files && q.media_files.filter(m => m.media_type === 'audio').length > 0 && (
                          <span className="badge bg-success">
                            <Music size={12} style={{ display: 'inline' }} /> {q.media_files.filter(m => m.media_type === 'audio').length} {t('quiz.detail.audio')}
                          </span>
                        )}
                        {q.media_files && q.media_files.filter(m => m.media_type === 'video').length > 0 && (
                          <span className="badge bg-success">
                            <Video size={12} style={{ display: 'inline' }} /> {q.media_files.filter(m => m.media_type === 'video').length} {q.media_files.filter(m => m.media_type === 'video').length > 1 ? t('quiz.detail.videos') : t('quiz.detail.video')}
                          </span>
                        )}
                        {/* Fallback for legacy single media */}
                        {(!q.media_files || q.media_files.length === 0) && q.media_type === 'image' && (
                          <span className="badge bg-success">
                            <Image size={12} style={{ display: 'inline' }} /> {t('quiz.detail.image')}
                          </span>
                        )}
                        {(!q.media_files || q.media_files.length === 0) && q.media_type === 'audio' && (
                          <span className="badge bg-success">
                            <Music size={12} style={{ display: 'inline' }} /> {t('quiz.detail.audio')}
                          </span>
                        )}
                        {(!q.media_files || q.media_files.length === 0) && q.media_type === 'video' && (
                          <span className="badge bg-success">
                            <Video size={12} style={{ display: 'inline' }} /> {t('quiz.detail.video')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="d-flex gap-2 ms-3">
                      <Link to={`/quizzes/${id}/questions/${q.id}/edit`} className="btn btn-sm btn-outline-warning">
                        <Edit2 size={14} />
                      </Link>
                      <button
                        onClick={() => handleDeleteQuestion(q.id, q.question_text)}
                        className="btn btn-sm btn-outline-danger"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Add questions button (for creator only) */}
      {isCreator && (
        <div className="mt-3">
          <Link to={`/quizzes/${id}/questions/create/`} className="btn btn-outline-primary">
            {t('quiz.detail.addQuestions')}
          </Link>
        </div>
      )}
    </div>
  );
}
