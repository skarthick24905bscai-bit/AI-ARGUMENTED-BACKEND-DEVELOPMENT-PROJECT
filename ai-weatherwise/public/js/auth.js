/**
 * AI WeatherWise - Authentication Scripts
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  // Handle Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Authenticating...';

        const res = await api.post('/auth/login', { email, password });
        if (res.success) {
          api.setToken(res.token);
          api.setUser(res.data);
          api.showAlert('alertContainer', 'Login successful! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = res.data.role === 'admin' ? '/admin.html' : '/dashboard.html';
          }, 800);
        }
      } catch (err) {
        api.showAlert('alertContainer', err.message || 'Login failed. Please verify credentials.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    });
  }

  // Handle Registration
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const role = document.getElementById('role') ? document.getElementById('role').value : 'reader';
      const submitBtn = registerForm.querySelector('button[type="submit"]');

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account...';

        const res = await api.post('/auth/register', { name, email, password, role });
        if (res.success) {
          api.setToken(res.token);
          api.setUser(res.data);
          api.showAlert('alertContainer', 'Account created successfully! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = res.data.role === 'admin' ? '/admin.html' : '/dashboard.html';
          }, 800);
        }
      } catch (err) {
        api.showAlert('alertContainer', err.message || 'Registration failed. Try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
    });
  }
});

// Demo Credentials Filler
window.fillDemoCredentials = (role) => {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  if (!emailInput || !passwordInput) return;

  if (role === 'admin') {
    emailInput.value = 'admin@weatherwise.ai';
    passwordInput.value = 'Admin@123';
  } else {
    emailInput.value = 'reader@weatherwise.ai';
    passwordInput.value = 'Reader@123';
  }
};
