// DOM Elements
const modal = document.getElementById('modal');
const settingsForm = document.getElementById('settings-form');
const sexSelect = document.getElementById('sex');
const dobInput = document.getElementById('dob');
const countrySelect = document.getElementById('country');
const themeSelect = document.getElementById('theme');
const advancedToggle = document.getElementById('advanced-toggle');
const advancedOptions = document.getElementById('advanced-options');
const calendarContainer = document.getElementById('calendar-container');
const calendar = document.getElementById('calendar');
const settingsGear = document.getElementById('settings-gear');
const infoBtn = document.getElementById('info-btn');
const infoModal = document.getElementById('info-modal');
const infoContent = document.getElementById('info-content');
const infoClose = document.getElementById('info-close');
const highlightsList = document.getElementById('highlights-list');
const addHighlightBtn = document.getElementById('add-highlight-btn');
const shareBtn = document.getElementById('share-btn');
const shareToast = document.getElementById('share-toast');
const menuToggle = document.getElementById('menu-toggle');
const floatingMenu = document.querySelector('.floating-menu');
const mobileTooltip = document.getElementById('mobile-tooltip');

// Storage keys
const STORAGE_KEY = 'life-calendar-settings';
const HIGHLIGHTS_KEY = 'life-calendar-highlights';

// Highlights array
let highlights = [];

// Initialize
function init() {
    populateCountries();

    // Check for URL parameters first
    const urlData = loadFromURL();
    if (urlData) {
        // Load from URL
        highlights = urlData.highlights || [];
        renderHighlightsList();

        sexSelect.value = urlData.settings.sex;
        dobInput.value = urlData.settings.dob;
        countrySelect.value = urlData.settings.country;
        if (urlData.settings.theme) {
            themeSelect.value = urlData.settings.theme;
            applyTheme(urlData.settings.theme);
        } else {
            updateFavicon();
        }
        showCalendar(urlData.settings);
    } else {
        // Load from localStorage
        loadHighlights();
        loadSettings();
        updateFavicon();
    }

    setupEventListeners();
}

// Populate country dropdown
function populateCountries() {
    COUNTRIES.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countrySelect.appendChild(option);
    });
}

// Load highlights from storage
function loadHighlights() {
    const saved = localStorage.getItem(HIGHLIGHTS_KEY);
    if (saved) {
        highlights = JSON.parse(saved);
    }
    renderHighlightsList();
}

// Save highlights to storage
function saveHighlights() {
    localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(highlights));
}

// Render highlights list in settings
function renderHighlightsList() {
    if (highlights.length === 0) {
        highlightsList.innerHTML = '<p class="highlights-empty">No highlights yet</p>';
        return;
    }

    highlightsList.innerHTML = highlights.map((h, index) => `
        <div class="highlight-item" data-index="${index}">
            <div class="highlight-row">
                <input type="text" value="${h.label}" placeholder="Label" data-field="label">
                <input type="color" value="${h.color}" data-field="color">
                <button type="button" class="highlight-delete" data-index="${index}">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                    </svg>
                </button>
            </div>
            <div class="highlight-row">
                <input type="date" value="${h.startDate}" data-field="startDate">
                <input type="date" value="${h.endDate}" data-field="endDate">
            </div>
        </div>
    `).join('');

    // Add event listeners for inputs
    highlightsList.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', handleHighlightChange);
    });

    // Add event listeners for delete buttons
    highlightsList.querySelectorAll('.highlight-delete').forEach(btn => {
        btn.addEventListener('click', handleHighlightDelete);
    });
}

// Handle highlight input change
function handleHighlightChange(e) {
    const item = e.target.closest('.highlight-item');
    const index = parseInt(item.dataset.index);
    const field = e.target.dataset.field;
    highlights[index][field] = e.target.value;
    saveHighlights();
}

// Handle highlight delete
function handleHighlightDelete(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    highlights.splice(index, 1);
    saveHighlights();
    renderHighlightsList();
}

// Add new highlight
function addHighlight() {
    highlights.push({
        label: '',
        startDate: '',
        endDate: '',
        color: '#ef4444'
    });
    saveHighlights();
    renderHighlightsList();
}

// Load saved settings
function loadSettings() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        const settings = JSON.parse(saved);
        sexSelect.value = settings.sex;
        dobInput.value = settings.dob;
        countrySelect.value = settings.country;
        if (settings.theme) {
            themeSelect.value = settings.theme;
            applyTheme(settings.theme);
        }
        showCalendar(settings);
    }
}

// Setup event listeners
function setupEventListeners() {
    settingsForm.addEventListener('submit', handleSubmit);
    settingsGear.addEventListener('click', openModal);
    advancedToggle.addEventListener('click', toggleAdvanced);
    themeSelect.addEventListener('change', previewTheme);
    infoBtn.addEventListener('click', openInfoModal);
    infoClose.addEventListener('click', closeInfoModal);
    addHighlightBtn.addEventListener('click', addHighlight);
    shareBtn.addEventListener('click', shareCalendar);
    menuToggle.addEventListener('click', toggleFloatingMenu);
    calendar.addEventListener('click', handleWeekTap);
}

// Toggle floating menu
function toggleFloatingMenu() {
    floatingMenu.classList.toggle('expanded');
}

// Handle form submission
function handleSubmit(e) {
    e.preventDefault();

    const settings = {
        sex: sexSelect.value,
        dob: dobInput.value,
        country: countrySelect.value,
        theme: themeSelect.value
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    applyTheme(settings.theme);
    showCalendar(settings);
}

// Toggle advanced options
function toggleAdvanced() {
    advancedToggle.classList.toggle('expanded');
    advancedOptions.classList.toggle('visible');
}

// Preview theme when selecting
function previewTheme() {
    applyTheme(themeSelect.value);
}

// Apply theme to document
function applyTheme(theme) {
    if (theme === 'default') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
    updateFavicon();
}

// Update favicon based on current theme
function updateFavicon() {
    const styles = getComputedStyle(document.documentElement);
    const bgColor = styles.getPropertyValue('--bg-primary').trim() || '#0a0a0a';
    const futureColor = styles.getPropertyValue('--week-future').trim() || '#1a1a1a';
    const livedColor = styles.getPropertyValue('--week-lived').trim() || '#3b82f6';
    const currentColor = styles.getPropertyValue('--week-current').trim() || '#22c55e';

    // Create a 4x4 grid pattern for the favicon
    const size = 32;
    const cellSize = 6;
    const gap = 2;
    const startX = 3;
    const startY = 3;

    let rects = '';
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            const x = startX + col * (cellSize + gap);
            const y = startY + row * (cellSize + gap);
            const index = row * 4 + col;

            let color;
            if (index < 10) {
                color = livedColor;
            } else if (index === 10) {
                color = currentColor;
            } else {
                color = futureColor;
            }

            rects += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${color}" rx="1"/>`;
        }
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
        <rect width="${size}" height="${size}" fill="${bgColor}"/>
        ${rects}
    </svg>`;

    const encoded = encodeURIComponent(svg);
    const favicon = document.getElementById('favicon');
    if (favicon) {
        favicon.href = `data:image/svg+xml,${encoded}`;
    }
}

// Open info modal
function openInfoModal() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        const settings = JSON.parse(saved);
        const data = LIFE_EXPECTANCY_DATA[settings.country];
        const lifeExpectancy = settings.sex === 'male' ? data.male : data.female;
        const totalWeeks = Math.round(lifeExpectancy * 52);
        const weeksLived = getWeeksLived(settings.dob);
        const weeksRemaining = Math.max(0, totalWeeks - weeksLived);
        const percentLived = ((weeksLived / totalWeeks) * 100).toFixed(1);

        // Calculate expected death date
        const birthDate = new Date(settings.dob);
        const deathDate = new Date(birthDate);
        deathDate.setDate(deathDate.getDate() + totalWeeks * 7);
        const deathDateStr = deathDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

        infoContent.innerHTML = `
            <p class="death-date">You're expected to die on <strong>${deathDateStr}</strong></p>
            <div class="info-stats">
                <div class="info-stat">
                    <span class="info-stat-label">Country</span>
                    <span class="info-stat-value">${settings.country}</span>
                </div>
                <div class="info-stat">
                    <span class="info-stat-label">Sex</span>
                    <span class="info-stat-value">${settings.sex === 'male' ? 'Male' : 'Female'}</span>
                </div>
                <div class="info-stat">
                    <span class="info-stat-label">Life Expectancy</span>
                    <span class="info-stat-value">${lifeExpectancy.toFixed(1)} years</span>
                </div>
                <div class="info-stat">
                    <span class="info-stat-label">Total Weeks</span>
                    <span class="info-stat-value">${totalWeeks.toLocaleString()}</span>
                </div>
                <div class="info-stat">
                    <span class="info-stat-label">Weeks Lived</span>
                    <span class="info-stat-value">${weeksLived.toLocaleString()}</span>
                </div>
                <div class="info-stat">
                    <span class="info-stat-label">Weeks Remaining</span>
                    <span class="info-stat-value">${weeksRemaining.toLocaleString()}</span>
                </div>
                <div class="info-stat">
                    <span class="info-stat-label">Life Progress</span>
                    <span class="info-stat-value">${percentLived}%</span>
                </div>
            </div>
        `;
    }
    infoModal.classList.remove('hidden');
}

// Close info modal
function closeInfoModal() {
    infoModal.classList.add('hidden');
}

// Open modal
function openModal() {
    modal.classList.remove('hidden');
    calendarContainer.classList.remove('visible');
    renderHighlightsList();
}

// Show calendar
function showCalendar(settings) {
    modal.classList.add('hidden');
    calendarContainer.classList.add('visible');
    renderCalendar(settings);
}

// Calculate life expectancy in weeks
function getLifeExpectancyWeeks(settings) {
    const data = LIFE_EXPECTANCY_DATA[settings.country];
    if (!data) return 80 * 52; // Default fallback

    const years = settings.sex === 'male' ? data.male : data.female;
    return Math.round(years * 52);
}

// Get weeks lived
function getWeeksLived(dob) {
    const birthDate = new Date(dob);
    const now = new Date();
    const diffTime = now - birthDate;
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    return Math.max(0, diffWeeks);
}

// Get week index for a given date
function getWeekIndexForDate(dob, date) {
    const birthDate = new Date(dob);
    const targetDate = new Date(date);
    const diffTime = targetDate - birthDate;
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    return diffWeeks;
}

// Get highlight for a week index
function getHighlightForWeek(weekIndex, dob) {
    const birthDate = new Date(dob);
    const weekDate = new Date(birthDate);
    weekDate.setDate(weekDate.getDate() + weekIndex * 7);

    for (const highlight of highlights) {
        if (!highlight.startDate || !highlight.endDate) continue;

        const startDate = new Date(highlight.startDate);
        const endDate = new Date(highlight.endDate);

        if (weekDate >= startDate && weekDate <= endDate) {
            return highlight;
        }
    }
    return null;
}

// Render the calendar
function renderCalendar(settings) {
    const totalWeeks = getLifeExpectancyWeeks(settings);
    const weeksLived = getWeeksLived(settings.dob);
    const birthDate = new Date(settings.dob);

    // Clear existing
    calendar.innerHTML = '';

    // Calculate optimal grid dimensions
    const { columns, rows, cellSize } = calculateGrid(totalWeeks);

    // Set grid template with explicit sizes
    calendar.style.gridTemplateColumns = `repeat(${columns}, ${cellSize}px)`;
    calendar.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;

    // Create week cells
    for (let i = 0; i < totalWeeks; i++) {
        const week = document.createElement('div');
        week.className = 'week';

        // Check for highlight first
        const highlight = getHighlightForWeek(i, settings.dob);
        if (highlight) {
            week.classList.add('highlighted');
            week.style.backgroundColor = highlight.color;
        } else if (i < weeksLived) {
            week.classList.add('lived');
        } else if (i === weeksLived) {
            week.classList.add('current');
        } else {
            week.classList.add('future');
        }

        // Calculate the date for this week and set tooltip
        const weekDate = new Date(birthDate);
        weekDate.setDate(weekDate.getDate() + i * 7);
        let tooltip = formatWeekDate(weekDate, i);
        if (highlight && highlight.label) {
            tooltip += ` - ${highlight.label}`;
        }
        week.title = tooltip;
        week.dataset.tooltip = tooltip;

        calendar.appendChild(week);
    }

}

// Handle tap on week cell for mobile tooltip
let tooltipTimeout;
function handleWeekTap(e) {
    const week = e.target.closest('.week');
    if (!week) return;

    const tooltip = week.dataset.tooltip;
    if (!tooltip) return;

    // Show mobile tooltip
    mobileTooltip.textContent = tooltip;
    mobileTooltip.classList.add('visible');

    // Hide after delay
    clearTimeout(tooltipTimeout);
    tooltipTimeout = setTimeout(() => {
        mobileTooltip.classList.remove('visible');
    }, 2500);
}

// Format date for tooltip
function formatWeekDate(date, weekIndex) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const age = Math.floor(weekIndex / 52);
    const weekOfYear = (weekIndex % 52) + 1;

    return `${month} ${year} (Age ${age}, Week ${weekOfYear})`;
}

// Calculate optimal grid dimensions to fill the viewport
function calculateGrid(totalWeeks) {
    const gap = 2;

    // Use visualViewport if available (more accurate on mobile), otherwise fall back to window
    const visualVP = window.visualViewport;
    let viewportWidth = visualVP ? visualVP.width : window.innerWidth;
    let viewportHeight = visualVP ? visualVP.height : window.innerHeight;

    // Add padding to account for browser chrome and prevent overflow
    // Mobile browsers have dynamic toolbars that can cause issues
    const padding = 8;
    viewportWidth -= padding * 2;
    viewportHeight -= padding * 2;

    let bestColumns = 52;
    let bestRows = Math.ceil(totalWeeks / 52);
    let bestCellSize = 1;

    // Try different column counts to find the one that maximizes cell size
    // while fitting everything on screen
    for (let cols = 30; cols <= 150; cols++) {
        const rows = Math.ceil(totalWeeks / cols);

        // Calculate the cell size needed to fit this grid
        // Total width = cols * cellSize + (cols - 1) * gap
        // Total height = rows * cellSize + (rows - 1) * gap
        const maxCellWidth = (viewportWidth - (cols - 1) * gap) / cols;
        const maxCellHeight = (viewportHeight - (rows - 1) * gap) / rows;
        const cellSize = Math.min(maxCellWidth, maxCellHeight);

        if (cellSize > bestCellSize && cellSize >= 2) {
            bestCellSize = cellSize;
            bestColumns = cols;
            bestRows = rows;
        }
    }

    return {
        columns: bestColumns,
        rows: bestRows,
        cellSize: Math.floor(bestCellSize)
    };
}

// Handle window resize
let resizeTimeout;
function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && calendarContainer.classList.contains('visible')) {
            renderCalendar(JSON.parse(saved));
        }
    }, 100);
}

window.addEventListener('resize', handleResize);

// Also listen to visualViewport resize for mobile browsers
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleResize);
}

// Generate shareable URL
function generateShareURL() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const settings = JSON.parse(saved);
    const data = {
        s: settings.sex === 'male' ? 'm' : 'f',
        d: settings.dob,
        c: settings.country,
        t: settings.theme || 'default',
        h: highlights.filter(h => h.startDate && h.endDate).map(h => ({
            l: h.label,
            s: h.startDate,
            e: h.endDate,
            c: h.color
        }))
    };

    const encoded = btoa(JSON.stringify(data));
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = encoded;
    return url.toString();
}

// Load settings from URL
function loadFromURL() {
    const hash = window.location.hash.slice(1);
    if (!hash) return null;

    try {
        const data = JSON.parse(atob(hash));
        return {
            settings: {
                sex: data.s === 'm' ? 'male' : 'female',
                dob: data.d,
                country: data.c,
                theme: data.t || 'default'
            },
            highlights: (data.h || []).map(h => ({
                label: h.l,
                startDate: h.s,
                endDate: h.e,
                color: h.c
            }))
        };
    } catch (e) {
        console.error('Failed to parse URL data:', e);
        return null;
    }
}

// Share calendar
function shareCalendar() {
    const url = generateShareURL();
    if (!url) return;

    navigator.clipboard.writeText(url).then(() => {
        showShareToast();
    }).catch(err => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showShareToast();
    });
}

// Show share toast notification
function showShareToast() {
    shareToast.classList.add('visible');
    setTimeout(() => {
        shareToast.classList.remove('visible');
    }, 2000);
}

// Initialize on load
init();
