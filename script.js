// Let
let score = 0;
let misses = 0;
let gameInterval;
let isGameRunning = false;
let countdownInterval;

let notesData = [
  { time: 1000, lane: 0 },
  { time: 2000, lane: 1 },
  { time: 3000, lane: 2 },
  { time: 4000, lane: 3 },
  { time: 5000, lane: 1 },
  { time: 6000, lane: 0 },
];

// Contants (Lane Width Calculation, Hit Zone, Key Mappings)
const LANE_WIDTH = window.innerWidth / 4;
const HIT_ZONE_TOP = window.innerHeight - 150;
const HIT_ZONE_BOTTOM = window.innerHeight - 50;
const HIT_TOLERANCE = 60; // unit: pixels

const keyLaneMap = { // Key <-- Lane Index
  'D': 0,
  'F': 1,
  'J': 2,
  'K': 3
};

// Chart Metadata
let chartMetadata = null;
const BUNNY_CDN_ANIMATION_URL = 'https://cdn-temporary.b-cdn.net/animation.mp4';
// const LOCAL_ANIMATION_ASSET = 'assets/animation.mp4';

const beatLaneMap = {
  C: 0,
  'C#': 0,
  D: 0,
  'D#': 1,
  E: 1,
  F: 1,
  'F#': 2,
  G: 2,
  'G#': 2,
  A: 3,
  'A#': 3,
  B: 3
};

function getAnimationAssetUrl() {
  return BUNNY_CDN_ANIMATION_URL.trim();
}

function applyAnimationAsset() {
  const animationUrl = getAnimationAssetUrl();
  const videoElements = [
    document.getElementById('videoBg'),
    document.getElementById('watchVideo')
  ].filter(Boolean);

  videoElements.forEach(video => {
    if (animationUrl) {
      video.src = animationUrl;
      video.load();
    } else {
      video.removeAttribute('src');
      video.load();
    }
  });
}

// Parse beat.json into the game format.
async function loadChartFile() {
  try {
    const response = await fetch('beat.json');
    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('beat.json must contain an array of notes.');
    }

    notesData = data
      .map(note => ({
        time: Math.round(Number(note.seconds || 0) * 1000),
        lane: beatLaneMap[note.beat]
      }))
      .filter(note => Number.isFinite(note.time) && Number.isInteger(note.lane))
      .sort((a, b) => a.time - b.time);

    if (notesData.length === 0) {
      throw new Error('beat.json did not produce any playable notes.');
    }

    console.log(`Loaded beat.json: ${notesData.length} notes`);
    return true;
  } catch (error) {
    console.error('Error loading chart:', error);
    return false;
  }
}

function loadChartMetadata() { // Load Chart Metadata
  chartMetadata = {
    songName: "Valerie's Birthday Beat",
    chartFile: 'beat.json'
  };
  console.log('Chart metadata loaded:', chartMetadata.songName);
}

window.addEventListener('load', () => { // Intialization
  document.getElementById('landing').style.display = 'flex';
  applyAnimationAsset();
  loadChartMetadata();
})

function showDifficultySelect() { // Show Difficulty Selection UI
  document.getElementById('mainMenu').style.display = 'none';
  document.getElementById('difficultyMenu').style.display = 'flex';
}

function hideDifficultySelect() { // Hide Difficulty Selection UI
  document.getElementById('mainMenu').style.display = 'flex';
  document.getElementById('difficultyMenu').style.display = 'none';
}

async function startGameWithDifficulty() { // Start Game with beat.json chart
  showScreen('loading');
  document.getElementById('loading').style.display = 'flex';
  
  const loaded = await loadChartFile();
  
  if (loaded) {
    await waitForMediaLoading();
    document.getElementById('loading').style.display = 'none';
    startCountdown();
  } else {
    alert('Failed to load chart. Using default notes.');
    document.getElementById('loading').style.display = 'none';
    startCountdown();
  }
}

async function waitForMediaLoading() { // Wait for video and audio to load
  const video = document.getElementById('videoBg');
  const audio = document.getElementById('song');
  const loadingProgress = document.getElementById('loadingProgress');
  
  return new Promise((resolve) => {
    const hasVideo = Boolean(video && video.getAttribute('src'));
    let videoReady = !hasVideo;
    let audioReady = false;
    
    const checkReady = () => {
      if (videoReady && audioReady) {
        loadingProgress.textContent = '100%';
        setTimeout(resolve, 500); // Brief pause to show 100%
      } else {
        let progress = 0;
        if (videoReady || (video && video.readyState >= 2)) progress += 50;
        if (audio.readyState >= 2) progress += 50;
        loadingProgress.textContent = progress + '%';
        requestAnimationFrame(checkReady);
      }
    };
    
    if (hasVideo) {
      video.oncanplay = () => { videoReady = true; };
    }
    audio.oncanplaythrough = () => { audioReady = true; };
    
    // Fallback in case events don't fire quickly
    setTimeout(() => {
      if (hasVideo) {
        videoReady = true;
      }
      audioReady = true;
      checkReady();
    }, 2000);
    
    checkReady();
  });
}

// Overall Functions
function toggleFullscreen() { // Fullscreen Toggle
  const btn = document.getElementById('fullscreenBtn');

  if(!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
      .then(() => {
        btn.textContent = '⊡ Exit Fullscreen';
      })
      .catch(err => console.lof('Fullscreen error:', err));
  } else {
    document.exitFullscreen()
      .then(() => {
        btn.textContent = '⊞ Fullscreen';
      })
      .catch(err => console.log('Exit fullscreen error:', err));
  }
}

document.addEventListener('fullscreenchange', () => { // Monitor Fullscreen Changes
  const btn = document.getElementById('fullscreenBtn');
  if (document.fullscreenElement) {
    btn.textContent = '⊡ Exit Fullscreen';
  } else {
    btn.textContent = '⊞ Fullscreen';
  }
});

function showScreen(screenId) { // Screen Management
  document.querySelectorAll('.screen').forEach(screen => { // Hide All Screens
    screen.style.display = 'none';
  });
  document.getElementById('landing').classList.remove('blur'); // Remove Blur
  document.getElementById(screenId).style.display = 'flex'; // Show Selected Screen
}

function returnToLanding() { // Return
  isGameRunning = false;
  clearInterval(countdownInterval);
  document.getElementById('countdown').style.display = 'none';
  showScreen('landing');
  document.getElementById('landing').style.display = 'flex';
}

// Landing Functions
function showPopup(popupId) { // Open Popup
  document.getElementById(popupId).style.display = 'block';
  document.getElementById('landing').classList.add('blur');
}

function closePopup(popupId) { // Close Popup
  document.getElementById(popupId).style.display = 'none';
  document.getElementById('landing').classList.remove('blur');
}

// Game Functions
function startCountdown() { // Countdown Functionality
  showScreen('game');
  document.getElementById('countdown').style.display = 'block';
  
  let timeLeft = 15;
  document.getElementById('countdownDisplay').textContent = timeLeft;
  
  countdownInterval = setInterval(() => {
    timeLeft--;
    document.getElementById('countdownDisplay').textContent = timeLeft;
    
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      document.getElementById('countdown').style.display = 'none';
      startActualGame();
    }
  }, 1000);
}

function startGame() { // Game Preparation
  startCountdown();
}

function startActualGame() { // Game Start
  isGameRunning = true;
  misses = 0;
  score = 0;

  const video = document.getElementById('videoBg');
  const song = document.getElementById('song');

  // Reset video and audio
  if (video) {
    video.currentTime = 0;
  }
  song.currentTime = 0;
  
  // Speed up video
  if (video) {
    video.playbackRate = 16;
  }
  song.playbackRate = 1;
  
  song.play();
  if (video && video.getAttribute('src')) {
    video.play().catch(error => console.warn('Video playback skipped:', error));
  }
  startNotes();
}

function startNotes() { // Note Start
  if (!isGameRunning || notesData.length === 0) return;
  
  // Calculate the time after the last note plays
  const lastNoteTime = notesData[notesData.length - 1].time;
  
  notesData.forEach(note => {
    if (isGameRunning) {
      setTimeout(() => {
        if (isGameRunning) spawnNote(note.lane);
      }, note.time);
    }
  });
  
  // Auto-end game after the last note and a buffer
  setTimeout(() => {
    if (isGameRunning && document.querySelectorAll('.note').length === 0) {
      endGame('Level Complete!');
    }
  }, lastNoteTime + 2000);
}

function spawnNote(laneIndex) { // Note Spawner
  const note = document.createElement('div');
  note.classList.add('note');
  note.dataset.lane = laneIndex;
  note.dataset.hit = 'false';
  
  const laneCenter = (laneIndex * LANE_WIDTH) + (LANE_WIDTH / 2);
  note.style.left = (laneCenter - 25) + 'px';
  
  document.getElementById('notes').appendChild(note);

  let pos = -60;
  const fall = setInterval(() => {
    pos += 5;
    note.style.top = pos + 'px';

    if (pos > window.innerHeight) {
      clearInterval(fall);
      if (note.dataset.hit !== 'true') {
        note.remove();
        misses++;
        if (misses >= 3) {
          endGame('Game Over! You missed too many notes.');
        }
      }
    }
  }, 16);
}

window.addEventListener('click', (event) => { // Click --> Note Hit
  if (event.target.tagName === 'BUTTON' || event.target.closest('.popup')) return;
  
  if (isGameRunning) {
    const clickX = event.clientX;
    const laneIndex = Math.floor(clickX / LANE_WIDTH);
    
    if (laneIndex >= 0 && laneIndex < 4) {
      checkHit(laneIndex);
    }
  }
});

function checkHit(laneIndex) { // Hit Handler
  const notes = document.querySelectorAll(`.note[data-lane="${laneIndex}"]`);
  let hitNote = null;
  let bestDistance = HIT_TOLERANCE;
  
  notes.forEach(note => {
    if (note.dataset.hit !== 'true') {
      const rect = note.getBoundingClientRect();
      const distance = Math.abs((rect.top + rect.height / 2) - (HIT_ZONE_TOP + HIT_ZONE_BOTTOM) / 2);
      
      if (distance < bestDistance) {
        bestDistance = distance;
        hitNote = note;
      }
    }
  });
  
  if (hitNote) {
    hitNote.dataset.hit = 'true';
    hitNote.style.opacity = '0.5';
    setTimeout(() => hitNote.remove(), 200);
    score++;
    return true;
  }
  return false;
}

function endGame(message) { // Game End Handler
  isGameRunning = false;
  clearInterval(countdownInterval);
  document.getElementById('song').pause();
  const video = document.getElementById('videoBg');
  if (video) {
    video.pause();
  }
  document.querySelectorAll('.note').forEach(note => note.remove());
  
  // Show results popup
  showGameResults(message);
}

function showGameResults(message) { // Display game results and exit options
  const resultsPopup = document.createElement('div');
  resultsPopup.id = 'gameResults';
  resultsPopup.className = 'popup';
  resultsPopup.style.display = 'block';
  resultsPopup.innerHTML = `
    <h2>Game Over</h2>
    <p style="font-size: 18px; margin-top: 20px;">${message}</p>
    <div style="margin-top: 30px; font-size: 20px; font-weight: bold;">
      <p>Score: <span style="color: #ff6b6b;">${score}</span></p>
      <p>Misses: <span style="color: #ff6b6b;">${misses}</span></p>
    </div>
    <div style="margin-top: 30px; display: flex; gap: 10px; justify-content: center;">
      <button onclick="restartGame()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 5px;">Play Again</button>
      <button onclick="exitToMenu()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background: #f44336; color: white; border: none; border-radius: 5px;">Exit to Menu</button>
    </div>
  `;
  
  document.body.appendChild(resultsPopup);
  document.getElementById('landing').classList.add('blur');
}

function restartGame() { // Restart game by returning to difficulty selection
  const resultsPopup = document.getElementById('gameResults');
  if (resultsPopup) resultsPopup.remove();
  
  document.getElementById('landing').classList.remove('blur');
  showDifficultySelect();
}

function exitToMenu() { // Return to main menu
  const resultsPopup = document.getElementById('gameResults');
  if (resultsPopup) resultsPopup.remove();
  
  returnToLanding();
}

// Watch Functions
function startWatch() { // Start Watch
  showScreen('watch');
  const video = document.getElementById('watchVideo');
  if (!video.getAttribute('src')) {
    alert('Add your Bunny CDN animation URL in script.js to enable Watch mode.');
    returnToLanding();
    return;
  }
  video.currentTime = 0;
  video.playbackRate = 1;
  video.play().catch(error => console.warn('Watch playback failed:', error));
}

function exitWatch() { // Exit Watch
  document.getElementById('watchVideo').pause();
  returnToLanding();
}

// Keyboard Controls
document.addEventListener('keydown', (event) => {
  const key = event.key.toUpperCase();
  
  if (isGameRunning && keyLaneMap.hasOwnProperty(key)) {
    event.preventDefault();
    const laneIndex = keyLaneMap[key];
    const lane = document.getElementById(`lane-${laneIndex}`);
    
    if (lane) {
      lane.classList.add('active');
      checkHit(laneIndex);
    }
  }
});

document.addEventListener('keyup', (event) => {
  const key = event.key.toUpperCase();
  
  if (keyLaneMap.hasOwnProperty(key)) {
    const laneIndex = keyLaneMap[key];
    const lane = document.getElementById(`lane-${laneIndex}`);
    
    if (lane) {
      lane.classList.remove('active');
    }
  }
});
