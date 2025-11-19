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
      // Handle various DRF error formats
      if (Array.isArray(errorData)) {
        errorMessage = errorData.join(', ');
      } else if (errorData.detail) {
        errorMessage = errorData.detail;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData.non_field_errors) {
        errorMessage = Array.isArray(errorData.non_field_errors)
          ? errorData.non_field_errors.join(', ')
          : errorData.non_field_errors;
      } else {
        errorMessage = JSON.stringify(errorData);
      }
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
  // If payload has an image file, use FormData
  if (payload.image instanceof File) {
    const form = new FormData();
    Object.keys(payload).forEach(key => {
      if (payload[key] !== null && payload[key] !== undefined) {
        form.append(key, payload[key]);
      }
    });
    return apiRequest('/quizzes/', { method: 'POST', body: form });
  }
  return apiRequest('/quizzes/', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateQuiz(quizId, payload) {
  // If payload has an image file, use FormData
  if (payload.image instanceof File) {
    const form = new FormData();
    Object.keys(payload).forEach(key => {
      if (payload[key] !== null && payload[key] !== undefined) {
        form.append(key, payload[key]);
      }
    });
    return apiRequest(`/quizzes/${quizId}/`, { method: 'PUT', body: form });
  }
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
  form.append('quiz', String(quizId)); // IMPORTANT: Backend needs this!
  form.append('question_text', payload.question_text || '');
  form.append('points_value', String(payload.points_value ?? 10));
  form.append('question_type', payload.question_type || 'multiple_choice');
  if (payload.correct_answer != null) form.append('correct_answer', String(payload.correct_answer));

  // options as JSON string for backend to parse
  if (Array.isArray(payload.options)) {
    form.append('options', JSON.stringify(payload.options));
  }

  // geolocation as JSON string if provided, or explicit null to remove
  if (payload.geolocation !== undefined) {
    if (payload.geolocation === null) {
      form.append('geolocation', 'null');
    } else {
      try {
        form.append('geolocation', JSON.stringify(payload.geolocation));
      } catch (_) {
        // ignore if cannot stringify
      }
    }
  }

  // attach multiple media files (arrays of images, audios, videos)
  if (payload.images && payload.images.length > 0) {
    payload.images.forEach(file => form.append('images', file));
  }
  if (payload.audios && payload.audios.length > 0) {
    payload.audios.forEach(file => form.append('audios', file));
  }
  if (payload.videos && payload.videos.length > 0) {
    payload.videos.forEach(file => form.append('videos', file));
  }

  // attach hints if provided
  if (payload.hints && Array.isArray(payload.hints)) {
    // Send hints metadata as JSON
    const hintsMetadata = payload.hints.map(h => ({
      hint_text: h.hint_text || '',
      points_penalty: h.points_penalty || 5,
      hint_order: h.hint_order || 1
    }));
    form.append('hints', JSON.stringify(hintsMetadata));

    // Attach hint media files with indexed keys
    payload.hints.forEach((hint, idx) => {
      if (hint.hint_image instanceof File) {
        form.append(`hint_${idx}_image`, hint.hint_image);
      }
      if (hint.hint_audio instanceof File) {
        form.append(`hint_${idx}_audio`, hint.hint_audio);
      }
      if (hint.hint_video instanceof File) {
        form.append(`hint_${idx}_video`, hint.hint_video);
      }
    });
  }

  return apiRequest(`/questions/`, {
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

  // geolocation as JSON string if provided, or explicit null to remove
  if (payload.geolocation !== undefined) {
    if (payload.geolocation === null) {
      form.append('geolocation', 'null');
    } else {
      try {
        form.append('geolocation', JSON.stringify(payload.geolocation));
      } catch (_) {
        // ignore if cannot stringify
      }
    }
  }

  // attach multiple media files (arrays of images, audios, videos)
  if (payload.images && payload.images.length > 0) {
    payload.images.forEach(file => form.append('images', file));
  }
  if (payload.audios && payload.audios.length > 0) {
    payload.audios.forEach(file => form.append('audios', file));
  }
  if (payload.videos && payload.videos.length > 0) {
    payload.videos.forEach(file => form.append('videos', file));
  }

  // attach hints if provided
  if (payload.hints && Array.isArray(payload.hints)) {
    // Send hints metadata as JSON
    const hintsMetadata = payload.hints.map(h => ({
      hint_text: h.hint_text || '',
      points_penalty: h.points_penalty || 5,
      hint_order: h.hint_order || 1
    }));
    form.append('hints', JSON.stringify(hintsMetadata));

    // Attach hint media files with indexed keys
    payload.hints.forEach((hint, idx) => {
      if (hint.hint_image instanceof File) {
        form.append(`hint_${idx}_image`, hint.hint_image);
      }
      if (hint.hint_audio instanceof File) {
        form.append(`hint_${idx}_audio`, hint.hint_audio);
      }
      if (hint.hint_video instanceof File) {
        form.append(`hint_${idx}_video`, hint.hint_video);
      }
    });
  }

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

export function deleteQuestionMedia(mediaId) {
  return apiRequest(`/question-media/${mediaId}/`, {
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

export function unlockHint(quizId, questionId, hintId) {
  return apiRequest(`/quizzes/${quizId}/question/${questionId}/hint/${hintId}/unlock/`, {
    method: 'POST',
  });
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

// ============================================
// Translation API functions
// ============================================

// Quiz Translations
export function getQuizTranslations(quizId) {
  return apiRequest(`/quiz-translations/?quiz_id=${quizId}`);
}

export function createQuizTranslation(data) {
  return apiRequest('/quiz-translations/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateQuizTranslation(translationId, data) {
  return apiRequest(`/quiz-translations/${translationId}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteQuizTranslation(translationId) {
  return apiRequest(`/quiz-translations/${translationId}/`, {
    method: 'DELETE',
  });
}

// Question Translations
export function getQuestionTranslations(questionId) {
  return apiRequest(`/question-translations/?question_id=${questionId}`);
}

export function createQuestionTranslation(data) {
  return apiRequest('/question-translations/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateQuestionTranslation(translationId, data) {
  return apiRequest(`/question-translations/${translationId}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteQuestionTranslation(translationId) {
  return apiRequest(`/question-translations/${translationId}/`, {
    method: 'DELETE',
  });
}

// Option Translations
export function getOptionTranslations(optionId) {
  return apiRequest(`/option-translations/?option_id=${optionId}`);
}

export function createOptionTranslation(data) {
  return apiRequest('/option-translations/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateOptionTranslation(translationId, data) {
  return apiRequest(`/option-translations/${translationId}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteOptionTranslation(translationId) {
  return apiRequest(`/option-translations/${translationId}/`, {
    method: 'DELETE',
  });
}

// Hint Translations
export function getHintTranslations(hintId) {
  return apiRequest(`/hint-translations/?hint_id=${hintId}`);
}

export function createHintTranslation(data) {
  return apiRequest('/hint-translations/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateHintTranslation(translationId, data) {
  return apiRequest(`/hint-translations/${translationId}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteHintTranslation(translationId) {
  return apiRequest(`/hint-translations/${translationId}/`, {
    method: 'DELETE',
  });
}