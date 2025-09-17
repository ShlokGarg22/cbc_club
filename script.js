// Simplified WebDecryption Round 1 Logic
// Minimal version: click login 4 times to reveal password, then submit correct creds.

const CORRECT_USERNAME = "hacker22"; // Hidden via data-pos* attributes in HTML
const CORRECT_PASSWORD = "phantom_key_2024";
const FLAG = "cbc{hacker22_phantom_key_2024}";

let clickCount = 0;
let passwordRevealed = false;

// Cache DOM
const form = document.getElementById('loginForm');
const msg = document.getElementById('message');
const userEl = document.getElementById('username');
const passEl = document.getElementById('password');

function setMessage(html, type = '') {
	msg.className = type ? `message ${type}` : 'message';
	msg.innerHTML = html;
}

function revealPassword() {
	passwordRevealed = true;
	console.log('--- PASSWORD REVEALED ---');
	console.log('Password:', CORRECT_PASSWORD);
	console.log('Username characters are in data-pos1..data-pos8 attributes.');
	setMessage('<p>✅ Password revealed! Check the console.</p>', 'info');
}

function handleAttempt(username, password) {
	if (!passwordRevealed) {
		if (clickCount < 4) {
			setMessage('<p>🔍 Keep exploring... ', 'info');
		} else {
			setMessage('<p>🔑 Password is now in the console. Enter the correct username & password.</p>', 'info');
		}
		return;
	}

	if (username === CORRECT_USERNAME && password === CORRECT_PASSWORD) {
		setMessage(`
			<h3>🎉 Success!</h3>
			<p><strong>Flag:</strong> <code>${FLAG}</code></p>
			<p>🔓 <a href="round2/index.html">Proceed to Round 2</a></p>
		`, 'success');
		userEl.disabled = true;
		passEl.disabled = true;
		form.querySelector('button').disabled = true;
	} else {
		setMessage('<p>❌ Incorrect. Make sure you found the username in the HTML data attributes.</p>', 'error');
	}
}

form.addEventListener('submit', (e) => {
	e.preventDefault();
	clickCount++;

	if (clickCount === 4 && !passwordRevealed) {
		revealPassword();
	}

	const username = userEl.value.trim();
	const password = passEl.value.trim();
	handleAttempt(username, password);
});

// Initial hint
console.log('WebDecryption Round 1 (Simple) Loaded');
