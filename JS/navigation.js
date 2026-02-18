document.addEventListener('DOMContentLoaded', () => {
  if (document.body) {
    document.body.style.cursor = 'url(./img/cursor.png),default';
  }
});

function hideIntroOverlay() {
  if (typeof $ === 'undefined') return;

  const content = $('#content');
  const blocker = $('#blocker');
  const secondBlocker = $('#secondBlocker');

  content.fadeOut(1000);
  blocker.fadeOut(2000);
  secondBlocker.delay(1200).fadeIn(1000);
}

// Keep old name as an alias for compatibility with existing markup.
function hideMe() {
  hideIntroOverlay();
}

function goSolar() {
  window.location.href = 'solar.html';
}

function goIsland() {
  window.location.href = 'island.html';
}

function goAlienBase() {
  window.location.href = 'alien_base.html';
}

// Backwards-compatible alias for the original misspelled name.
function goAlienBase() {
  goAlienBase();
}

function goLightning() {
  window.location.href = 'lightning.html';
}
