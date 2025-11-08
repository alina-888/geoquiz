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

  // If body is FormData, omit Content-Type so browser sets proper boundary
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    credentials: 'include',
    headers,
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

export function updateQuiz(quizId, payload) {
  return apiRequest(`/quizzes/${quizId}/`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteQuiz(quizId) {
  return apiRequest(`/quizzes/${quizId}/`, {
    method: 'DELETE'
  });
}

export function createQuestion(quizId, payload) {
  // Accepts plain object; converts to FormData for file upload support
  const form = new FormData();
  form.append('question_text', payload.question_text || '');
  form.append('points_value', String(payload.points_value ?? 10));
  form.append('question_type', payload.question_type || 'multiple_choice');
  if (payload.correct_answer != null) form.append('correct_answer', String(payload.correct_answer));

  // options as JSON string for backend to parse
  if (Array.isArray(payload.options)) {
    form.append('options', JSON.stringify(payload.options));
  }

  // geolocation as JSON string if provided
  if (payload.geolocation) {
    try {
      form.append('geolocation', JSON.stringify(payload.geolocation));
    } catch (_) {
      // ignore if cannot stringify
    }
  }

  // attach at most one media file (one of: image, audio, video)
  if (payload.image) form.append('image', payload.image);
  if (payload.audio) form.append('audio', payload.audio);
  if (payload.video) form.append('video', payload.video);

  return apiRequest(`/quizzes/${quizId}/questions/`, {
    method: 'POST',
    body: form,
  });
}

export function getQuestion(questionId) {
  return apiRequest(`/questions/${questionId}/`);
}

export function updateQuestion(questionId, payload) {
  // Accepts plain object; converts to FormData for file upload support
  const form = new FormData();
  form.append('question_text', payload.question_text || '');
  form.append('points_value', String(payload.points_value ?? 10));
  form.append('question_type', payload.question_type || 'multiple_choice');
  if (payload.correct_answer != null) form.append('correct_answer', String(payload.correct_answer));

  // options as JSON string for backend to parse
  if (Array.isArray(payload.options)) {
    form.append('options', JSON.stringify(payload.options));
  }

  // geolocation as JSON string if provided
  if (payload.geolocation) {
    try {
      form.append('geolocation', JSON.stringify(payload.geolocation));
    } catch (_) {
      // ignore if cannot stringify
    }
  }

  // attach at most one media file (one of: image, audio, video)
  if (payload.image) form.append('image', payload.image);
  if (payload.audio) form.append('audio', payload.audio);
  if (payload.video) form.append('video', payload.video);

  return apiRequest(`/questions/${questionId}/`, {
    method: 'PUT',
    body: form,
  });
}

export function deleteQuestion(questionId) {
  return apiRequest(`/questions/${questionId}/`, {
    method: 'DELETE'
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

// Получить викторины, созданные конкретным пользователем
export function getQuizzesByCreator(userIdOrUsername) {
  // Backend supports filtering by creator id via ?creator=ID.
  // If a username is provided, caller should resolve to id first; here we pass through.
  const query = typeof userIdOrUsername === 'number'
    ? `?creator=${userIdOrUsername}`
    : `?search=${encodeURIComponent(userIdOrUsername)}&ordering=-created_at`;
  return apiRequest(`/quizzes/${query}`);
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