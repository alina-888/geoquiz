import React, { useEffect, useState } from 'react';
import { getQuizzes } from '../api/api';
import { Link } from 'react-router-dom';

export default function Home() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getQuizzes()
      .then(data => {
        setQuizzes(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading quizzes:', error);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-center mt-4">Loading...</p>;

  return (
    <div className="container mt-4">
      {/* Заголовок и кнопка */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 fw-bold">Available Quizzes</h1>
        <Link to="/quizzes/create/" className="btn btn-success">
          Create Quiz
        </Link>
      </div>

      {/* Список викторин */}
      <ul className="list-group">
        {Array.isArray(quizzes?.results ?? quizzes) &&
          (quizzes.results || quizzes).map(quiz => (
            <li key={quiz.id} className="list-group-item d-flex justify-content-between align-items-center">
              <Link to={`/quizzes/${quiz.id}/`} className="text-decoration-none fw-semibold">
                {quiz.title}
              </Link>
              <span className="badge bg-primary rounded-pill">Go</span>
            </li>
          ))}
      </ul>
    </div>
  );
}
