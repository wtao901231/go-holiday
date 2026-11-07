// Configuration
// Preset colors (hex). Cells are painted via the --cell-color CSS variable,
// so any custom color from JSON works the same way as the presets.
const COLORS = {
    holiday: '#EA4335',      // Google Red
    personal: '#4285F4',     // Google Blue
    workday: '#9AA0A6',      // Google Grey Dark
    trip_current: '#34A853', // Google Green
    trip_next: '#FBBC05',    // Google Yellow
    color_life: '#A142F4',   // Google Purple (fallback when no custom color given)
    default: '#F1F3F4'       // Google Grey Light
};
// Types allowed to override their color through the JSON `color` field
const CUSTOM_COLOR_TYPES = ['color_life'];
// Past cells (date <= today) are slightly weakened: the original hue stays
// recognizable, only lightly veiled.
const PAST_OPACITY_FACTOR = 0.8;
const TODAY_BORDER = 'border-2 border-[#1a73e8]'; // Google Blue for focus
const DEFAULT_HOLIDAYS_URL = 'holidays.json';
const STORAGE_KEY = 'custom_holidays_url';
const YEAR_CACHE_KEY = 'go_holiday_years_cache';

// Mobile Styles Definition (Tailwind classes)
const MOBILE_STYLES = {
    'settings-container': 'fixed top-3 right-3 z-50 flex items-center',
    'engine-switch-wrapper': 'flex items-center mr-2 bg-gray-100/90 backdrop-blur-sm rounded-full p-1 pr-2 transition-colors hover:bg-gray-200 shadow-sm border border-gray-200/50',
    'engine-label': 'ml-1 text-xs font-medium text-gray-600 select-none whitespace-nowrap',
    'settings-btn': 'text-gray-500 hover:text-gray-700 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm hover:bg-gray-100 transition-colors shadow-sm border border-gray-200/50 flex items-center justify-center',
    'settings-icon': 'fas fa-cog text-lg',
    'sticky-header': 'w-full bg-white/95 backdrop-blur-sm flex flex-col items-center pt-16 pb-4 flex-shrink-0',
    'logo-container': 'mb-3',
    'search-logo': 'h-12 object-contain',
    'search-container': 'w-full max-w-xl relative px-4',
    'search-input-wrapper': 'flex items-center w-full px-5 py-3 rounded-full border border-gray-200 hover:shadow-md focus-within:shadow-md transition-shadow duration-200 bg-white shadow-sm',
    'heatmap-container': 'w-full flex-1 overflow-y-auto overflow-x-hidden animate-fade-in px-2 pt-4',
    'footer': 'w-full text-center py-4 flex-shrink-0 bg-white/90 backdrop-blur-sm'
};

// Search Engine Configuration
const ENGINE_KEY = 'search_engine_preference';
const ENGINES = {
    google: {
        name: 'Google',
        url: 'https://www.google.com/search?q=',
        logo: 'https://zhiyan-ai-agent-with-1258344702.cos.ap-guangzhou.tencentcos.cn/with/e4cc76b3-a05e-444f-b7ca-19f39663564c/image_1766113854_1_1.png',
        placeholder: '在 Google 上搜索，或者输入一个网址'
    },
    bing: {
        name: 'Bing',
        url: 'https://www.bing.com/search?q=',
        logo: 'https://zhiyan-ai-agent-with-1258344702.cos.ap-guangzhou.tencentcos.cn/with/bea8bede-ef52-49fb-9533-b055fbf67d16/image_1766115222_1_1.png',
        placeholder: '在 Bing 上搜索，或者输入一个网址'
    }
};

// Helper: Validate / normalize a color string from JSON
// Supports #RGB, #RGBA, #RRGGBB, #RRGGBBAA (with or without leading '#')
// and rgb()/rgba()/hsl()/hsla() functional notations.
function normalizeColor(raw) {
    if (typeof raw !== 'string') return null;
    let value = raw.trim();
    if (!value) return null;

    if (/^(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) {
        value = `#${value}`;
    }
    if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) {
        return value;
    }
    if (/^(?:rgb|rgba|hsl|hsla)\([\d\s.,%/-]+\)$/i.test(value)) {
        return value;
    }
    return null;
}

// Helper: Resolve the final cell color for a day record
function resolveCellColor(dayData) {
    if (!dayData) return COLORS.default;

    const type = dayData.type;
    const isCustomizable = CUSTOM_COLOR_TYPES.includes(type) || !COLORS[type];
    if (isCustomizable) {
        const custom = normalizeColor(dayData.color);
        if (custom) return custom;
    }

    return COLORS[type] || COLORS.default;
}

// Helper: Compare YYYY-MM-DD strings (lexicographic order works for this format)
function isPastDate(dateStr, todayStr) {
    return Boolean(dateStr) && dateStr <= todayStr;
}

// Helper: Paint a cell (color + past weakening)
function applyCellStyle(cell, dayData, isPast) {
    cell.style.setProperty('--cell-color', resolveCellColor(dayData));
    cell.dataset.past = isPast ? '1' : '0';
    if (isPast) cell.classList.add('is-past');
}

// Helper: Normalize holiday data and group every record by its year.
// Object form: { 'YYYY-MM-DD': { type, name, color } }
// Array form:  [{ date: 'YYYY-MM-DD', type, name, color }]
// Returns { dataByYear, years, defaultYear }; no year is discarded so the
// settings panel can offer a display year for each year in the JSON.
function prepareHolidayData(rawData) {
    const empty = () => {
        const currentYear = new Date().getFullYear();
        return { dataByYear: {}, years: [currentYear], defaultYear: currentYear };
    };

    if (!rawData || typeof rawData !== 'object') return empty();

    const records = [];
    if (Array.isArray(rawData)) {
        rawData.forEach(item => {
            if (!item || !item.date) return;
            records.push({ date: item.date, type: item.type, name: item.name, color: item.color });
        });
    } else {
        Object.keys(rawData).forEach(dateStr => {
            const value = rawData[dateStr];
            if (!value) return;
            records.push({ date: dateStr, type: value.type, name: value.name, color: value.color });
        });
    }

    const dataByYear = {};
    records.forEach(rec => {
        if (typeof rec.date !== 'string' || !/^\d{4}/.test(rec.date)) return;
        const year = rec.date.slice(0, 4);
        if (!dataByYear[year]) dataByYear[year] = {};
        // Later entries overwrite earlier ones for the same date
        dataByYear[year][rec.date] = { type: rec.type, name: rec.name, color: rec.color };
    });

    const years = Object.keys(dataByYear).sort((a, b) => Number(a) - Number(b)).map(Number);
    if (years.length === 0) return empty();

    // Prefer the current year so "today" can be highlighted. Otherwise pick the
    // year with most records, resolving ties to the most recent year.
    const currentYear = new Date().getFullYear();
    let defaultYear = currentYear;
    if (!dataByYear[String(currentYear)]) {
        defaultYear = years.reduce((best, y) => {
            const bestCount = Object.keys(dataByYear[String(best)]).length;
            const count = Object.keys(dataByYear[String(y)]).length;
            return (count > bestCount || (count === bestCount && y > best)) ? y : best;
        }, years[0]);
    }

    return { dataByYear, years, defaultYear };
}

// ===== Display year cache (localStorage, scoped by data source URL) =====
// Shape: { [url]: year }. Legacy entries written as { active, selected } by
// earlier versions are still readable.
function readYearCache() {
    try {
        const cache = JSON.parse(localStorage.getItem(YEAR_CACHE_KEY) || '{}');
        return (cache && typeof cache === 'object' && !Array.isArray(cache)) ? cache : {};
    } catch (e) {
        return {};
    }
}

function getCachedYear(url) {
    const entry = readYearCache()[url];
    const value = (entry && typeof entry === 'object') ? entry.active : entry;
    const year = Number(value);
    return Number.isInteger(year) && year > 0 ? year : null;
}

function setCachedYear(url, year) {
    try {
        const cache = readYearCache();
        cache[url] = year;
        localStorage.setItem(YEAR_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        // Storage may be unavailable (e.g. private mode); rendering still works.
    }
}

// The cached year wins as long as it still exists in the current JSON.
function resolveDisplayYear(years, defaultYear, cachedYear) {
    return (cachedYear !== null && years.includes(cachedYear)) ? cachedYear : defaultYear;
}

// Helper: Hide a tooltip left over from a previous rendering
function hideTooltip() {
    const tooltip = document.getElementById('tooltip');
    if (tooltip) tooltip.classList.add('hidden');
    if (window.tooltipTimeout) clearTimeout(window.tooltipTimeout);
}

// Helper: Format Date to YYYY-MM-DD
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Helper: Get Week Number
function getWeekNumber(d) {
    // Copy date so don't modify original
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    // Get first day of year
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    // Calculate full weeks to nearest Thursday
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    // Return array of year and week number
    return weekNo;
}

// Helper: Update Tooltip Position
function updateTooltipPosition(cell, tooltip) {
    // Ensure arrow exists
    let arrow = tooltip.querySelector('.tooltip-arrow');
    if (!arrow) {
        arrow = document.createElement('div');
        arrow.className = 'tooltip-arrow absolute w-2 h-2 bg-gray-900 transform rotate-45';
        tooltip.appendChild(arrow);
    }

    const tRect = tooltip.getBoundingClientRect();
    const cRect = cell.getBoundingClientRect();
    const padding = 10;
    const gap = 8; // Increased gap for arrow
    
    // Horizontal Center
    let left = cRect.left + cRect.width / 2 - tRect.width / 2;
    
    // Boundary Check X
    if (left < padding) left = padding;
    if (left + tRect.width > window.innerWidth - padding) {
        left = Math.max(padding, window.innerWidth - padding - tRect.width);
    }
    
    // Vertical Top (Default above)
    let top = cRect.top - tRect.height - gap;
    let isTop = true;
    
    // Boundary Check Y (if top is cut off, move to bottom)
    if (top < padding) {
        top = cRect.bottom + gap;
        isTop = false;
    }
    
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;

    // Arrow Positioning
    const cellCenter = cRect.left + cRect.width / 2;
    let arrowLeft = cellCenter - left - 4; // -4 is half of arrow width (8px/2)
    
    // Clamp arrow within tooltip (with padding for rounded corners)
    const arrowPadding = 6;
    if (arrowLeft < arrowPadding) arrowLeft = arrowPadding;
    if (arrowLeft > tRect.width - 8 - arrowPadding) arrowLeft = tRect.width - 8 - arrowPadding;
    
    arrow.style.left = `${arrowLeft}px`;
    
    // Arrow Y
    if (isTop) {
        arrow.style.bottom = '-4px';
        arrow.style.top = '';
    } else {
        arrow.style.top = '-4px';
        arrow.style.bottom = '';
    }
}

// Helper: Set Tooltip Content safely
function setTooltipContent(tooltip, text) {
    tooltip.innerHTML = `<span class="relative z-10">${text}</span>`;
}

function isMobile() {
    // Use User Agent detection instead of window width to enforce desktop/mobile mode
    const ua = navigator.userAgent;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

function applyResponsiveStyles() {
    if (isMobile()) {
        // Apply mobile styles
        for (const [id, classes] of Object.entries(MOBILE_STYLES)) {
            const el = document.getElementById(id);
            if (el) {
                el.className = classes;
            }
        }
    }
    // Desktop styles are default in HTML, so no else block needed
}

// Helper: Get URL Parameter
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Main Logic
function getDataSourceUrl() {
    // Priority: URL parameter > localStorage > default
    return getUrlParameter('holiday') || localStorage.getItem(STORAGE_KEY) || DEFAULT_HOLIDAYS_URL;
}

async function loadHolidayData(url) {
    let dataByYear = {};
    let defaultYear = new Date().getFullYear();
    let years = [defaultYear];

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const rawData = await response.json();
        ({ dataByYear, years, defaultYear } = prepareHolidayData(rawData));
    } catch (e) {
        console.error('Failed to load holiday data:', e);
        // Fallback with an empty grid for the current year if fetch fails
    }

    const displayYear = resolveDisplayYear(years, defaultYear, getCachedYear(url));
    // Store state globally for resize events and settings changes.
    // The main view renders straight from the cached year, with no year UI.
    window.holidayData = { sourceUrl: url, dataByYear, years, defaultYear, displayYear };
    renderHeatmap();
}

async function init() {
    applyResponsiveStyles();
    await loadHolidayData(getDataSourceUrl());

    // Add resize listener
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (window.holidayData) renderHeatmap();
        }, 200);
    });

    setupEngineSwitch(); // Initialize Engine Switch
    setupSearch();
    setupSettings();
}

function resetHeatmapScroll() {
    const scrollContainer = document.getElementById('heatmap-container');
    const scrollWrapper = document.getElementById('heatmap-scroll-wrapper');
    if (scrollContainer) scrollContainer.scrollTop = 0;
    if (scrollWrapper) scrollWrapper.scrollLeft = 0;
}

// Apply the single year chosen in the settings panel: cache it and re-render
// the grid from scratch (cell positions + that year's data).
function applyDisplayYear(year) {
    const state = window.holidayData;
    if (!state) return;
    const displayYear = state.years.includes(year) ? year : state.defaultYear;
    state.displayYear = displayYear;
    setCachedYear(state.sourceUrl, displayYear);
    hideTooltip();
    resetHeatmapScroll();
    renderHeatmap();
}

function renderHeatmap() {
    const state = window.holidayData;
    if (!state) return;
    // The JSON is filtered by the cached display year before any cell is drawn
    const data = state.dataByYear[String(state.displayYear)] || {};
    const year = state.displayYear;

    const wrapper = document.getElementById('heatmap-scroll-wrapper');
    const container = document.getElementById('heatmap');
    const containerParent = container.parentElement;

    if (isMobile()) {
        // Mobile Styles
        wrapper.classList.remove('overflow-x-auto', 'heatmap-scroll-container');
        wrapper.classList.add('w-full', 'flex', 'justify-center');
        
        // Ensure containerParent adapts to content and is centered
        containerParent.classList.remove('w-max');
        containerParent.classList.add('w-full', 'max-w-xl', 'px-4'); // Match search bar width and padding
        
        renderMobileHeatmap(data, year);
    } else {
        // Desktop Styles - Always enable horizontal scroll
        wrapper.classList.add('overflow-x-auto', 'heatmap-scroll-container');
        wrapper.classList.remove('w-full', 'flex', 'justify-center');
        
        containerParent.classList.remove('w-full', 'max-w-xl', 'px-4');
        if (!containerParent.classList.contains('w-max')) {
            containerParent.classList.add('w-max', 'mx-auto');
        }
        
        renderDesktopHeatmap(data, year);
    }
}

function renderMobileHeatmap(data, year) {
    const container = document.getElementById('heatmap');
    container.innerHTML = ''; 
    // Adjusted for mobile: Grid 3 columns x 4 rows
    // Use w-full to fill the container (which matches search bar)
    // Gap-x-[5px] for month separation (approx 1.5x of cell gap 3px)
    // Gap-y-[5px] to match horizontal gap
    container.className = 'grid grid-cols-3 gap-x-[5px] gap-y-[5px] w-full pb-2';

    const displayYear = year || new Date().getFullYear();
    const now = new Date();
    const todayStr = formatDate(now);
    // "Today" only exists in the real current year; other years are entirely
    // in the past or the future, so all their cells are veiled or bright.
    const isCurrentYear = displayYear === now.getFullYear();
    let todayElement = null;

    for (let month = 0; month < 12; month++) {
        // Month Container
        const monthWrapper = document.createElement('div');
        monthWrapper.className = 'flex flex-col items-center w-full';
        
        // Grid for the month
        const monthGrid = document.createElement('div');
        monthGrid.className = 'grid grid-cols-7 gap-[3px] w-full'; // Increased gap for better proportion
        
        const firstDayOfMonth = new Date(displayYear, month, 1);
        const daysInMonth = new Date(displayYear, month + 1, 0).getDate();
        
        // Calculate padding for first week (Mon=0 ... Sun=6)
        const startOffset = (firstDayOfMonth.getDay() + 6) % 7;

        // Empty cells for start
        for (let i = 0; i < startOffset; i++) {
            const empty = document.createElement('div');
            empty.className = 'w-full aspect-square'; // Responsive size
            monthGrid.appendChild(empty);
        }

        // Days
        for (let d = 1; d <= daysInMonth; d++) {
            const currentDate = new Date(displayYear, month, d);
            const dateStr = formatDate(currentDate);
            const dayData = data[dateStr];
            const isToday = isCurrentYear && dateStr === todayStr;
            const isPast = isPastDate(dateStr, todayStr);

            const label = dayData ? (dayData.name || '') : '';

            const cell = document.createElement('div');
            // Responsive size: w-full aspect-square
            cell.className = `w-full aspect-square rounded-[1px] heatmap-cell relative cursor-pointer transition-opacity hover:opacity-80 mobile-heatmap-cell`;
            applyCellStyle(cell, dayData, isPast);

            if (isToday) {
                cell.classList.add('ring-1', 'ring-blue-600', 'ring-offset-[0.5px]', 'z-10');
                todayElement = cell;
            }

            // Tooltip
            const currentLabel = label;
            const currentDateStr = dateStr;
            
            cell.addEventListener('click', (e) => {
                e.stopPropagation();
                const tooltip = document.getElementById('tooltip');
                const tooltipText = currentLabel ? `${currentDateStr} ${currentLabel}` : currentDateStr;
                setTooltipContent(tooltip, tooltipText);
                
                // Show first to calculate dimensions
                tooltip.classList.remove('hidden');
                updateTooltipPosition(cell, tooltip);
                
                updateMobileFocus(cell);
                
                if (window.tooltipTimeout) clearTimeout(window.tooltipTimeout);
                window.tooltipTimeout = setTimeout(() => tooltip.classList.add('hidden'), 2000);
            });

            monthGrid.appendChild(cell);
        }

        monthWrapper.appendChild(monthGrid);
        container.appendChild(monthWrapper);
    }

    // Scroll to today and set initial focus
    if (todayElement) {
        setTimeout(() => {
            todayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            updateMobileFocus(todayElement);
        }, 300);
    } else {
        // If today is not in the current year, focus on the first cell
        const firstCell = container.querySelector('.mobile-heatmap-cell');
        if (firstCell) {
            setTimeout(() => {
                updateMobileFocus(firstCell);
            }, 300);
        }
    }
}

function updateMobileFocus(targetCell) {
    const cells = document.querySelectorAll('.mobile-heatmap-cell');
    if (!cells.length) return;

    const targetRect = targetCell.getBoundingClientRect();
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;
    
    // Use the width of the target cell as the unit distance
    const unitSize = targetRect.width || 16; 

    // Read phase
    const cellPositions = Array.from(cells).map(cell => {
        const rect = cell.getBoundingClientRect();
        return {
            cell,
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    });

    // Write phase
    cellPositions.forEach(pos => {
        const dist = Math.sqrt(Math.pow(pos.x - targetX, 2) + Math.pow(pos.y - targetY, 2));
        const distUnits = dist / unitSize;
        
        // Same logic as desktop: 1 - (dist / 20) * 0.6
        let opacity = 1 - (distUnits / 20) * 0.6;
        if (opacity < 0.4) opacity = 0.4;
        
        // Past days are weakened further
        if (pos.cell.dataset.past === '1') opacity *= PAST_OPACITY_FACTOR;
        
        pos.cell.style.opacity = opacity;
    });
}

function renderDesktopHeatmap(data, year) {
    const container = document.getElementById('heatmap');
    container.innerHTML = ''; // Clear previous content
    container.className = 'flex gap-[3px]'; // Restore desktop class
    const tooltip = document.getElementById('tooltip');
    
    const displayYear = year || new Date().getFullYear();
    
    // Start from the first Sunday of the display year or slightly before to align grid
    const startDate = new Date(displayYear, 0, 1);
    const dayOfWeek = startDate.getDay(); // 0 (Sun) - 6 (Sat)
    
    // Adjust start date to previous Sunday
    startDate.setDate(startDate.getDate() - dayOfWeek);

    // We want to render 53 weeks to cover the full year
    const totalWeeks = 53;
    
    let currentDate = new Date(startDate);

    // Use the real today: a different year has no "today" cell at all, but
    // past/future comparison still uses the real date.
    const now = new Date();
    const todayStr = formatDate(now);
    const isCurrentYear = displayYear === now.getFullYear();

    let todayCoords = { w: 0, d: 0 }; // Default fallback

    for (let w = 0; w < totalWeeks; w++) {
        const weekCol = document.createElement('div');
        weekCol.className = 'flex flex-col gap-[3px]'; // Gap between days

        for (let d = 0; d < 7; d++) {
            const dateStr = formatDate(currentDate);
            const dayData = data[dateStr];
            const isToday = isCurrentYear && dateStr === todayStr;
            const isPast = isPastDate(dateStr, todayStr);

            const label = dayData ? (dayData.name || '') : '';

            // Create Cell
            const cell = document.createElement('div');
            // Size: w-3 h-3 (12px)
            cell.className = `w-3 h-3 rounded-sm heatmap-cell transition-all duration-300 cursor-pointer relative desktop-heatmap-cell`;

            if (isToday) {
                cell.className = `w-3 h-3 rounded-sm heatmap-cell transition-all duration-300 cursor-pointer relative desktop-heatmap-cell ${TODAY_BORDER} shadow-md`;
                todayCoords = { w, d };
            }

            applyCellStyle(cell, dayData, isPast);

            // Data attributes for tooltip and focus logic
            cell.dataset.date = dateStr;
            cell.dataset.info = label;
            cell.dataset.w = w;
            cell.dataset.d = d;

            // Tooltip Events
            cell.addEventListener('mouseenter', (e) => {
                const tooltipText = cell.dataset.info ? `${cell.dataset.date} (${cell.dataset.info})` : cell.dataset.date;
                setTooltipContent(tooltip, tooltipText);
                
                tooltip.classList.remove('hidden');
                updateTooltipPosition(cell, tooltip);
            });

            cell.addEventListener('mouseleave', () => {
                tooltip.classList.add('hidden');
            });

            // Click to focus
            cell.addEventListener('click', () => {
                updateFocus(w, d);
            });

            weekCol.appendChild(cell);
            
            // Next Day
            currentDate.setDate(currentDate.getDate() + 1);
        }
        container.appendChild(weekCol);
    }

    // Initial focus on today
    updateFocus(todayCoords.w, todayCoords.d);

    // Scroll to today
    setTimeout(() => scrollToToday(todayCoords.w), 100);
}

function scrollToToday(weekIndex) {
    const wrapper = document.getElementById('heatmap-scroll-wrapper');
    if (!wrapper) return;

    const heatmap = document.getElementById('heatmap');
    if (!heatmap || heatmap.children.length <= weekIndex) return;

    const targetCol = heatmap.children[weekIndex];
    
    // Use getBoundingClientRect to calculate precise scroll position
    const wrapperRect = wrapper.getBoundingClientRect();
    const colRect = targetCol.getBoundingClientRect();
    
    // Current scroll position
    const currentScroll = wrapper.scrollLeft;
    
    // Calculate how much we need to scroll to center the target column
    // relativeLeft is the current visual distance from wrapper's left edge
    const relativeLeft = colRect.left - wrapperRect.left;
    
    // We want the column to be centered: (wrapperWidth / 2) - (colWidth / 2)
    const targetRelativeLeft = (wrapperRect.width / 2) - (colRect.width / 2);
    
    const scrollAdjustment = relativeLeft - targetRelativeLeft;
    
    if (Math.abs(scrollAdjustment) > 1) {
        wrapper.scrollTo({
            left: currentScroll + scrollAdjustment,
            behavior: 'smooth'
        });
    }
}

function updateFocus(targetW, targetD) {
    const cells = document.querySelectorAll('#heatmap .w-3');
    cells.forEach(cell => {
        const w = parseInt(cell.dataset.w);
        const d = parseInt(cell.dataset.d);
        
        const dist = Math.sqrt(Math.pow(w - targetW, 2) + Math.pow(d - targetD, 2));
        
        // Opacity logic: 1 at center, fading out
        let opacity = 1 - (dist / 20) * 0.6;
        if (opacity < 0.4) opacity = 0.4; // Minimum opacity
        
        // Past days are weakened further
        if (cell.dataset.past === '1') opacity *= PAST_OPACITY_FACTOR;
        
        cell.style.opacity = opacity;
    });
}

function getCurrentEngine() {
    const saved = localStorage.getItem(ENGINE_KEY);
    return (saved && ENGINES[saved]) ? saved : 'bing';
}

function updateEngineUI(engineKey) {
    const config = ENGINES[engineKey];
    const logo = document.getElementById('search-logo');
    const input = document.getElementById('search-input');
    const label = document.getElementById('engine-label');
    const checkbox = document.getElementById('engine-switch');

    // Update Logo
    logo.src = config.logo;
    logo.alt = config.name;
    
    // Update Placeholder
    input.placeholder = config.placeholder;
    
    // Update Label
    label.textContent = config.name;
    
    // Update Checkbox State
    checkbox.checked = (engineKey === 'bing');
}

function setupEngineSwitch() {
    const checkbox = document.getElementById('engine-switch');
    const container = document.getElementById('engine-toggle-container');
    
    // Initial State
    const currentEngine = getCurrentEngine();
    updateEngineUI(currentEngine);

    // Toggle Handler
    const toggleEngine = () => {
        const newEngine = checkbox.checked ? 'bing' : 'google';
        localStorage.setItem(ENGINE_KEY, newEngine);
        updateEngineUI(newEngine);
    };

    checkbox.addEventListener('change', toggleEngine);
    
    // Allow clicking the container/label to toggle
    container.addEventListener('click', (e) => {
        if (e.target !== checkbox) {
            checkbox.checked = !checkbox.checked;
            toggleEngine();
        }
    });
}

function setupSearch() {
    const input = document.getElementById('search-input');
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = input.value.trim();
            if (query) {
                if (query.match(/^https?:\/\//) || query.match(/^www\./)) {
                    let url = query;
                    if (!url.startsWith('http')) url = 'https://' + url;
                    window.location.href = url;
                } else {
                    const engineKey = getCurrentEngine();
                    const searchUrl = ENGINES[engineKey].url;
                    window.location.href = `${searchUrl}${encodeURIComponent(query)}`;
                }
            }
        }
    });
}

function setupSettings() {
    const btn = document.getElementById('settings-btn');
    const modal = document.getElementById('settings-modal');
    const closeBtn = document.getElementById('close-modal-btn');
    const saveBtn = document.getElementById('save-settings-btn');
    const resetBtn = document.getElementById('reset-default-btn');
    const input = document.getElementById('holidays-url');
    const yearOptions = document.getElementById('year-options');

    // One display year picked from all years present in the current JSON
    const renderYearOptions = () => {
        const state = window.holidayData;
        yearOptions.innerHTML = '';
        if (!state || !state.years.length) {
            const hint = document.createElement('p');
            hint.className = 'year-hint';
            hint.textContent = '当前数据源暂无年份数据';
            yearOptions.appendChild(hint);
            return;
        }

        state.years.forEach(y => {
            const label = document.createElement('label');
            label.className = 'year-option';

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'display-year';
            radio.className = 'year-option-input';
            radio.value = String(y);
            radio.checked = (y === state.displayYear);

            const text = document.createElement('span');
            text.textContent = String(y);

            label.appendChild(radio);
            label.appendChild(text);
            yearOptions.appendChild(label);
        });
    };

    const getSelectedYear = () => {
        const checked = yearOptions.querySelector('.year-option-input:checked');
        return checked ? Number(checked.value) : null;
    };

    // Open Modal
    btn.addEventListener('click', () => {
        input.value = localStorage.getItem(STORAGE_KEY) || '';
        renderYearOptions();
        modal.classList.remove('hidden');
    });

    // Close Modal
    const closeModal = () => {
        modal.classList.add('hidden');
    };
    closeBtn.addEventListener('click', closeModal);

    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Save Settings
    saveBtn.addEventListener('click', () => {
        const url = input.value.trim();
        if (url) {
            localStorage.setItem(STORAGE_KEY, url);
        } else {
            // If empty, treat as reset
            localStorage.removeItem(STORAGE_KEY);
        }

        const effectiveUrl = getUrlParameter('holiday') || url || DEFAULT_HOLIDAYS_URL;
        const state = window.holidayData;

        if (!state || effectiveUrl !== state.sourceUrl) {
            // A different source needs a fresh fetch. Its years are unknown yet,
            // so the old choice is intentionally not carried over.
            location.reload();
            return;
        }

        const pickedYear = getSelectedYear();
        if (pickedYear !== null) applyDisplayYear(pickedYear);
        closeModal();
    });

    // Reset Default
    resetBtn.addEventListener('click', () => {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    });
}

// Run
init();