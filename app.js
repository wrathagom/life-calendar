// DOM Elements
const modal = document.getElementById('modal');
const settingsForm = document.getElementById('settings-form');
const nameInput = document.getElementById('name');
const sexSelect = document.getElementById('sex');
const dobInput = document.getElementById('dob');
const countrySelect = document.getElementById('country');
const themeSelect = document.getElementById('theme');
const customLifeExpectancyInput = document.getElementById('custom-life-expectancy');
const calendarIndexInput = document.getElementById('calendar-index');
const advancedToggle = document.getElementById('advanced-toggle');
const advancedOptions = document.getElementById('advanced-options');
const calendarContainer = document.getElementById('calendar-container');
const calendarsWrapper = document.getElementById('calendars-wrapper');
const infoModal = document.getElementById('info-modal');
const infoContent = document.getElementById('info-content');
const infoClose = document.getElementById('info-close');
const highlightsList = document.getElementById('highlights-list');
const addHighlightBtn = document.getElementById('add-highlight-btn');
const shareToast = document.getElementById('share-toast');
const mobileTooltip = document.getElementById('mobile-tooltip');
const addCalendarBtn = document.getElementById('add-calendar-btn');
const globalMenu = document.getElementById('global-menu');
const globalMenuToggle = document.getElementById('global-menu-toggle');
const shareAllBtn = document.getElementById('share-all-btn');
const downloadBtn = document.getElementById('download-btn');
const cancelBtn = document.getElementById('cancel-btn');
const swipeIndicator = document.getElementById('swipe-indicator');

// Track active calendar index for mobile
let activeCalendarIndex = 0;

// Maximum number of calendars allowed
const MAX_CALENDARS = 2;

// Storage keys
const STORAGE_KEY = 'life-calendar-settings';
const HIGHLIGHTS_KEY = 'life-calendar-highlights';
const CALENDARS_KEY = 'life-calendar-calendars';

// Highlights array (for primary calendar)
let highlights = [];

// Array of calendar settings (supports multiple calendars)
let calendars = [];

// Track if we're adding a new calendar (for cancel behavior)
let isAddingNewCalendar = false;

// Initialize
function init() {
    populateCountries();

    // Check for URL parameters first
    const urlData = loadFromURL();
    if (urlData) {
        // Load from URL
        highlights = urlData.highlights || [];
        calendars = urlData.calendars || [urlData.settings];
        renderHighlightsList();

        // Apply theme from first calendar
        if (calendars[0] && calendars[0].theme) {
            themeSelect.value = calendars[0].theme;
            applyTheme(calendars[0].theme);
        } else {
            updateFavicon();
        }
        showCalendars();
    } else {
        // Load from localStorage
        loadHighlights();
        loadCalendars();
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

// Load calendars from storage
function loadCalendars() {
    // Try new multi-calendar storage first
    const savedCalendars = localStorage.getItem(CALENDARS_KEY);
    if (savedCalendars) {
        calendars = JSON.parse(savedCalendars);
        if (calendars.length > 0 && calendars[0].theme) {
            themeSelect.value = calendars[0].theme;
            applyTheme(calendars[0].theme);
        }
        showCalendars();
        return;
    }

    // Fall back to legacy single-calendar storage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        const settings = JSON.parse(saved);
        calendars = [settings];
        if (settings.theme) {
            themeSelect.value = settings.theme;
            applyTheme(settings.theme);
        }
        showCalendars();
    }
}

// Save calendars to storage
function saveCalendars() {
    localStorage.setItem(CALENDARS_KEY, JSON.stringify(calendars));
    // Also save to legacy key for backwards compatibility
    if (calendars.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(calendars[0]));
    }
}

// Setup event listeners
function setupEventListeners() {
    settingsForm.addEventListener('submit', handleSubmit);
    advancedToggle.addEventListener('click', toggleAdvanced);
    themeSelect.addEventListener('change', previewTheme);
    infoClose.addEventListener('click', closeInfoModal);
    addHighlightBtn.addEventListener('click', addHighlight);
    addCalendarBtn.addEventListener('click', addNewCalendar);
    calendarsWrapper.addEventListener('click', handleCalendarClick);
    calendarsWrapper.addEventListener('scroll', handleCalendarScroll);
    // Touch events for mobile swipe detection
    calendarsWrapper.addEventListener('touchstart', handleTouchStart, { passive: true });
    calendarsWrapper.addEventListener('touchend', handleTouchEnd, { passive: true });
    globalMenuToggle.addEventListener('click', toggleGlobalMenu);
    shareAllBtn.addEventListener('click', shareAllCalendars);
    downloadBtn.addEventListener('click', downloadCalendars);
    cancelBtn.addEventListener('click', cancelModal);
}

// Handle scroll on calendars wrapper (for mobile swipe detection)
function handleCalendarScroll() {
    if (calendars.length <= 1) return;
    if (isProgrammaticScroll) return;

    const scrollLeft = calendarsWrapper.scrollLeft;
    const panelWidth = calendarsWrapper.offsetWidth;
    const newIndex = Math.round(scrollLeft / panelWidth);

    if (newIndex !== activeCalendarIndex && newIndex >= 0 && newIndex < calendars.length) {
        activeCalendarIndex = newIndex;
        updateSwipeIndicatorDots();
    }
}

// Touch handling for swipe detection
let touchStartX = 0;
let isProgrammaticScroll = false;

function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
}

function handleTouchEnd(e) {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (calendars.length <= 1) return;

    const threshold = 50; // minimum swipe distance

    if (Math.abs(diff) > threshold) {
        let newIndex = activeCalendarIndex;
        if (diff > 0 && activeCalendarIndex < calendars.length - 1) {
            // Swipe left - go to next calendar
            newIndex = activeCalendarIndex + 1;
        } else if (diff < 0 && activeCalendarIndex > 0) {
            // Swipe right - go to previous calendar
            newIndex = activeCalendarIndex - 1;
        }

        if (newIndex !== activeCalendarIndex) {
            activeCalendarIndex = newIndex;
            scrollToCalendar(activeCalendarIndex);
        }
    }
}

// Cancel/close modal without saving
function cancelModal() {
    modal.classList.add('hidden');
    // Show calendars again if we have existing calendars
    if (calendars.length > 0) {
        calendarContainer.classList.add('visible');
    }
    isAddingNewCalendar = false;
}

// Toggle global menu
function toggleGlobalMenu() {
    globalMenu.classList.toggle('expanded');
}

// Share all calendars
function shareAllCalendars() {
    if (calendars.length === 0) return;

    const shareUrl = generateShareURL(calendars);
    navigator.clipboard.writeText(shareUrl).then(() => {
        showShareToast();
    }).catch(err => {
        console.error('Failed to copy:', err);
        // Fallback for older browsers
        prompt('Copy this link:', shareUrl);
    });
}

// Download calendars as image
async function downloadCalendars() {
    if (calendars.length === 0) return;

    // Hide UI elements during capture
    const elementsToHide = [globalMenu, addCalendarBtn, mobileTooltip];
    const controlElements = document.querySelectorAll('.calendar-controls, .remove-calendar-btn');

    elementsToHide.forEach(el => el.style.visibility = 'hidden');
    controlElements.forEach(el => el.style.visibility = 'hidden');

    try {
        const canvas = await html2canvas(calendarsWrapper, {
            backgroundColor: getComputedStyle(document.body).getPropertyValue('--bg-primary').trim() || '#1a1a2e',
            scale: 2, // Higher resolution
            logging: false
        });

        // Create download link
        const link = document.createElement('a');
        link.download = 'life-calendar.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (err) {
        console.error('Failed to generate image:', err);
        alert('Failed to download image. Please try again.');
    } finally {
        // Restore UI elements
        elementsToHide.forEach(el => el.style.visibility = '');
        controlElements.forEach(el => el.style.visibility = '');
    }
}

// Handle form submission
function handleSubmit(e) {
    e.preventDefault();

    const calendarIndex = parseInt(calendarIndexInput.value);
    const customLE = customLifeExpectancyInput.value;

    const settings = {
        name: nameInput.value.trim() || null,
        sex: sexSelect.value,
        dob: dobInput.value,
        country: countrySelect.value,
        theme: themeSelect.value,
        customLifeExpectancy: customLE ? parseFloat(customLE) : null
    };

    // Update or add calendar settings
    if (calendarIndex < calendars.length) {
        calendars[calendarIndex] = settings;
    } else {
        calendars.push(settings);
    }

    saveCalendars();
    // Use first calendar's theme for global elements (favicon, etc.)
    if (calendars[0]) {
        applyTheme(calendars[0].theme);
    }
    isAddingNewCalendar = false;
    showCalendars();
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

// Open info modal for a specific calendar
function openInfoModal(calendarIndex = 0) {
    if (calendars.length === 0 || !calendars[calendarIndex]) return;

    const settings = calendars[calendarIndex];
    const data = LIFE_EXPECTANCY_DATA[settings.country];
    const countryLifeExpectancy = data ? (settings.sex === 'male' ? data.male : data.female) : 80;
    const lifeExpectancy = settings.customLifeExpectancy || countryLifeExpectancy;
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

    const lifeExpectancyLabel = settings.customLifeExpectancy
        ? `${lifeExpectancy.toFixed(1)} years (custom)`
        : `${lifeExpectancy.toFixed(1)} years`;

    // Update modal title for multiple calendars
    const modalTitle = infoModal.querySelector('h2');
    if (calendars.length > 1) {
        modalTitle.textContent = `Calendar ${calendarIndex + 1} Info`;
    } else {
        modalTitle.textContent = 'Life Expectancy Info';
    }

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
                <span class="info-stat-value">${lifeExpectancyLabel}</span>
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
    infoModal.classList.remove('hidden');
}

// Close info modal
function closeInfoModal() {
    infoModal.classList.add('hidden');
}

// Open modal for a specific calendar
function openModal(calendarIndex = 0) {
    calendarIndexInput.value = calendarIndex;

    // Populate form with existing calendar data or defaults
    const settings = calendars[calendarIndex] || {};
    nameInput.value = settings.name || '';
    sexSelect.value = settings.sex || '';
    dobInput.value = settings.dob || '';
    countrySelect.value = settings.country || '';
    themeSelect.value = settings.theme || 'default';
    customLifeExpectancyInput.value = settings.customLifeExpectancy || '';

    // Update modal title for additional calendars
    const modalTitle = modal.querySelector('h2');
    if (calendarIndex > 0) {
        modalTitle.textContent = `Calendar ${calendarIndex + 1} Settings`;
    } else {
        modalTitle.textContent = 'Your Life Calendar';
    }

    modal.classList.remove('hidden');
    calendarContainer.classList.remove('visible');
    renderHighlightsList();
}

// Show all calendars
function showCalendars() {
    modal.classList.add('hidden');
    calendarContainer.classList.add('visible');
    renderAllCalendars();
}

// Render all calendar panels
function renderAllCalendars() {
    // Clear existing panels
    calendarsWrapper.innerHTML = '';

    // Show/hide add button based on calendar count
    if (calendars.length >= MAX_CALENDARS) {
        addCalendarBtn.classList.add('hidden');
    } else {
        addCalendarBtn.classList.remove('hidden');
    }

    // Calculate aligned grid info for multiple calendars
    const alignmentInfo = calendars.length > 1 ? calculateAlignedGrid() : null;

    // Create a panel for each calendar
    calendars.forEach((settings, index) => {
        const panel = document.createElement('div');
        panel.className = 'calendar-panel';
        panel.dataset.index = index;

        // Apply theme to individual panel
        if (settings.theme && settings.theme !== 'default') {
            panel.setAttribute('data-theme', settings.theme);
        }

        // Add remove button (hidden for first calendar if only one exists)
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-calendar-btn' + (calendars.length === 1 ? ' hidden' : '');
        removeBtn.title = 'Remove calendar';
        removeBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
            </svg>
        `;

        // Add per-calendar control buttons
        const controls = document.createElement('div');
        controls.className = 'calendar-controls';
        controls.innerHTML = `
            <button class="calendar-settings-btn" title="Settings" data-index="${index}">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                </svg>
            </button>
            <button class="calendar-info-btn" title="Info" data-index="${index}">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
            </button>
            <button class="calendar-share-btn" title="Share" data-index="${index}">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
                </svg>
            </button>
        `;

        // Add name label if set
        if (settings.name) {
            const nameLabel = document.createElement('div');
            nameLabel.className = 'calendar-name';
            nameLabel.textContent = settings.name;
            panel.appendChild(nameLabel);
        }

        const calendarDiv = document.createElement('div');
        calendarDiv.className = 'calendar';
        calendarDiv.dataset.index = index;

        panel.appendChild(removeBtn);
        panel.appendChild(controls);
        panel.appendChild(calendarDiv);
        calendarsWrapper.appendChild(panel);

        renderCalendar(settings, calendarDiv, calendars.length, alignmentInfo);
    });

    // Update swipe indicator for mobile
    updateSwipeIndicator();
    // Update active calendar controls for mobile
    updateActiveCalendarControls();

}

// Update swipe indicator dots
function updateSwipeIndicator() {
    if (calendars.length <= 1) {
        swipeIndicator.innerHTML = '';
        return;
    }

    swipeIndicator.innerHTML = calendars.map((_, index) =>
        `<div class="dot${index === activeCalendarIndex ? ' active' : ''}" data-index="${index}"></div>`
    ).join('');

    // Add click handlers to dots
    swipeIndicator.querySelectorAll('.dot').forEach(dot => {
        dot.addEventListener('click', () => {
            const index = parseInt(dot.dataset.index);
            scrollToCalendar(index);
        });
    });
}

// Scroll to a specific calendar (for mobile)
function scrollToCalendar(index) {
    const panels = calendarsWrapper.querySelectorAll('.calendar-panel');
    if (panels[index]) {
        isProgrammaticScroll = true;
        panels[index].scrollIntoView({ behavior: 'smooth', inline: 'start' });
        activeCalendarIndex = index;
        updateSwipeIndicatorDots();
        // Reset flag after scroll animation completes
        setTimeout(() => {
            isProgrammaticScroll = false;
        }, 500);
    }
}

// Update just the active dot (without re-rendering)
function updateSwipeIndicatorDots() {
    swipeIndicator.querySelectorAll('.dot').forEach((dot, index) => {
        dot.classList.toggle('active', index === activeCalendarIndex);
    });
    // Also update which calendar controls are visible on mobile
    updateActiveCalendarControls();
}

// Update which calendar's controls are visible (for mobile)
function updateActiveCalendarControls() {
    const panels = calendarsWrapper.querySelectorAll('.calendar-panel');
    panels.forEach((panel, index) => {
        const controls = panel.querySelector('.calendar-controls');
        if (controls) {
            controls.classList.toggle('mobile-active', index === activeCalendarIndex);
        }
    });
}

// Calculate aligned grid parameters for multiple calendars
function calculateAlignedGrid() {
    if (calendars.length < 2) return null;

    // Find earliest birth date and latest death date
    let earliestBirth = null;
    let latestDeath = null;

    calendars.forEach(settings => {
        const birthDate = new Date(settings.dob);
        const lifeWeeks = getLifeExpectancyWeeks(settings);
        const deathDate = new Date(birthDate);
        deathDate.setDate(deathDate.getDate() + lifeWeeks * 7);

        if (!earliestBirth || birthDate < earliestBirth) {
            earliestBirth = birthDate;
        }
        if (!latestDeath || deathDate > latestDeath) {
            latestDeath = deathDate;
        }
    });

    // Calculate total weeks from earliest birth to latest death
    const totalWeeks = Math.ceil((latestDeath - earliestBirth) / (1000 * 60 * 60 * 24 * 7));

    // Calculate grid dimensions for the total span
    const gridInfo = calculateGrid(totalWeeks, calendars.length);

    return {
        earliestBirth,
        latestDeath,
        totalWeeks,
        columns: gridInfo.columns,
        rows: gridInfo.rows,
        cellSize: gridInfo.cellSize
    };
}

// Calculate life expectancy in weeks
function getLifeExpectancyWeeks(settings) {
    // Use custom life expectancy if set
    if (settings.customLifeExpectancy) {
        return Math.round(settings.customLifeExpectancy * 52);
    }

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

// Get SVG polygon points for multi-highlight splits
function getHighlightPolygons(count) {
    // Returns array of SVG polygon point strings for each segment
    // Using 100x100 viewBox coordinates
    switch (count) {
        case 2:
            // Diagonal split: top-left triangle, bottom-right triangle
            return [
                '0,0 100,0 0,100',
                '100,0 100,100 0,100'
            ];
        case 3:
            // Y-split / pinwheel: top, bottom-right, bottom-left
            return [
                '0,0 100,0 50,50',
                '100,0 100,100 50,50',
                '0,0 50,50 100,100 0,100'
            ];
        case 4:
            // X-split into quarters: left, top, right, bottom
            return [
                '0,0 50,50 0,100',
                '0,0 100,0 50,50',
                '100,0 100,100 50,50',
                '50,50 100,100 0,100'
            ];
        default:
            return [];
    }
}

// Get all highlights for a week index (supports overlapping highlights)
function getHighlightsForWeek(weekIndex, dob) {
    const birthDate = new Date(dob);
    const weekDate = new Date(birthDate);
    weekDate.setDate(weekDate.getDate() + weekIndex * 7);

    const matchingHighlights = [];
    for (const highlight of highlights) {
        if (!highlight.startDate || !highlight.endDate) continue;

        const startDate = new Date(highlight.startDate);
        const endDate = new Date(highlight.endDate);

        if (weekDate >= startDate && weekDate <= endDate) {
            matchingHighlights.push(highlight);
        }
    }
    // Limit to 4 highlights max for display
    return matchingHighlights.slice(0, 4);
}

// Render a single calendar
function renderCalendar(settings, calendarElement, totalCalendars = 1, alignmentInfo = null) {
    const lifeWeeks = getLifeExpectancyWeeks(settings);
    const weeksLived = getWeeksLived(settings.dob);
    const birthDate = new Date(settings.dob);
    const calendarIndex = parseInt(calendarElement.dataset.index);

    // Clear existing
    calendarElement.innerHTML = '';

    // Use alignment info if available (for multi-calendar comparison)
    let columns, rows, cellSize, totalWeeks, birthOffset;

    if (alignmentInfo) {
        // Calculate how many weeks after the earliest birth this person was born
        birthOffset = Math.floor((birthDate - alignmentInfo.earliestBirth) / (1000 * 60 * 60 * 24 * 7));
        totalWeeks = alignmentInfo.totalWeeks;
        columns = alignmentInfo.columns;
        rows = alignmentInfo.rows;
        cellSize = alignmentInfo.cellSize;
    } else {
        // Single calendar - no alignment needed
        birthOffset = 0;
        totalWeeks = lifeWeeks;
        const gridInfo = calculateGrid(totalWeeks, totalCalendars);
        columns = gridInfo.columns;
        rows = gridInfo.rows;
        cellSize = gridInfo.cellSize;
    }

    // Set grid template with explicit sizes
    calendarElement.style.gridTemplateColumns = `repeat(${columns}, ${cellSize}px)`;
    calendarElement.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;

    // Create week cells for the entire grid span
    for (let i = 0; i < totalWeeks; i++) {
        const week = document.createElement('div');
        week.className = 'week';

        // Calculate which week of this person's life this represents
        const lifeWeekIndex = i - birthOffset;
        const isBeforeBirth = lifeWeekIndex < 0;
        const isAfterDeath = lifeWeekIndex >= lifeWeeks;

        if (isBeforeBirth || isAfterDeath) {
            // This week is outside this person's lifespan - show as empty/transparent
            week.classList.add('empty');
        } else {
            // Check for highlights (only for primary calendar)
            const weekHighlights = calendarIndex === 0 ? getHighlightsForWeek(lifeWeekIndex, settings.dob) : [];

            if (weekHighlights.length > 0) {
                week.classList.add('highlighted');

                if (weekHighlights.length === 1) {
                    // Single highlight - use background color directly
                    week.style.backgroundColor = weekHighlights[0].color;
                } else {
                    // Multiple highlights - create SVG with polygon segments
                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('viewBox', '0 0 100 100');
                    svg.setAttribute('preserveAspectRatio', 'none');
                    svg.classList.add('highlight-svg');

                    const polygonPoints = getHighlightPolygons(weekHighlights.length);
                    weekHighlights.forEach((h, idx) => {
                        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                        polygon.setAttribute('points', polygonPoints[idx]);
                        polygon.setAttribute('fill', h.color);
                        svg.appendChild(polygon);
                    });

                    week.appendChild(svg);
                }
            } else if (lifeWeekIndex < weeksLived) {
                week.classList.add('lived');
            } else if (lifeWeekIndex === weeksLived) {
                week.classList.add('current');
            } else {
                week.classList.add('future');
            }

            // Calculate the date for this week and set tooltip
            const weekDate = new Date(birthDate);
            weekDate.setDate(weekDate.getDate() + lifeWeekIndex * 7);
            let tooltip = formatWeekDate(weekDate, lifeWeekIndex);
            if (weekHighlights.length > 0) {
                const labels = weekHighlights.map(h => h.label).filter(l => l);
                if (labels.length > 0) {
                    tooltip += ` - ${labels.join(', ')}`;
                }
            }
            week.title = tooltip;
            week.dataset.tooltip = tooltip;
        }

        calendarElement.appendChild(week);
    }
}

// Get calendar index - on mobile use active calendar, otherwise use data-index
function getCalendarIndex(element) {
    if (isMobile() && calendars.length > 1) {
        return activeCalendarIndex;
    }
    return parseInt(element.dataset.index);
}

// Handle click on calendars wrapper (for week taps and calendar editing)
function handleCalendarClick(e) {
    // Check for remove button click
    const removeBtn = e.target.closest('.remove-calendar-btn');
    if (removeBtn) {
        const panel = removeBtn.closest('.calendar-panel');
        const index = parseInt(panel.dataset.index);
        removeCalendar(index);
        return;
    }

    // Check for settings button click
    const settingsBtn = e.target.closest('.calendar-settings-btn');
    if (settingsBtn) {
        const index = getCalendarIndex(settingsBtn);
        openModal(index);
        return;
    }

    // Check for info button click
    const infoBtn = e.target.closest('.calendar-info-btn');
    if (infoBtn) {
        const index = getCalendarIndex(infoBtn);
        openInfoModal(index);
        return;
    }

    // Check for share button click
    const shareBtn = e.target.closest('.calendar-share-btn');
    if (shareBtn) {
        const index = getCalendarIndex(shareBtn);
        shareCalendar(index);
        return;
    }

    // Handle week tap for tooltip
    const week = e.target.closest('.week');
    if (week) {
        handleWeekTap(week);
    }
}

// Handle tap on week cell for mobile tooltip
let tooltipTimeout;
function handleWeekTap(week) {
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

// Add a new calendar
function addNewCalendar() {
    isAddingNewCalendar = true;
    // Open modal for new calendar
    openModal(calendars.length);
}

// Remove a calendar
function removeCalendar(index) {
    if (calendars.length <= 1) return; // Don't remove the last calendar

    calendars.splice(index, 1);
    saveCalendars();
    renderAllCalendars();
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

// Check if we're on mobile (matches CSS media query)
function isMobile() {
    return window.innerWidth <= 768;
}

// Calculate optimal grid dimensions to fill the viewport
function calculateGrid(totalWeeks, numCalendars = 1) {
    const gap = 2;

    // Use visualViewport if available (more accurate on mobile), otherwise fall back to window
    const visualVP = window.visualViewport;
    let viewportWidth = visualVP ? visualVP.width : window.innerWidth;
    let viewportHeight = visualVP ? visualVP.height : window.innerHeight;

    // Add padding to account for browser chrome and prevent overflow
    // Mobile browsers have dynamic toolbars that can cause issues
    const padding = 16;
    viewportWidth -= padding * 2;
    viewportHeight -= padding * 2;

    // On mobile, calendars are shown one at a time (swipe view), so don't divide width
    const effectiveNumCalendars = isMobile() ? 1 : numCalendars;

    // Divide width by number of calendars (with gap between them)
    const calendarGap = 24;
    const availableWidth = (viewportWidth - (effectiveNumCalendars - 1) * calendarGap) / effectiveNumCalendars;

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
        const maxCellWidth = (availableWidth - (cols - 1) * gap) / cols;
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
        if (calendars.length > 0 && calendarContainer.classList.contains('visible')) {
            renderAllCalendars();
        }
    }, 100);
}

window.addEventListener('resize', handleResize);

// Also listen to visualViewport resize for mobile browsers
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleResize);
}

// Generate shareable URL for a specific calendar or all calendars
function generateShareURL(calendarIndex = -1) {
    if (calendars.length === 0) return null;

    // If a specific calendar index is provided, share just that one
    const calendarsToShare = calendarIndex >= 0 && calendarIndex < calendars.length
        ? [calendars[calendarIndex]]
        : calendars;

    // Only include highlights if sharing the primary calendar (or all)
    const includeHighlights = calendarIndex === -1 || calendarIndex === 0;

    const data = {
        calendars: calendarsToShare.map(settings => ({
            n: settings.name || null,
            s: settings.sex === 'male' ? 'm' : 'f',
            d: settings.dob,
            c: settings.country,
            t: settings.theme || 'default',
            le: settings.customLifeExpectancy || null
        })),
        h: includeHighlights ? highlights.filter(h => h.startDate && h.endDate).map(h => ({
            l: h.label,
            s: h.startDate,
            e: h.endDate,
            c: h.color
        })) : []
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

        // Support new multi-calendar format
        if (data.calendars) {
            return {
                calendars: data.calendars.map(c => ({
                    name: c.n || null,
                    sex: c.s === 'm' ? 'male' : 'female',
                    dob: c.d,
                    country: c.c,
                    theme: c.t || 'default',
                    customLifeExpectancy: c.le || null
                })),
                highlights: (data.h || []).map(h => ({
                    label: h.l,
                    startDate: h.s,
                    endDate: h.e,
                    color: h.c
                }))
            };
        }

        // Support legacy single-calendar format
        return {
            calendars: [{
                sex: data.s === 'm' ? 'male' : 'female',
                dob: data.d,
                country: data.c,
                theme: data.t || 'default',
                customLifeExpectancy: null
            }],
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

// Share a specific calendar (or all if index is -1)
function shareCalendar(calendarIndex = -1) {
    const url = generateShareURL(calendarIndex);
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
