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
const BPM = 120; // Default BPM - Update from dat-files/Info.dat

// Parse .dat & Convert --> Game Format
async function loadChartFile(filename) {
  try {
    const response = await fetch(`dat-files/${filename}`);
    const data = await response.json();

    // .dat --> Game Format
    notesData = data._notes.map(note => ({
      time: Math.round(note._time * (60000 / BPM)),
      lane: note._lineIndex
    })).sort((a, b) => a.time - b.time);

    console.log(`Loaded ${filename}: ${notesData.length} notes`);
    return true;
  } catch (error) {
    console.error('Error loading chart:', error);
    return false;
  }
}

async function loadChartMetadata() { // Load Chart Metadata
  try {
    const response = await fetch('dat-files/Info.dat');
    chartMetadata = await response.json();
    console.log('Chart metadata loaded:', chartMetadata._songName);
  } catch (error) {
    console.error('Error loading metadata:', error);
  }
}

window.addEventListener('load', () => { // Intialization
  document.getElementById('landing').style.display = 'flex';
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

async function startGameWithDifficulty(filename) { // Start Game w/ Selected Difficulty
  hideDifficultySelect();
  const loaded = await loadChartFile(filename);

  if (loaded) {
    startCountdown();
  } else {
    alert('Failed to load chart. Using default notes.');
    startCountdown();
  }
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
  video.currentTime = 0;
  song.currentTime = 0;
  
  // Speed up video
  video.playbackRate = 8;
  song.playbackRate = 1;
  
  song.play();
  video.play();
  startNotes();
}

function startNotes() { // Note Start
  notesData.forEach(note => {
    if (isGameRunning) {
      setTimeout(() => {
        if (isGameRunning) spawnNote(note.lane);
      }, note.time);
    }
  });
}

function spawnNote(laneIndex) { // Note Spawner
  const note = document.createElement('div');
  note.classList.add('note');
  note.dataset.lane = laneIndex;
  note.dataset.hit = false;
  
  const laneCenter = (laneIndex * LANE_WIDTH) + (LANE_WIDTH / 2);
  note.style.left = (laneCenter - 25) + 'px';
  
  document.getElementById('notes').appendChild(note);

  let pos = -60;
  const fall = setInterval(() => {
    pos += 5;
    note.style.top = pos + 'px';

    if (pos > window.innerHeight) {
      clearInterval(fall);
      if (!note.dataset.hit) {
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
    if (note.dataset.hit === 'false' || !note.dataset.hit) {
      const rect = note.getBoundingClientRect();
      const distance = Math.abs((rect.top + rect.height / 2) - (HIT_ZONE_TOP + HIT_ZONE_BOTTOM) / 2);
      
      if (distance < bestDistance) {
        bestDistance = distance;
        hitNote = note;
      }
    }
  });
  
  if (hitNote) {
    hitNote.dataset.hit = true;
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
  document.getElementById('videoBg').pause();
  document.querySelectorAll('.note').forEach(note => note.remove());
  
  const result = `${message}\nScore: ${score}\nMisses: ${misses}`;
  alert(result);
  returnToLanding();
}

// Watch Functions
function startWatch() { // Start Watch
  showScreen('watch');
  const video = document.getElementById('watchVideo');
  video.currentTime = 0;
  video.playbackRate = 1;
  video.play();
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