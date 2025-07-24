(function() {
// Constants
const RAIN_BASE_DIVISOR = 6000;
const RAIN_SPEED_STEP = 0.25;
const DISPLAYED_SPEED_MIN = 0.25;
const DISPLAYED_SPEED_MAX = 2.0;
const RAIN_AMOUNT_STEP = 0.25;
const RAIN_AMOUNT_MIN = 0.25;
const RAIN_AMOUNT_MAX = 2.0;
const TYPING_INTERVAL = 55;
const PAUSE_DURATION = 700;

// More visible raindrop color for dark theme
const RAIN_COLOR_DARK = 'rgba(127, 143, 170, 0.45)'; // Increased opacity
const RAIN_COLOR_LIGHT = 'rgba(54, 78, 107, 0.35)';

// Main rain and UI logic
let rainEnabled = true;
let displayedSpeed = 1.0;
let rainSpeedMultiplier = 2.5 * displayedSpeed;
let rainAmountMultiplier = 1.0;
let rainArray = [];
let splashArray = [];
let animationId;
let originalHeading = true;
let currentTypingAnimation = null;
let isTyping = false;
let rainColor = RAIN_COLOR_DARK;

// Text for typing animation
const originalTextParts = ["It's ", "rxiny", " here...", " Take an umbrella."];
const umbrellaTextParts = ["...", "really?", " I'm taking my umbrella back."];

function formatSpeedDisplay(multiplier) {
    // Always round to nearest 0.25 for display
    return multiplier.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function startArticlesTypingAnimation() {
    const typingElement = document.getElementById('typing-text');
    const cursorElement = document.getElementById('typing-cursor');
    if (!typingElement || !cursorElement) return;
    typingElement.innerHTML = '';
    cursorElement.style.display = 'inline';
    const text = 'Soon.';
    let charIndex = 0;
    let lastTime = 0;
    let timer = 0;
    const TYPING_INTERVAL = 55;
    function animateTyping(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;
        if (timer > TYPING_INTERVAL) {
            if (charIndex < text.length) {
                typingElement.textContent += text.charAt(charIndex);
                charIndex++;
            }
            timer = 0;
        } else {
            timer += deltaTime;
        }
        if (charIndex >= text.length) {
            cursorElement.style.display = 'none';
            return;
        }
        requestAnimationFrame(animateTyping);
    }
    requestAnimationFrame(animateTyping);
}

document.addEventListener('DOMContentLoaded', () => {
    // Typing animation (only on landing page or articles page)
    const typingElement = document.getElementById('typing-text');
    const cursorElement = document.getElementById('typing-cursor');
    if (typingElement && cursorElement) {
        if (window.location.pathname.endsWith('articles.html')) {
            startArticlesTypingAnimation();
        } else {
            startTypingAnimation(originalTextParts);
        }
    }

    // Rain & interaction canvas (on any page with rain-canvas)
    const landingScreen = document.querySelector('.landing-screen');
    const canvas = document.getElementById('rain-canvas');
    if (canvas && landingScreen) {
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        let mouse = { x: undefined, y: undefined, radius: 100 };
        landingScreen.addEventListener('mousemove', (event) => {
            const canvasRect = canvas.getBoundingClientRect();
            mouse.x = event.clientX - canvasRect.left;
            mouse.y = event.clientY - canvasRect.top;
        });
        landingScreen.addEventListener('mouseleave', () => {
            mouse.x = undefined;
            mouse.y = undefined;
        });

        // Splash particle class
        class SplashParticle {
            constructor(x, y, color) {
                this.x = x; this.y = y;
                this.size = Math.random() * 2 + 1;
                this.speedX = Math.random() * 2 - 1;
                this.speedY = Math.random() * -2 - 1;
                this.life = 1;
                this.color = color;
            }
            updateAndDraw() {
                this.x += this.speedX;
                this.y += this.speedY;
                this.life -= 0.04;
                ctx.globalAlpha = Math.max(0, this.life);
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        // Rain drop class
        class RainDrop {
            constructor(x, y, baseSpeed) {
                this.x = x; this.y = y;
                this.baseSpeed = baseSpeed;
                this.length = 15;
                this.active = true;
            }
            splash() {
                if (!rainEnabled) return;
                for (let i = 0; i < 3; i++) {
                    splashArray.push(new SplashParticle(this.x, this.y, rainColor));
                }
                this.y = -this.length;
                this.x = Math.random() * canvas.width;
            }
            updateAndDraw() {
                if (!this.active) return;
                let hit = false;
                if (this.y > canvas.height) {
                    this.y = canvas.height; 
                    this.splash();
                    hit = true;
                }
                const currentSpeed = this.baseSpeed * rainSpeedMultiplier;
                this.y += currentSpeed;
                if (mouse.x !== undefined && mouse.y !== undefined) {
                    const dx = mouse.x - this.x;
                    const dy = mouse.y - this.y;
                    const distance = Math.sqrt(Math.pow(dx / 1.5, 2) + Math.pow(dy, 2));
                    if (distance < mouse.radius) {
                        this.splash();
                        hit = true;
                    }
                }
                if (!hit) {
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y);
                    ctx.lineTo(this.x, this.y - this.length);
                    ctx.strokeStyle = rainColor;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }

        // Rain initialization and animation
        function initRain() {
            rainArray = [];
            const baseDrops = (canvas.width * canvas.height) / RAIN_BASE_DIVISOR;
            const numberOfDrops = Math.floor(baseDrops * rainAmountMultiplier);
            for (let i = 0; i < numberOfDrops; i++) {
                rainArray.push(new RainDrop(
                    Math.random() * canvas.width, 
                    Math.random() * -canvas.height,
                    Math.random() * 1 + 2.2 
                ));
            }
        }
        function animateCanvas() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Add new drops if needed
            const baseDrops = (canvas.width * canvas.height) / RAIN_BASE_DIVISOR;
            const targetCount = Math.floor(baseDrops * rainAmountMultiplier);
            while (rainArray.length < targetCount) {
                rainArray.push(new RainDrop(
                    Math.random() * canvas.width,
                    Math.random() * -canvas.height,
                    Math.random() * 1 + 2.2
                ));
            }
            // Remove excess drops if needed
            if (rainArray.length > targetCount) {
                rainArray.splice(0, rainArray.length - targetCount);
            }
            rainArray.forEach(drop => drop.updateAndDraw());
            for (let i = splashArray.length - 1; i >= 0; i--) {
                splashArray[i].updateAndDraw();
                if (splashArray[i].life <= 0) {
                    splashArray.splice(i, 1);
                }
            }
            animationId = requestAnimationFrame(animateCanvas);
        }
        initRain();
        animateCanvas();

        // Responsive canvas with debounce
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                initRain();
            }, 150);
        });
    }

    // Scroll & transition logic
    const fixedMenu = document.querySelector('.fixed-menu');
    const contentWrapper = document.querySelector('.content-wrapper');
    const scrollArrow = document.querySelector('.scroll-arrow');
    const themeControls = document.querySelector('.theme-controls');
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        const pageHeight = window.innerHeight;
        if (scrollY > pageHeight) {
            fixedMenu.style.display = 'block';
            setTimeout(() => fixedMenu.classList.add('visible'), 10);
        } else {
            fixedMenu.classList.remove('visible');
        }
        if (scrollY < pageHeight) {
            const opacity = Math.max(0, 1 - (scrollY / (pageHeight * 0.75)));
            contentWrapper.style.opacity = opacity;
            scrollArrow.style.opacity = opacity;
        } else {
            contentWrapper.style.opacity = 0;
            scrollArrow.style.opacity = 0;
        }
        if (scrollY > pageHeight * 0.6) {
            landingScreen.classList.add('transitioned');
            contentWrapper.classList.add('visible');
        } else {
            landingScreen.classList.remove('transitioned');
            contentWrapper.classList.remove('visible');
        }
    });

    // Theme toggle logic (if present)
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');
    function updateThemeIcons() {
        if (themeToggle && sunIcon && moonIcon) {
            if (themeToggle.checked) {
                sunIcon.classList.add('active');
                sunIcon.classList.remove('inactive');
                moonIcon.classList.remove('active');
                moonIcon.classList.add('inactive');
            } else {
                sunIcon.classList.remove('active');
                sunIcon.classList.add('inactive');
                moonIcon.classList.add('active');
                moonIcon.classList.remove('inactive');
            }
        }
    }
    if (themeToggle) {
        themeToggle.addEventListener('change', function() {
            if (this.checked) {
                document.body.classList.add('light-theme');
                rainColor = RAIN_COLOR_LIGHT;
            } else {
                document.body.classList.remove('light-theme');
                rainColor = RAIN_COLOR_DARK;
            }
            updateThemeIcons();
        });
        updateThemeIcons();
    }

    // Panel toggle logic
    const panelToggle = document.getElementById('panel-toggle');
    let panelOpen = false;
    if (panelToggle && themeControls) {
        // Ensure panel is hidden initially
        themeControls.classList.remove('open');
        themeControls.classList.add('hidden');
        panelToggle.addEventListener('click', () => {
            panelOpen = !panelOpen;
            if (panelOpen) {
                themeControls.classList.remove('hidden');
                // Force reflow to enable transition
                void themeControls.offsetWidth;
                themeControls.classList.add('open');
                panelToggle.setAttribute('aria-label', 'Hide controls');
                panelToggle.classList.add('open');
            } else {
                themeControls.classList.remove('open');
                panelToggle.setAttribute('aria-label', 'Show controls');
                panelToggle.classList.remove('open');
            }
        });
        // Listen for transition end to hide after fade out
        themeControls.addEventListener('transitionend', (e) => {
            if (!panelOpen && e.propertyName === 'opacity') {
                themeControls.classList.add('hidden');
            }
        });
    }

    // Rain controls logic
    const rainToggle = document.getElementById('rain-toggle');
    const rainOffIcon = document.getElementById('rain-off-icon');
    const rainOnIcon = document.getElementById('rain-on-icon');
    // Get references to display elements
    const speedValue = document.getElementById('speed-value');
    const amountValue = document.getElementById('amount-value');
    // Initialize display values
    if (speedValue) speedValue.textContent = formatSpeedDisplay(displayedSpeed);
    if (amountValue) amountValue.textContent = formatSpeedDisplay(rainAmountMultiplier);
    // On load: rainEnabled = true, but switch is unchecked
    rainEnabled = true;
    rainToggle.checked = false;
    function updateRainIcons() {
        if (rainToggle.checked) {
            // Switch ON: rain stops, left icon blue, right icon grey
            rainOffIcon.classList.add('active');
            rainOffIcon.classList.remove('inactive');
            rainOnIcon.classList.remove('active');
            rainOnIcon.classList.add('inactive');
        } else {
            // Switch OFF: rain is on, left icon grey, right icon blue
            rainOffIcon.classList.remove('active');
            rainOffIcon.classList.add('inactive');
            rainOnIcon.classList.add('active');
            rainOnIcon.classList.remove('inactive');
        }
    }
    rainToggle.addEventListener('change', function() {
        if (this.checked) {
            rainEnabled = false;
        } else {
            rainEnabled = true;
        }
        updateRainIcons();
        if (!rainEnabled) {
            if (isTyping && currentTypingAnimation) {
                cancelAnimationFrame(currentTypingAnimation);
                isTyping = false;
            }
            typeNewMessage();
            originalHeading = false;
        } else {
            if (isTyping && currentTypingAnimation) {
                cancelAnimationFrame(currentTypingAnimation);
                isTyping = false;
            }
            startTypingAnimation(originalTextParts);
            originalHeading = true;
            if (canvas) initRain();
        }
    });
    // Set initial state
    updateRainIcons();
    // DRY: Loop for speed and amount controls
    [
        {id: 'speed-up', fn: () => {
            displayedSpeed = Math.min(DISPLAYED_SPEED_MAX, displayedSpeed + RAIN_SPEED_STEP);
            rainSpeedMultiplier = 2.5 * displayedSpeed;
            if (speedValue) speedValue.textContent = formatSpeedDisplay(displayedSpeed);
        }},
        {id: 'speed-down', fn: () => {
            displayedSpeed = Math.max(DISPLAYED_SPEED_MIN, displayedSpeed - RAIN_SPEED_STEP);
            rainSpeedMultiplier = 2.5 * displayedSpeed;
            if (speedValue) speedValue.textContent = formatSpeedDisplay(displayedSpeed);
        }},
        {id: 'amount-up', fn: () => {
            rainAmountMultiplier = Math.min(RAIN_AMOUNT_MAX, rainAmountMultiplier + RAIN_AMOUNT_STEP);
            amountValue.textContent = rainAmountMultiplier.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
        }},
        {id: 'amount-down', fn: () => {
            rainAmountMultiplier = Math.max(RAIN_AMOUNT_MIN, rainAmountMultiplier - RAIN_AMOUNT_STEP);
            amountValue.textContent = rainAmountMultiplier.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
        }}
    ].forEach(({id, fn}) => {
        const button = document.getElementById(id);
        if (button) button.addEventListener('click', fn);
    });
});

// Typing animation logic
function startTypingAnimation(textParts) {
    const typingElement = document.getElementById('typing-text');
    const cursorElement = document.getElementById('typing-cursor');
    typingElement.innerHTML = '';
    cursorElement.style.display = 'inline';
    let partIndex = 0;
    let charIndex = 0;
    let lastTime = 0;
    let timer = 0;
    let isPaused = false;
    let pauseStart = 0;
    isTyping = true;
    function animateTyping(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;
        if (isPaused) {
            if (timestamp - pauseStart >= PAUSE_DURATION) {
                isPaused = false;
            }
            currentTypingAnimation = requestAnimationFrame(animateTyping);
            return;
        }
        if (timer > TYPING_INTERVAL) {
            if (partIndex < textParts.length) {
                const currentPart = textParts[partIndex];
                if (charIndex < currentPart.length) {
                    let span = typingElement.querySelector(`span[data-part-index='${partIndex}']`);
                    if (!span) {
                        span = document.createElement('span');
                        span.dataset.partIndex = partIndex;
                        if (partIndex === 1 && textParts === originalTextParts) {
                            span.className = 'highlight';
                        }
                        typingElement.appendChild(span);
                    }
                    span.textContent += currentPart.charAt(charIndex);
                    charIndex++;
                } else {
                    if ((textParts === originalTextParts && partIndex === 2) || 
                        (textParts === umbrellaTextParts && partIndex === 1)) {
                        isPaused = true;
                        pauseStart = timestamp;
                    }
                    charIndex = 0;
                    partIndex++;
                }
            }
            timer = 0;
        } else {
            timer += deltaTime;
        }
        if (partIndex >= textParts.length && charIndex === 0) {
            cursorElement.style.display = 'none';
            isTyping = false;
            return;
        }
        currentTypingAnimation = requestAnimationFrame(animateTyping);
    }
    currentTypingAnimation = requestAnimationFrame(animateTyping);
}

// Alternate message typing logic
function typeNewMessage() {
    const typingElement = document.getElementById('typing-text');
    const cursorElement = document.getElementById('typing-cursor');
    typingElement.innerHTML = '';
    cursorElement.style.display = 'inline';
    isTyping = true;
    const newTextParts = umbrellaTextParts;
    let partIndex = 0;
    let charIndex = 0;
    let lastTime = 0;
    let timer = 0;
    let isPaused = false;
    let pauseStart = 0;
    function animateNewTyping(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;
        if (isPaused) {
            if (timestamp - pauseStart >= PAUSE_DURATION) {
                isPaused = false;
            }
            currentTypingAnimation = requestAnimationFrame(animateNewTyping);
            return;
        }
        if (timer > TYPING_INTERVAL) {
            if (partIndex < newTextParts.length) {
                const currentPart = newTextParts[partIndex];
                if (charIndex < currentPart.length) {
                    let span = typingElement.querySelector(`span[data-new-part-index='${partIndex}']`);
                    if (!span) {
                        span = document.createElement('span');
                        span.dataset.newPartIndex = partIndex;
                        typingElement.appendChild(span);
                    }
                    span.textContent += currentPart.charAt(charIndex);
                    charIndex++;
                } else {
                    if (partIndex === 1) {
                        isPaused = true;
                        pauseStart = timestamp;
                    }
                    charIndex = 0;
                    partIndex++;
                }
            }
            timer = 0;
        } else {
            timer += deltaTime;
        }
        if (partIndex >= newTextParts.length && charIndex === 0) {
            cursorElement.style.display = 'none';
            isTyping = false;
            return;
        }
        currentTypingAnimation = requestAnimationFrame(animateNewTyping);
    }
    currentTypingAnimation = requestAnimationFrame(animateNewTyping);
}

// Smooth scroll to section
window.scrollToSection = function(sectionId) {
    const target = document.getElementById(sectionId);
    if (!target) return;
    const yOffset = -70; // Adjust this value to match the header height
    const y = target.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });
};

// Tooltip logic for nickname highlights
function setupNicknameTips() {
    const highlights = document.querySelectorAll('.nickname-highlight, .nickname');
    highlights.forEach(el => {
        const tip = el.querySelector('.nickname-tip');
        if (!tip) return;
        el.addEventListener('mouseenter', () => {
            tip.style.opacity = '1';
        });
        el.addEventListener('mouseleave', () => {
            tip.style.opacity = '0';
        });
        el.addEventListener('focus', () => {
            tip.style.opacity = '1';
        });
        el.addEventListener('blur', () => {
            tip.style.opacity = '0';
        });
        // Position tip above the word
        el.style.position = 'relative';
    });
}
document.addEventListener('DOMContentLoaded', setupNicknameTips);})();