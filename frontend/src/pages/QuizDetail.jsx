import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getQuizDetail, startQuiz } from '../api/api';

export default function QuizDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const username = localStorage.getItem('auth.username');

  useEffect(() => {
    setLoading(true);
    getQuizDetail(id)
      .then((data) => {
        setQuiz(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load quiz');
        setLoading(false);
      });
  }, [id]);

  const onStart = async () => {
    try {
      await startQuiz(id);
      navigate(`/quizzes/${id}/start/`);
    } catch (err) {
      setError(err.message || 'Failed to start quiz');
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 alert alert-danger">{error}</div>;
  if (!quiz) return null;

  return (
    <div className="container mt-4" style={{ maxWidth: '700px' }}>
      <div className="card">
        <div className="card-body">
          <h1 className="card-title h4 mb-2">{quiz.title}</h1>
          <p className="card-text mb-3">{quiz.description}</p>
          <div className="mb-3 text-muted">
            Category: {quiz.category} • Difficulty: {quiz.difficulty_level}
          </div>

          {username ? (
            <button onClick={onStart} className="btn btn-primary">Start</button>
          ) : (
            <Link to="/login" className="btn btn-outline-primary">Login to start</Link>
          )}
        </div>
      </div>
    </div>
  );
}
