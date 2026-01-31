import { dom } from './dom.js';
import { LIFE_EXPECTANCY_DATA, COUNTRIES } from './data.js';
import {
    calculateGrid,
    formatWeekDate,
    getMomentShapeSVG,
    getPeriodPolygons,
    getShapeSymbol,
    getWeekIndexForDate,
    getWeeksLived,
    isMobile
} from './utils.js';

// DOM Elements
const {
    modal,
    settingsForm,
    nameInput,
    sexSelect,
    dobInput,
    countrySelect,
    themeSelect,
    customLifeExpectancyInput,
    calendarIndexInput,
    advancedToggle,
    advancedOptions,
    calendarContainer,
    calendarsWrapper,
    infoModal,
    infoContent,
    infoClose,
    periodsList,
    addPeriodBtn,
    momentsList,
    addMomentBtn,
    formError,
    shareToast,
    mobileTooltip,
    addCalendarBtn,
    globalMenu,
    globalMenuToggle,
    shareAllBtn,
    downloadBtn,
    resetBtn,
    cancelBtn,
    swipeIndicator
} = dom;

// Track active calendar index for mobile
let activeCalendarIndex = 0;

// Maximum number of calendars allowed
const MAX_CALENDARS = 2;

// Storage keys
const STORAGE_KEY = 'life-calendar-settings';
const PERIODS_KEY = 'life-calendar-periods';
const MOMENTS_KEY = 'life-calendar-moments';
const CALENDARS_KEY = 'life-calendar-calendars';

// Array of calendar settings (supports multiple calendars)
// Each calendar has: { name, sex, dob, country, theme, customLifeExpectancy, periods: [], moments: [] }
let calendars = [];

// Currently editing calendar index (for periods/moments UI)
let editingCalendarIndex = 0;

// Track if we're adding a new calendar (for cancel behavior)
let isAddingNewCalendar = false;

function showFormError(message) {
    if (!formError) return;
    if (!message) {
        formError.textContent = '';
        formError.classList.add('hidden');
        return;
    }
    formError.textContent = message;
    formError.classList.remove('hidden');
}

function getExpectedDeathDate(settings) {
    if (!settings || !settings.dob) return null;
    const birthDate = new Date(settings.dob);
    if (Number.isNaN(birthDate.getTime())) return null;
    const totalWeeks = getLifeExpectancyWeeks(settings);
    const deathDate = new Date(birthDate);
    deathDate.setDate(deathDate.getDate() + totalWeeks * 7);
    return deathDate;
}

function validateCalendarInput(settings, periods = [], moments = []) {
    const errors = [];
    const now = new Date();

    if (!settings.sex) {
        errors.push('Please select a sex.');
    }
    if (!settings.dob) {
        errors.push('Please enter a date of birth.');
    } else {
        const dobDate = new Date(settings.dob);
        if (Number.isNaN(dobDate.getTime())) {
            errors.push('Please enter a valid date of birth.');
        } else if (dobDate > now) {
            errors.push('Date of birth cannot be in the future.');
        }
    }
    if (!settings.country) {
        errors.push('Please select a country.');
    }

    if (settings.customLifeExpectancy !== null && settings.customLifeExpectancy !== undefined) {
        if (Number.isNaN(settings.customLifeExpectancy) || settings.customLifeExpectancy <= 0 || settings.customLifeExpectancy > 150) {
            errors.push('Custom life expectancy must be between 1 and 150 years.');
        }
    }

    const birthDate = settings.dob ? new Date(settings.dob) : null;
    const deathDate = getExpectedDeathDate(settings);

    periods.forEach((period, index) => {
        const hasStart = !!period.startDate;
        const hasEnd = !!period.endDate;
        if (hasStart !== hasEnd) {
            errors.push(`Period ${index + 1} needs both a start and end date.`);
            return;
        }
        if (!hasStart || !hasEnd) return;
        const startDate = new Date(period.startDate);
        const endDate = new Date(period.endDate);
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
            errors.push(`Period ${index + 1} has an invalid date.`);
            return;
        }
        if (startDate > endDate) {
            errors.push(`Period ${index + 1} start date must be before the end date.`);
            return;
        }
        if (birthDate && endDate < birthDate) {
            errors.push(`Period ${index + 1} ends before the date of birth.`);
            return;
        }
        if (deathDate && startDate > deathDate) {
            errors.push(`Period ${index + 1} starts after the expected life span.`);
        }
    });

    moments.forEach((moment, index) => {
        if (!moment.date) return;
        const momentDate = new Date(moment.date);
        if (Number.isNaN(momentDate.getTime())) {
            errors.push(`Moment ${index + 1} has an invalid date.`);
            return;
        }
        if (birthDate && momentDate < birthDate) {
            errors.push(`Moment ${index + 1} occurs before the date of birth.`);
            return;
        }
        if (deathDate && momentDate > deathDate) {
            errors.push(`Moment ${index + 1} occurs after the expected life span.`);
        }
    });

    return errors;
}

// Initialize
async function init() {
    populateCountries();

    // Check for example parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const exampleName = urlParams.get('example');

    if (exampleName) {
        // Try to load example from static JSON file
        const exampleData = await loadExample(exampleName);
        if (exampleData) {
            calendars = [exampleData];
            if (exampleData.theme) {
                themeSelect.value = exampleData.theme;
                applyTheme(exampleData.theme);
            } else {
                updateFavicon();
            }
            showCalendars();
            setupEventListeners();
            return;
        }
    }

    // Check for URL hash parameters
    const urlData = loadFromURL();
    if (urlData) {
        // Load from URL - calendars now include their periods/moments
        calendars = urlData.calendars;
        // Ensure each calendar has periods and moments arrays
        calendars.forEach(cal => {
            cal.periods = cal.periods || [];
            cal.moments = cal.moments || [];
        });

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
        loadCalendars();
        updateFavicon();
    }

    setupEventListeners();
}

// Load example from static JSON file
async function loadExample(name) {
    try {
        // Sanitize the name to prevent directory traversal
        const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '');
        const response = await fetch(`examples/${safeName}.json`);
        if (!response.ok) {
            console.warn(`Example "${name}" not found`);
            return null;
        }
        const data = await response.json();

        // Convert to calendar format
        return {
            name: data.name || null,
            sex: data.sex || 'female',
            dob: data.dob,
            country: data.country,
            theme: data.theme || 'default',
            customLifeExpectancy: data.customLifeExpectancy || null,
            periods: data.periods || [],
            moments: data.moments || []
        };
    } catch (e) {
        console.error(`Failed to load example "${name}":`, e);
        return null;
    }
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

// Get periods for the currently editing calendar
function getCurrentPeriods() {
    if (!calendars[editingCalendarIndex]) return [];
    return calendars[editingCalendarIndex].periods || [];
}

// Get moments for the currently editing calendar
function getCurrentMoments() {
    if (!calendars[editingCalendarIndex]) return [];
    return calendars[editingCalendarIndex].moments || [];
}

// Render periods list in settings for current calendar
function renderPeriodsList() {
    const periods = getCurrentPeriods();
    if (periods.length === 0) {
        periodsList.innerHTML = '<p class="periods-empty">No periods yet</p>';
        return;
    }

    periodsList.innerHTML = periods.map((p, index) => `
        <div class="period-item" data-index="${index}">
            <div class="period-row">
                <input type="text" value="${p.label || ''}" placeholder="Label" data-field="label">
                <input type="color" value="${p.color || '#ef4444'}" data-field="color">
                <button type="button" class="period-delete" data-index="${index}">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                    </svg>
                </button>
            </div>
            <div class="period-row">
                <input type="date" value="${p.startDate || ''}" data-field="startDate">
                <input type="date" value="${p.endDate || ''}" data-field="endDate">
            </div>
        </div>
    `).join('');

    // Add event listeners for inputs
    periodsList.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', handlePeriodChange);
    });

    // Add event listeners for delete buttons
    periodsList.querySelectorAll('.period-delete').forEach(btn => {
        btn.addEventListener('click', handlePeriodDelete);
    });
}

// Render moments list in settings for current calendar
function renderMomentsList() {
    const moments = getCurrentMoments();
    if (moments.length === 0) {
        momentsList.innerHTML = '<p class="moments-empty">No moments yet</p>';
        return;
    }

    momentsList.innerHTML = moments.map((m, index) => `
        <div class="moment-item" data-index="${index}">
            <div class="moment-row">
                <input type="text" value="${m.label || ''}" placeholder="Label" data-field="label">
                <input type="color" value="${m.color || '#fbbf24'}" data-field="color">
                <button type="button" class="moment-delete" data-index="${index}">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                    </svg>
                </button>
            </div>
            <div class="moment-row">
                <input type="date" value="${m.date || ''}" data-field="date">
                <select data-field="shape">
                    <option value="star" ${m.shape === 'star' || !m.shape ? 'selected' : ''}>Star</option>
                    <option value="heart" ${m.shape === 'heart' ? 'selected' : ''}>Heart</option>
                    <option value="diamond" ${m.shape === 'diamond' ? 'selected' : ''}>Diamond</option>
                    <option value="circle" ${m.shape === 'circle' ? 'selected' : ''}>Circle</option>
                </select>
            </div>
        </div>
    `).join('');

    // Add event listeners for inputs and selects
    momentsList.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('change', handleMomentChange);
    });

    // Add event listeners for delete buttons
    momentsList.querySelectorAll('.moment-delete').forEach(btn => {
        btn.addEventListener('click', handleMomentDelete);
    });
}

// Handle period input change
function handlePeriodChange(e) {
    const item = e.target.closest('.period-item');
    const index = parseInt(item.dataset.index);
    const field = e.target.dataset.field;
    if (calendars[editingCalendarIndex] && calendars[editingCalendarIndex].periods) {
        calendars[editingCalendarIndex].periods[index][field] = e.target.value;
        saveCalendars();
    }
}

// Handle period delete
function handlePeriodDelete(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    if (calendars[editingCalendarIndex] && calendars[editingCalendarIndex].periods) {
        calendars[editingCalendarIndex].periods.splice(index, 1);
        saveCalendars();
        renderPeriodsList();
    }
}

// Add new period
function addPeriod() {
    if (!calendars[editingCalendarIndex]) return;
    if (!calendars[editingCalendarIndex].periods) {
        calendars[editingCalendarIndex].periods = [];
    }
    calendars[editingCalendarIndex].periods.push({
        label: '',
        startDate: '',
        endDate: '',
        color: '#ef4444'
    });
    saveCalendars();
    renderPeriodsList();
}

// Handle moment input change
function handleMomentChange(e) {
    const item = e.target.closest('.moment-item');
    const index = parseInt(item.dataset.index);
    const field = e.target.dataset.field;
    if (calendars[editingCalendarIndex] && calendars[editingCalendarIndex].moments) {
        calendars[editingCalendarIndex].moments[index][field] = e.target.value;
        saveCalendars();
    }
}

// Handle moment delete
function handleMomentDelete(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    if (calendars[editingCalendarIndex] && calendars[editingCalendarIndex].moments) {
        calendars[editingCalendarIndex].moments.splice(index, 1);
        saveCalendars();
        renderMomentsList();
    }
}

// Add new moment
function addMoment() {
    if (!calendars[editingCalendarIndex]) return;
    if (!calendars[editingCalendarIndex].moments) {
        calendars[editingCalendarIndex].moments = [];
    }
    calendars[editingCalendarIndex].moments.push({
        label: '',
        date: '',
        color: '#fbbf24',
        shape: 'star'
    });
    saveCalendars();
    renderMomentsList();
}

// Load calendars from storage
function loadCalendars() {
    // Try new multi-calendar storage first
    const savedCalendars = localStorage.getItem(CALENDARS_KEY);
    if (savedCalendars) {
        calendars = JSON.parse(savedCalendars);
        // Ensure each calendar has periods and moments arrays
        calendars.forEach(cal => {
            cal.periods = cal.periods || [];
            cal.moments = cal.moments || [];
        });
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
        // Migrate legacy periods/moments from separate storage keys
        let legacyPeriods = [];
        let legacyMoments = [];
        const savedPeriods = localStorage.getItem(PERIODS_KEY) || localStorage.getItem('life-calendar-highlights');
        const savedMoments = localStorage.getItem(MOMENTS_KEY);
        if (savedPeriods) legacyPeriods = JSON.parse(savedPeriods);
        if (savedMoments) legacyMoments = JSON.parse(savedMoments);

        settings.periods = legacyPeriods;
        settings.moments = legacyMoments;
        calendars = [settings];

        if (settings.theme) {
            themeSelect.value = settings.theme;
            applyTheme(settings.theme);
        }
        // Save in new format
        saveCalendars();
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
    settingsForm.addEventListener('input', () => showFormError(''));
    advancedToggle.addEventListener('click', toggleAdvanced);
    themeSelect.addEventListener('change', previewTheme);
    infoClose.addEventListener('click', closeInfoModal);
    addPeriodBtn.addEventListener('click', addPeriod);
    addMomentBtn.addEventListener('click', addMoment);
    addCalendarBtn.addEventListener('click', addNewCalendar);
    calendarsWrapper.addEventListener('click', handleCalendarClick);
    calendarsWrapper.addEventListener('scroll', handleCalendarScroll);
    // Touch events for mobile swipe detection
    calendarsWrapper.addEventListener('touchstart', handleTouchStart, { passive: true });
    calendarsWrapper.addEventListener('touchend', handleTouchEnd, { passive: true });
    globalMenuToggle.addEventListener('click', toggleGlobalMenu);
    shareAllBtn.addEventListener('click', shareAllCalendars);
    downloadBtn.addEventListener('click', downloadCalendars);
    resetBtn.addEventListener('click', resetAllCalendars);
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

function resetAllCalendars() {
    const confirmed = window.confirm('Reset all calendars and clear saved data?');
    if (!confirmed) return;

    calendars = [];
    activeCalendarIndex = 0;
    editingCalendarIndex = 0;
    isAddingNewCalendar = false;

    localStorage.removeItem(CALENDARS_KEY);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PERIODS_KEY);
    localStorage.removeItem(MOMENTS_KEY);
    localStorage.removeItem('life-calendar-highlights');

    if (window.location.hash) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    themeSelect.value = 'default';
    applyTheme('default');
    updateFavicon();
    globalMenu.classList.remove('expanded');
    calendarsWrapper.innerHTML = '';
    calendarContainer.classList.remove('visible');
    modal.classList.remove('hidden');
    openModal(0);
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
        const canvas = await window.html2canvas(calendarsWrapper, {
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
    const existing = calendars[calendarIndex];
    const periods = existing ? (existing.periods || []) : [];
    const moments = existing ? (existing.moments || []) : [];
    const errors = validateCalendarInput(settings, periods, moments);
    if (errors.length > 0) {
        showFormError(errors[0]);
        return;
    }

    // Update or add calendar settings
    if (calendarIndex < calendars.length) {
        // Update existing calendar - preserve periods and moments
        calendars[calendarIndex].name = settings.name;
        calendars[calendarIndex].sex = settings.sex;
        calendars[calendarIndex].dob = settings.dob;
        calendars[calendarIndex].country = settings.country;
        calendars[calendarIndex].theme = settings.theme;
        calendars[calendarIndex].customLifeExpectancy = settings.customLifeExpectancy;
    } else {
        // Add new calendar with empty periods/moments
        calendars.push({
            name: settings.name,
            sex: settings.sex,
            dob: settings.dob,
            country: settings.country,
            theme: settings.theme,
            customLifeExpectancy: settings.customLifeExpectancy,
            periods: [],
            moments: []
        });
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
    showFormError('');
    calendarIndexInput.value = calendarIndex;
    editingCalendarIndex = calendarIndex;

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

    // Show periods/moments sections and render the lists
    const periodsSection = document.getElementById('periods-section');
    const momentsSection = document.getElementById('moments-section');
    periodsSection.style.display = '';
    momentsSection.style.display = '';
    renderPeriodsList();
    renderMomentsList();

    modal.classList.remove('hidden');
    calendarContainer.classList.remove('visible');
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

// Render a single calendar
function renderCalendar(settings, calendarElement, totalCalendars = 1, alignmentInfo = null) {
    const lifeWeeks = getLifeExpectancyWeeks(settings);
    const weeksLived = getWeeksLived(settings.dob);
    const birthDate = new Date(settings.dob);

    // Clear existing
    calendarElement.innerHTML = '';
    const fragment = document.createDocumentFragment();

    const periodRanges = (settings.periods || [])
        .filter(p => p.startDate && p.endDate)
        .map(p => ({
            startWeek: getWeekIndexForDate(settings.dob, p.startDate),
            endWeek: getWeekIndexForDate(settings.dob, p.endDate),
            period: p
        }))
        .filter(p => p.endWeek >= p.startWeek);

    const momentsByWeek = new Map();
    (settings.moments || []).forEach(moment => {
        if (!moment.date) return;
        const weekIndex = getWeekIndexForDate(settings.dob, moment.date);
        if (!momentsByWeek.has(weekIndex)) {
            momentsByWeek.set(weekIndex, moment);
        }
    });

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
            // Check for periods for this calendar
            const weekPeriods = [];
            if (periodRanges.length > 0) {
                for (const range of periodRanges) {
                    if (lifeWeekIndex >= range.startWeek && lifeWeekIndex <= range.endWeek) {
                        weekPeriods.push(range.period);
                        if (weekPeriods.length >= 4) break;
                    }
                }
            }

            const weekMoment = momentsByWeek.get(lifeWeekIndex) || null;

            if (weekPeriods.length > 0) {
                week.classList.add('has-period');

                if (weekPeriods.length === 1) {
                    // Single period - use background color directly
                    week.style.backgroundColor = weekPeriods[0].color;
                } else {
                    // Multiple periods - create SVG with polygon segments
                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('viewBox', '0 0 100 100');
                    svg.setAttribute('preserveAspectRatio', 'none');
                    svg.classList.add('period-svg');

                    const polygonPoints = getPeriodPolygons(weekPeriods.length);
                    weekPeriods.forEach((p, idx) => {
                        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                        polygon.setAttribute('points', polygonPoints[idx]);
                        polygon.setAttribute('fill', p.color);
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

            // Add moment marker if this week has a moment
            if (weekMoment) {
                week.classList.add('has-moment');
                const marker = document.createElement('div');
                marker.className = 'moment-marker';
                marker.innerHTML = getMomentShapeSVG(weekMoment.shape || 'star', weekMoment.color || '#fbbf24');
                week.appendChild(marker);
            }

            // Calculate the date for this week and set tooltip
            const weekDate = new Date(birthDate);
            weekDate.setDate(weekDate.getDate() + lifeWeekIndex * 7);
            let tooltip = formatWeekDate(weekDate, lifeWeekIndex);
            if (weekPeriods.length > 0) {
                const labels = weekPeriods.map(p => p.label).filter(l => l);
                if (labels.length > 0) {
                    tooltip += ` - ${labels.join(', ')}`;
                }
            }
            if (weekMoment && weekMoment.label) {
                const shapeSymbol = getShapeSymbol(weekMoment.shape || 'star');
                tooltip += ` ${shapeSymbol} ${weekMoment.label}`;
            }
            week.title = tooltip;
            week.dataset.tooltip = tooltip;
        }

        fragment.appendChild(week);
    }

    calendarElement.appendChild(fragment);
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

    const data = {
        calendars: calendarsToShare.map(cal => ({
            n: cal.name || null,
            s: cal.sex === 'male' ? 'm' : 'f',
            d: cal.dob,
            c: cal.country,
            t: cal.theme || 'default',
            le: cal.customLifeExpectancy || null,
            // Include periods and moments per-calendar
            p: (cal.periods || []).filter(p => p.startDate && p.endDate).map(p => ({
                l: p.label,
                s: p.startDate,
                e: p.endDate,
                c: p.color
            })),
            m: (cal.moments || []).filter(m => m.date).map(m => ({
                l: m.label,
                d: m.date,
                c: m.color,
                sh: m.shape || 'star'
            }))
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

        // Support new multi-calendar format with per-calendar periods/moments
        if (data.calendars) {
            // Check if periods/moments are per-calendar (new format) or top-level (legacy)
            const hasPerCalendarData = data.calendars.some(c => c.p || c.m);

            if (hasPerCalendarData) {
                // New format: periods/moments stored per-calendar
                return {
                    calendars: data.calendars.map(c => ({
                        name: c.n || null,
                        sex: c.s === 'm' ? 'male' : 'female',
                        dob: c.d,
                        country: c.c,
                        theme: c.t || 'default',
                        customLifeExpectancy: c.le || null,
                        periods: (c.p || []).map(p => ({
                            label: p.l,
                            startDate: p.s,
                            endDate: p.e,
                            color: p.c
                        })),
                        moments: (c.m || []).map(m => ({
                            label: m.l,
                            date: m.d,
                            color: m.c,
                            shape: m.sh || 'star'
                        }))
                    }))
                };
            } else {
                // Legacy format: periods/moments at top level (assign to first calendar)
                const periodsData = data.p || data.h || [];
                const momentsData = data.m || [];

                return {
                    calendars: data.calendars.map((c, idx) => ({
                        name: c.n || null,
                        sex: c.s === 'm' ? 'male' : 'female',
                        dob: c.d,
                        country: c.c,
                        theme: c.t || 'default',
                        customLifeExpectancy: c.le || null,
                        periods: idx === 0 ? periodsData.map(p => ({
                            label: p.l,
                            startDate: p.s,
                            endDate: p.e,
                            color: p.c
                        })) : [],
                        moments: idx === 0 ? momentsData.map(m => ({
                            label: m.l,
                            date: m.d,
                            color: m.c,
                            shape: m.sh || 'star'
                        })) : []
                    }))
                };
            }
        }

        // Support legacy single-calendar format
        return {
            calendars: [{
                sex: data.s === 'm' ? 'male' : 'female',
                dob: data.d,
                country: data.c,
                theme: data.t || 'default',
                customLifeExpectancy: null,
                periods: (data.h || []).map(h => ({
                    label: h.l,
                    startDate: h.s,
                    endDate: h.e,
                    color: h.c
                })),
                moments: []
            }]
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
