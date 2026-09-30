/**
 * Smart Library — Auth Page Logic
 * Handles login and register form submissions.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in
  if (api.isLoggedIn()) {
    window.location.href = '/dashboard';
    return;
  }

  // ─── Login Form ───
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('button[type="submit"]');
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      clearErrors();

      if (!email) return showFieldError('login-email', 'Email is required');
      if (!password) return showFieldError('login-password', 'Password is required');

      setButtonLoading(btn, true);

      try {
        const data = await api.post('/auth/login', { email, password });
        api.setToken(data.token);
        api.setUser(data.user);

        Toast.success('Welcome back!');

        // Redirect based on role
        setTimeout(() => {
          if (data.user.role === 'admin') {
            window.location.href = '/admin';
          } else if (data.user.role === 'staff') {
            window.location.href = '/staff';
          } else {
            window.location.href = '/dashboard';
          }
        }, 500);
      } catch (err) {
        Toast.error(err.message || 'Login failed');
      } finally {
        setButtonLoading(btn, false);
      }
    });
  }

  // ─── Register Form ───
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = registerForm.querySelector('button[type="submit"]');
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const studentId = document.getElementById('reg-studentId').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const password = document.getElementById('reg-password').value;
      const confirmPassword = document.getElementById('reg-confirm-password').value;

      clearErrors();

      // Validation
      if (!name) return showFieldError('reg-name', 'Name is required');
      if (!email) return showFieldError('reg-email', 'Email is required');
      if (!password) return showFieldError('reg-password', 'Password is required');
      if (password.length < 6) return showFieldError('reg-password', 'Must be at least 6 characters');
      if (password !== confirmPassword) return showFieldError('reg-confirm-password', 'Passwords do not match');

      setButtonLoading(btn, true);

      try {
        const data = await api.post('/auth/register', { name, email, studentId, phone, password });
        api.setToken(data.token);
        api.setUser(data.user);

        Toast.success('Account created! Welcome aboard!');
        setTimeout(() => { window.location.href = '/dashboard'; }, 500);
      } catch (err) {
        Toast.error(err.message || 'Registration failed');
      } finally {
        setButtonLoading(btn, false);
      }
    });
  }

  // ─── Password visibility toggle ───
  document.querySelectorAll('.password-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const input = toggle.previousElementSibling;
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      toggle.textContent = isPassword ? '🙈' : '👁️';
    });
  });
});

// ─── Form error helpers ───
function showFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.classList.add('error');
  const group = input.closest('.form-group');
  if (group) {
    const existing = group.querySelector('.form-error');
    if (existing) existing.remove();
    const err = document.createElement('span');
    err.className = 'form-error';
    err.textContent = message;
    group.appendChild(err);
  }
}

function clearErrors() {
  document.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));
  document.querySelectorAll('.form-error').forEach(el => el.remove());
}
