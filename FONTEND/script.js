(() => {
  const body = document.body;
  const modeToggle = document.getElementById('modeToggle');

  // Tabs
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  // Inputs - Login
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const loginSubmit = document.getElementById('loginSubmit');
  const toggleLoginPassword = document.getElementById('toggleLoginPassword');

  // Inputs - Register
  const registerName = document.getElementById('registerName');
  const registerEmail = document.getElementById('registerEmail');
  const registerPassword = document.getElementById('registerPassword');
  const registerClue = document.getElementById('registerClue');
  const passwordStrengthBar = document.getElementById('passwordStrengthBar');
  const passwordStrengthText = document.getElementById('passwordStrengthText');
  const registerSubmit = document.getElementById('registerSubmit');
  const toggleRegisterPassword = document.getElementById('toggleRegisterPassword');

  // Light/Dark Mode Toggle
  const modeToggleBtn = document.getElementById('modeToggle');

function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light-mode');
    modeToggleBtn.textContent = '🌙'; // Moon for dark mode option
  } else {
    document.body.classList.remove('light-mode');
    modeToggleBtn.textContent = '☀️'; // Sun for light mode option
  }
}

function toggleMode() {
  const currentTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
  localStorage.setItem('theme', newTheme);
}

// Set saved theme on load
window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(savedTheme);
});

// Attach toggle to button
modeToggleBtn.addEventListener('click', toggleMode);
  // Password strength utility
  function checkPasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[\W_]/.test(password)) score++;
    return score;
  }

  function updatePasswordStrength(password) {
    const score = checkPasswordStrength(password);
    const percent = (score / 5) * 100;
    passwordStrengthBar.style.width = percent + '%';

    let color = 'red';
    let text = 'Very weak';
    if (score === 2) { color = 'orange'; text = 'Weak'; }
    else if (score === 3) { color = 'yellow'; text = 'Medium'; }
    else if (score === 4) { color = 'lightgreen'; text = 'Strong'; }
    else if (score === 5) { color = 'green'; text = 'Very strong'; }

    passwordStrengthBar.style.backgroundColor = color;
    passwordStrengthText.textContent = password ? `Password strength: ${text}` : '';
  }

  function validateEmail(input) {
    const val = input.value.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  }

  function validateName(input) {
    return input.value.trim().length >= 3;
  }

  function validatePassword(input) {
    return input.value.length >= 8;
  }

  function updateLoginFormValidity() {
    loginSubmit.disabled = !(validateEmail(loginEmail) && validatePassword(loginPassword));
  }

  function updateRegisterFormValidity() {
    registerSubmit.disabled = !(validateName(registerName) && validateEmail(registerEmail) && validatePassword(registerPassword));
  }

  loginEmail.addEventListener('input', updateLoginFormValidity);
  loginPassword.addEventListener('input', updateLoginFormValidity);
  registerName.addEventListener('input', updateRegisterFormValidity);
  registerEmail.addEventListener('input', updateRegisterFormValidity);
  registerPassword.addEventListener('input', () => {
    updatePasswordStrength(registerPassword.value);
    updateRegisterFormValidity();
  });

  function togglePasswordVisibility(input, toggleBtn) {
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    toggleBtn.textContent = isHidden ? 'Hide' : 'Show';
  }

  toggleLoginPassword?.addEventListener('click', () => togglePasswordVisibility(loginPassword, toggleLoginPassword));
  toggleRegisterPassword?.addEventListener('click', () => togglePasswordVisibility(registerPassword, toggleRegisterPassword));

  function switchTab(toLogin) {
    loginForm?.classList.toggle('active', toLogin);
    registerForm?.classList.toggle('active', !toLogin);
    tabLogin.setAttribute('aria-selected', toLogin);
    tabRegister.setAttribute('aria-selected', !toLogin);
  }

  tabLogin?.addEventListener('click', () => switchTab(true));
  tabRegister?.addEventListener('click', () => switchTab(false));

  // Login submission
  loginForm?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.value.trim(),
          password: loginPassword.value
        })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        alert('Login successful!');
        window.location.href = 'dashboard.html';
      } else {
        alert(data.message || 'Login failed');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  });

  // Register submission
  registerForm?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registerName.value.trim(),
          email: registerEmail.value.trim(),
          password: registerPassword.value,
          clue: registerClue.value.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        alert('Registration successful!');
        window.location.href = 'dashboard.html';
      } else {
        alert(data.message || 'Registration failed');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  });

  // Voice input for name (SpeechRecognition)
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const voiceBtn = document.getElementById('registerVoiceBtn');
    voiceBtn?.addEventListener('click', () => {
      recognition.start();
      voiceBtn.classList.add('listening');
    });

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      registerName.value = transcript;
      updateRegisterFormValidity();
    };

    recognition.onend = () => {
      voiceBtn.classList.remove('listening');
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      voiceBtn.classList.remove('listening');
    };
  } else {
    console.warn('Voice recognition not supported in this browser.');
  }

  // Google Sign-In
  window.handleGoogleCredentialResponse = async (response) => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        alert('Google login successful!');
        window.location.href = 'dashboard.html';
      } else {
        alert(data.message || 'Google login failed');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  window.onload = () => {
    if (window.google && google.accounts) {
      google.accounts.id.initialize({
        client_id: "1022047117481-fk546re2ampg38lfqae8oqu4bkoj4j9t.apps.googleusercontent.com",
        callback: handleGoogleCredentialResponse
      });
      google.accounts.id.renderButton(
        document.getElementById("googleLoginBtn"),
        { theme: "outline", size: "large" }
      );
      google.accounts.id.renderButton(
        document.getElementById("googleRegisterBtn"),
        { theme: "outline", size: "large" }
      );
    }
  };
 })();