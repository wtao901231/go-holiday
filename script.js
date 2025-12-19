// Configuration
const COLORS = {
    holiday: 'bg-[#EA4335]',      // Google Red
    personal: 'bg-[#4285F4]',     // Google Blue
    workday: 'bg-[#9AA0A6]',      // Google Grey Dark
    trip_current: 'bg-[#34A853]', // Google Green
    trip_next: 'bg-[#FBBC05]',    // Google Yellow
    default: 'bg-[#F1F3F4]'       // Google Grey Light
};
const TODAY_BORDER = 'border-2 border-[#1a73e8]'; // Google Blue for focus
const DEFAULT_HOLIDAYS_URL = 'holidays.json';
const STORAGE_KEY = 'custom_holidays_url';

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

// Helper: Normalize holiday data and select display year
function prepareHolidayData(rawData) {
    if (!rawData || typeof rawData !== 'object') {
        return { dataByDate: {}, year: new Date().getFullYear() };
    }

    const records = [];

    if (Array.isArray(rawData)) {
        rawData.forEach((item, index) => {
            if (!item || !item.date) return;
            records.push({
                date: item.date,
                type: item.type,
                name: item.name,
                order: index
            });
        });
    } else {
        // Plain object with date keys
        Object.keys(rawData).forEach((dateStr, index) => {
            const value = rawData[dateStr];
            if (!value) return;
            records.push({
                date: dateStr,
                type: value.type,
                name: value.name,
                order: index
            });
        });
    }

    if (records.length === 0) {
        return { dataByDate: {}, year: new Date().getFullYear() };
    }

    // Aggregate by year
    const yearStats = {};
    records.forEach(rec => {
        const year = rec.date.slice(0, 4);
        if (!/^\d{4}$/.test(year)) return;
        if (!yearStats[year]) {
            yearStats[year] = { count: 0 };
        }
        yearStats[year].count += 1;
    });

    const years = Object.keys(yearStats);
    if (years.length === 0) {
        return { dataByDate: {}, year: new Date().getFullYear() };
    }

    // Choose year with most records; if tie, choose the most recent year
    years.sort((a, b) => {
        const countDiff = yearStats[b].count - yearStats[a].count;
        if (countDiff !== 0) return countDiff;
        return parseInt(b, 10) - parseInt(a, 10);
    });
    const displayYear = parseInt(years[0], 10);

    // Build map for the chosen year; later entries overwrite earlier ones
    const dataByDate = {};
    records.forEach(rec => {
        const year = parseInt(rec.date.slice(0, 4), 10);
        if (year === displayYear && rec.date) {
            dataByDate[rec.date] = { type: rec.type, name: rec.name };
        }
    });

    return { dataByDate, year: displayYear };
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
async function init() {
    applyResponsiveStyles();

    // Priority: URL parameter > localStorage > default
    const urlHoliday = getUrlParameter('holiday');
    const customUrl = localStorage.getItem(STORAGE_KEY);
    const url = urlHoliday || customUrl || DEFAULT_HOLIDAYS_URL;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const rawData = await response.json();
        const { dataByDate, year } = prepareHolidayData(rawData);
        
        // Store data globally for resize events
        window.holidayData = { dataByDate, year };
        renderHeatmap(dataByDate, year);
    } catch (e) {
        console.error('Failed to load holiday data:', e);
        // Fallback with empty data and current year if fetch fails
        const currentYear = new Date().getFullYear();
        window.holidayData = { dataByDate: {}, year: currentYear };
        renderHeatmap({}, currentYear);
    }
    
    // Add resize listener
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (window.holidayData) {
                renderHeatmap(window.holidayData.dataByDate, window.holidayData.year);
            }
        }, 200);
    });

    setupEngineSwitch(); // Initialize Engine Switch
    setupSearch();
    setupSettings();
}

function renderHeatmap(data, year) {
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
            const isToday = dateStr === todayStr;

            let colorClass = COLORS.default;
            let label = '';
            
            if (dayData) {
                if (COLORS[dayData.type]) {
                    colorClass = COLORS[dayData.type];
                }
                label = dayData.name;
            }

            const cell = document.createElement('div');
            // Responsive size: w-full aspect-square
            cell.className = `w-full aspect-square rounded-[1px] ${colorClass} relative cursor-pointer transition-opacity hover:opacity-80 mobile-heatmap-cell`;

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

    // Scroll to today
    if (todayElement) {
        setTimeout(() => {
            todayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            updateMobileFocus(todayElement);
        }, 300);
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

    // Compute a "today" within the display year for initial focus
    const now = new Date();
    let today = new Date(displayYear, now.getMonth(), now.getDate());
    const todayStr = formatDate(today);

    let todayCoords = { w: 0, d: 0 }; // Default fallback

    for (let w = 0; w < totalWeeks; w++) {
        const weekCol = document.createElement('div');
        weekCol.className = 'flex flex-col gap-[3px]'; // Gap between days

        for (let d = 0; d < 7; d++) {
            const dateStr = formatDate(currentDate);
            const dayData = data[dateStr];
            const isToday = dateStr === todayStr;
            
            // Determine Color
            let colorClass = COLORS.default;
            let label = '';
            
            if (dayData) {
                if (COLORS[dayData.type]) {
                    colorClass = COLORS[dayData.type];
                }
                label = dayData.name;
            }

            // Create Cell
            const cell = document.createElement('div');
            // Size: w-3 h-3 (12px)
            cell.className = `w-3 h-3 rounded-sm ${colorClass} transition-all duration-300 cursor-pointer relative desktop-heatmap-cell`;
            
            if (isToday) {
                cell.className = `w-3 h-3 rounded-sm ${colorClass} transition-all duration-300 cursor-pointer relative desktop-heatmap-cell ${TODAY_BORDER} shadow-md`;
                todayCoords = { w, d };
            }

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

    // Open Modal
    btn.addEventListener('click', () => {
        const currentUrl = localStorage.getItem(STORAGE_KEY) || '';
        input.value = currentUrl;
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
            location.reload(); // Reload to apply changes
        } else {
            // If empty, treat as reset
            localStorage.removeItem(STORAGE_KEY);
            location.reload();
        }
    });

    // Reset Default
    resetBtn.addEventListener('click', () => {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    });
}

// Run
init();