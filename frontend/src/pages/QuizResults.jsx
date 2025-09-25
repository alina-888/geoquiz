import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getQuizDetail, getQuizProgress } from '../api/api';

export default function QuizResults() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([getQuizDetail(id), getQuizProgress(id)])
      .then(([q, a]) => {
        setQuiz(q);
        setAttempt(a);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load results');
        setLoading(false);
      });
  }, [id]);

  const questionIdToAnswer = useMemo(() => {
    const map = new Map();
    (attempt?.answers || []).forEach(ans => {
      map.set(ans.question, ans);
    });
    return map;
  }, [attempt]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 alert alert-danger">{error}</div>;
  if (!quiz || !attempt) return null;

  return (
    <div className="container mt-4" style={{ maxWidth: '800px' }}>
      <h1 className="mb-3">{quiz.title} — Results</h1>
      <div className="mb-4">
        <span className="me-3">Score: <strong>{attempt.score}</strong></span>
        <span>Completion: <strong>{Math.round(attempt.completion_percentage)}%</strong></span>
      </div>

      {(quiz.questions || []).map((q, idx) => {
        const ans = questionIdToAnswer.get(q.id);
        let userAnswerText = '—';
        let correctAnswerText = '—';

        if (q.question_type === 'multiple_choice') {
          const correct = (q.options || []).find(o => o.is_correct);
          correctAnswerText = correct ? correct.option_text : '—';
          if (ans?.selected_option) {
            const picked = (q.options || []).find(o => o.id === ans.selected_option);
            userAnswerText = picked ? picked.option_text : '—';
          }
        } else {
          correctAnswerText = q.correct_answer ?? '—';
          userAnswerText = ans?.text ?? '—';
        }

        const isCorrect = !!ans?.is_correct;

        return (
          <div key={q.id} className="card mb-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <h5 className="card-title mb-2">{idx + 1}. {q.question_text}</h5>
                <span className={isCorrect ? 'text-success' : 'text-danger'}>
                  {isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </div>
              <div className="row mt-2">
                <div className="col-md-6 mb-2">
                  <div className="text-muted small">Your answer</div>
                  <div>{userAnswerText}</div>
                </div>
                <div className="col-md-6 mb-2">
                  <div className="text-muted small">Correct answer</div>
                  <div>{correctAnswerText}</div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="mt-4">
        <Link to={`/quizzes/${id}/`} className="btn btn-outline-primary">Back to quiz</Link>
      </div>
    </div>
  );
}
