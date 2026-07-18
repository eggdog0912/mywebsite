const usuernameInput = document.getElementById('username');

const passwordInput = document.getElementById('password');

const loginButton = document.getElementById('login-button');

loginButton.addEventListener('click', () => {
    const username = usuernameInput.value;
    const password = passwordInput.value;

    if (username.length < 3 || password.length < 6 ) {
        alert('Username must be at least 3 characters long and password must be at least 6 characters long.');
    } else if (password.length >= 6 && username.length >= 3) {
         localStorage.setItem("username", username);
        window.location.href = 'index.html';
    } else {
        alert('Invalid username or password.');
    }
});

