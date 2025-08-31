import { validateRequiredFields } from './validateRequiredFields.js';

describe('validateRequiredFields', () => {
  test('throws an error when a required field is missing', () => {
    expect(() => validateRequiredFields({ email: '', password: '123' })).toThrow(
      'email is required',
    );
  });

  test('treats whitespace-only strings as missing', () => {
    expect(() =>
      validateRequiredFields({ email: '   ', password: '123' }),
    ).toThrow('email is required');
  });

  test('does not throw when all fields are provided', () => {
    expect(() => validateRequiredFields({ email: 'a', password: '123' })).not.toThrow();
  });
});
