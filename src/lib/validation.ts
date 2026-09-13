// ==============================================================================
// МОДУЛЬ СТРОГОЙ ВАЛИДАЦИИ ФОРМ (RFC 5322 Email, Пароль, @username, Имя)
// Проект: tobo (Material 3 Expressive)
// Лицензия: Apache License 2.0
// ==============================================================================

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Валидация Email согласно RFC 5322
 */
export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Адрес электронной почты обязателен' };
  }
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Введите корректный адрес электронной почты' };
  }
  return { isValid: true };
}

/**
 * Валидация пароля (минимум 6 символов, отсутствие пробелов)
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'Пароль обязателен для заполнения' };
  }
  if (password.length < 6) {
    return { isValid: false, error: 'Пароль должен содержать минимум 6 символов' };
  }
  if (/\s/.test(password)) {
    return { isValid: false, error: 'Пароль не должен содержать пробелы' };
  }
  return { isValid: true };
}

/**
 * Валидация уникального ника @username (латиница, цифры, _, длина 3-24)
 */
export function validateUsername(username: string): ValidationResult {
  const trimmed = username.trim().toLowerCase();
  if (!trimmed) {
    return { isValid: false, error: 'Юзернейм обязателен для заполнения' };
  }
  if (trimmed.length < 3) {
    return { isValid: false, error: 'Юзернейм не может быть короче 3 символов' };
  }
  if (trimmed.length > 24) {
    return { isValid: false, error: 'Юзернейм не может превышать 24 символа' };
  }
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(trimmed)) {
    return { isValid: false, error: 'Разрешены только буквы латиницы, цифры и символ _' };
  }
  return { isValid: true };
}

/**
 * Валидация обязательного имени
 */
export function validateFirstName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Имя обязательно для заполнения' };
  }
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Имя должно содержать минимум 2 символа' };
  }
  return { isValid: true };
}
