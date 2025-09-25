const API_URL = 'http://localhost:8000/api';

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

export async function apiRequest(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const isUnsafe = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const csrfToken = isUnsafe ? getCookie('csrftoken') : undefined;

  const response = await fetch(`${API_URL}${endpoint}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorMessage = 'API error';
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.error || JSON.stringify(errorData);
    } catch (_) {}
    throw new Error(errorMessage);
  }

  // Some endpoints may return empty 204
  if (response.status === 204) return null;
  return response.json();
}

// import { apiRequest } from './api';

export function getQuizzes() {
  return apiRequest('/quizzes/');
}

export function getQuizDetail(quizId) {
  return apiRequest(`/quizzes/${quizId}/`);
}

export function createQuiz(payload) {
  return apiRequest('/quizzes/', { method: 'POST', body: JSON.stringify(payload) });
}

export function createQuestion(quizId, payload) {
  return apiRequest(`/quizzes/${quizId}/questions/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function startQuiz(quizId) {
  return apiRequest(`/quizzes/${quizId}/start/`, { method: 'POST' });
}

export function getQuizProgress(quizId) {
  return apiRequest(`/quizzes/${quizId}/progress/`);
}

export function getQuizQuestion(quizId, questionId) {
  return apiRequest(`/quizzes/${quizId}/question/${questionId}/`);
}

export function answerQuizQuestion(quizId, questionId, data) {
  return apiRequest(`/quizzes/${quizId}/question/${questionId}/answer/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function completeQuiz(quizId) {
  return apiRequest(`/quizzes/${quizId}/complete/`, { method: 'POST' });
}

// Логин
export function loginUser(username, password) {
    return apiRequest('/users/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }
  
// Регистрация
export function registerUser({ username, email, password }) {
  return apiRequest('/users/register/', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
}

// Логаут
export function logoutUser() {
    return apiRequest('/users/logout/', {
        method: 'POST',
    });
}

// Получить профиль
export function fetchUserProfile(username) {
  return apiRequest(`/users/profile/${encodeURIComponent(username)}`);
}

// Обновить профиль (partial)
export function updateUserProfile(username, data) {
  return apiRequest(`/users/profile/${encodeURIComponent(username)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}