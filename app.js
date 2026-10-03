/*
 * Periodic Table of Elements — Interactive Application
 * Implements interactive grid, glassmorphism UI, search, category filters,
 * temperature state simulator, property heatmaps, Bohr atom canvas visualizer,
 * and element detail inspector.
 */

(function () {
  'use strict';

  // State Management
  const state = {
    elements: [],
    selectedElement: null,
    currentTempK: 298, // Room temp (25 °C)
    activeCategory: 'all',
    activeBlock: 'all',
    searchQuery: '',
    colorMode: 'category',
    soundEnabled: true,
    bohrAnimId: null,
    bohrAngleOffset: 0
  };

  // Sound Synthesizer via Web Audio API (Zero external assets needed)
  let audioCtx = null;
  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.04) {
    if (!state.soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  function playHoverSound() {
    playTone(520, 'sine', 0.04, 0.015);
  }

  function playClickSound() {
    playTone(660, 'triangle', 0.12, 0.06);
    setTimeout(() => playTone(880, 'sine', 0.14, 0.04), 40);
  }

  // DOM Elements
  const periodicTable = document.getElementById('periodicTable');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const randomElementBtn = document.getElementById('randomElementBtn');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundIcon = document.getElementById('soundIcon');
  const categoryPills = document.getElementById('categoryPills');
  const blockControl = document.getElementById('blockControl');
  const colorModeSelect = document.getElementById('colorModeSelect');
  const tempSlider = document.getElementById('tempSlider');
  const tempValueDisplay = document.getElementById('tempValueDisplay');
  const tempPresets = document.querySelectorAll('.temp-preset-btn');
  const heatmapLegendBar = document.getElementById('heatmapLegendBar');
  const heatmapLowLabel = document.getElementById('heatmapLowLabel');
  const heatmapHighLabel = document.getElementById('heatmapHighLabel');

  // Counts
  const countSolid = document.getElementById('countSolid');
  const countLiquid = document.getElementById('countLiquid');
  const countGas = document.getElementById('countGas');
  const countUnknown = document.getElementById('countUnknown');

  // Modal Elements
  const elementModal = document.getElementById('elementModal');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const prevElementBtn = document.getElementById('prevElementBtn');
  const nextElementBtn = document.getElementById('nextElementBtn');
  const prevElementLabel = document.getElementById('prevElementLabel');
  const nextElementLabel = document.getElementById('nextElementLabel');

  // Info Modal Elements
  const infoModal = document.getElementById('infoModal');
  const infoModalBtn = document.getElementById('infoModalBtn');
  const closeInfoModalBtn = document.getElementById('closeInfoModalBtn');
  const infoModalBackdrop = document.getElementById('infoModalBackdrop');

  // Bohr Canvas
  const bohrCanvas = document.getElementById('bohrCanvas');
  const bohrCtx = bohrCanvas ? bohrCanvas.getContext('2d') : null;

  // Initialize Application
  function init() {
    if (typeof PERIODIC_TABLE_DATA !== 'undefined' && Array.isArray(PERIODIC_TABLE_DATA)) {
      state.elements = PERIODIC_TABLE_DATA;
    } else {
      console.error('PERIODIC_TABLE_DATA not found. Please verify elements-data.js is loaded.');
      return;
    }

    renderTable();
    updateStateCounts();
    setupEventListeners();
  }

  // Calculate Element Phase at Given Temperature (Kelvin)
  function getElementPhase(el, tempK) {
    if (el.melt === null && el.boil === null) {
      return el.phase || 'Unknown';
    }
    if (el.melt !== null && tempK < el.melt) {
      return 'Solid';
    }
    if (el.boil !== null && tempK >= el.boil) {
      return 'Gas';
    }
    if (el.melt !== null && tempK >= el.melt) {
      if (el.boil === null || tempK < el.boil) {
        return 'Liquid';
      }
    }
    return el.phase || 'Solid';
  }

  // Phase Icon
  function getPhaseIcon(phase) {
    switch (phase) {
      case 'Solid': return '&#9632;'; // Square
      case 'Liquid': return '&#128167;'; // Water droplet
      case 'Gas': return '&#9729;'; // Cloud
      default: return '&#63;';
    }
  }

  // Render Grid
  function renderTable() {
    periodicTable.innerHTML = '';

    // Place Main Table Elements (1 to 56, 72 to 88, 104 to 118)
    state.elements.forEach(el => {
      const tile = createElementTile(el);
      
      // Standard grid position
      if (el.period <= 7 && el.category !== 'lanthanide' && el.category !== 'actinide') {
        tile.style.gridColumn = el.group;
        tile.style.gridRow = el.period;
      } else if (el.category === 'lanthanide') {
        // Lanthanide Series: Row 9, Col 4 to 18
        const col = (el.number - 57) + 4;
        tile.style.gridRow = 9;
        tile.style.gridColumn = col;
      } else if (el.category === 'actinide') {
        // Actinide Series: Row 10, Col 4 to 18
        const col = (el.number - 89) + 4;
        tile.style.gridRow = 10;
        tile.style.gridColumn = col;
      }

      periodicTable.appendChild(tile);
    });

    // Insert Placeholder for Lanthanides in Period 6, Group 3
    const lanthPlaceholder = document.createElement('div');
    lanthPlaceholder.className = 'series-placeholder-tile placeholder-lanthanide';
    lanthPlaceholder.style.gridRow = 6;
    lanthPlaceholder.style.gridColumn = 3;
    lanthPlaceholder.innerHTML = `
      <span class="series-range">57–71</span>
      <span class="series-label">La–Lu</span>
    `;
    lanthPlaceholder.title = 'Lanthanide Series (click to filter)';
    lanthPlaceholder.addEventListener('click', () => {
      setCategoryFilter('lanthanide');
      playClickSound();
    });
    periodicTable.appendChild(lanthPlaceholder);

    // Insert Placeholder for Actinides in Period 7, Group 3
    const actPlaceholder = document.createElement('div');
    actPlaceholder.className = 'series-placeholder-tile placeholder-actinide';
    actPlaceholder.style.gridRow = 7;
    actPlaceholder.style.gridColumn = 3;
    actPlaceholder.innerHTML = `
      <span class="series-range">89–103</span>
      <span class="series-label">Ac–Lr</span>
    `;
    actPlaceholder.title = 'Actinide Series (click to filter)';
    actPlaceholder.addEventListener('click', () => {
      setCategoryFilter('actinide');
      playClickSound();
    });
    periodicTable.appendChild(actPlaceholder);

    // Label for Lanthanides Row (Row 9, Col 2-3)
    const lanthRowLabel = document.createElement('div');
    lanthRowLabel.className = 'series-placeholder-tile placeholder-lanthanide';
    lanthRowLabel.style.gridRow = 9;
    lanthRowLabel.style.gridColumn = '2 / 4';
    lanthRowLabel.innerHTML = `
      <span class="series-range">57–71</span>
      <span class="series-label">Lanthanides</span>
    `;
    lanthRowLabel.addEventListener('click', () => setCategoryFilter('lanthanide'));
    periodicTable.appendChild(lanthRowLabel);

    // Label for Actinides Row (Row 10, Col 2-3)
    const actRowLabel = document.createElement('div');
    actRowLabel.className = 'series-placeholder-tile placeholder-actinide';
    actRowLabel.style.gridRow = 10;
    actRowLabel.style.gridColumn = '2 / 4';
    actRowLabel.innerHTML = `
      <span class="series-range">89–103</span>
      <span class="series-label">Actinides</span>
    `;
    actRowLabel.addEventListener('click', () => setCategoryFilter('actinide'));
    periodicTable.appendChild(actRowLabel);

    // Row 8 Spacer
    const spacer = document.createElement('div');
    spacer.className = 'series-divider-row';
    spacer.style.gridRow = 8;
    periodicTable.appendChild(spacer);
  }

  // Create Individual Element Tile
  function createElementTile(el) {
    const tile = document.createElement('div');
    tile.className = `element-tile cat-${el.category}`;
    tile.dataset.number = el.number;
    tile.dataset.category = el.category;
    tile.dataset.block = el.block;
    tile.tabIndex = 0;
    tile.setAttribute('role', 'button');
    tile.setAttribute('aria-label', `${el.name}, Atomic number ${el.number}, Symbol ${el.symbol}`);

    const currentPhase = getElementPhase(el, state.currentTempK);
    const phaseIcon = getPhaseIcon(currentPhase);

    tile.innerHTML = `
      <div class="tile-top">
        <span class="tile-number">${el.number}</span>
        <span class="tile-state-icon" title="State: ${currentPhase}">${phaseIcon}</span>
      </div>
      <div class="tile-symbol">${el.symbol}</div>
      <div class="tile-bottom">
        <div class="tile-name">${el.name}</div>
        <div class="tile-mass">${typeof el.atomic_mass === 'number' ? el.atomic_mass.toFixed(el.atomic_mass < 10 ? 3 : 2) : el.atomic_mass}</div>
      </div>
    `;

    // Click handler
    tile.addEventListener('click', () => {
      playClickSound();
      openElementModal(el);
    });

    // Hover sound
    tile.addEventListener('mouseenter', () => {
      playHoverSound();
    });

    // Keyboard trigger
    tile.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        playClickSound();
        openElementModal(el);
      }
    });

    return tile;
  }

  // Update State Counts (Solid, Liquid, Gas, Unknown)
  function updateStateCounts() {
    let solids = 0, liquids = 0, gases = 0, unknowns = 0;
    state.elements.forEach(el => {
      const phase = getElementPhase(el, state.currentTempK);
      if (phase === 'Solid') solids++;
      else if (phase === 'Liquid') liquids++;
      else if (phase === 'Gas') gases++;
      else unknowns++;
    });

    countSolid.textContent = solids;
    countLiquid.textContent = liquids;
    countGas.textContent = gases;
    countUnknown.textContent = unknowns;

    // Update tile phase icons & styling if colorMode is phase
    const tiles = document.querySelectorAll('.element-tile');
    tiles.forEach(tile => {
      const num = parseInt(tile.dataset.number, 10);
      const el = state.elements[num - 1];
      if (!el) return;
      const currentPhase = getElementPhase(el, state.currentTempK);
      const stateIconEl = tile.querySelector('.tile-state-icon');
      if (stateIconEl) {
        stateIconEl.innerHTML = getPhaseIcon(currentPhase);
        stateIconEl.title = `State at ${state.currentTempK} K: ${currentPhase}`;
      }

      if (state.colorMode === 'phase') {
        applyPhaseColorToTile(tile, currentPhase);
      }
    });
  }

  // Apply Phase Colors
  function applyPhaseColorToTile(tile, phase) {
    tile.style.background = '';
    tile.style.borderColor = '';
    tile.style.color = '';
    if (phase === 'Solid') {
      tile.style.color = '#7c6f64';
      tile.style.background = 'rgba(124, 111, 100, 0.12)';
      tile.style.borderColor = 'rgba(124, 111, 100, 0.30)';
    } else if (phase === 'Liquid') {
      tile.style.color = '#0f9f76';
      tile.style.background = 'rgba(16, 185, 129, 0.18)';
      tile.style.borderColor = 'rgba(16, 185, 129, 0.48)';
      tile.style.boxShadow = '0 0 18px rgba(16, 185, 129, 0.24)';
    } else if (phase === 'Gas') {
      tile.style.color = '#e05263';
      tile.style.background = 'rgba(224, 82, 99, 0.18)';
      tile.style.borderColor = 'rgba(224, 82, 99, 0.48)';
      tile.style.boxShadow = '0 0 18px rgba(224, 82, 99, 0.24)';
    } else {
      tile.style.color = '#806f67';
      tile.style.background = 'rgba(128, 111, 103, 0.09)';
      tile.style.borderColor = 'rgba(128, 111, 103, 0.22)';
    }
  }

  // Apply Heatmap / Color Mode
  function applyColorMode(mode) {
    state.colorMode = mode;
    const tiles = document.querySelectorAll('.element-tile');

    if (mode === 'category') {
      heatmapLegendBar.style.display = 'none';
      tiles.forEach(tile => {
        tile.style.background = '';
        tile.style.borderColor = '';
        tile.style.color = '';
        tile.style.boxShadow = '';
      });
      return;
    }

    if (mode === 'phase') {
      heatmapLegendBar.style.display = 'none';
      updateStateCounts();
      return;
    }

    // Property Heatmap Modes
    heatmapLegendBar.style.display = 'flex';
    let values = [];
    let label = '';
    let unit = '';

    state.elements.forEach(el => {
      let val = el[mode];
      if (val !== null && val !== undefined && !isNaN(val)) {
        values.push(val);
      }
    });

    const min = Math.min(...values);
    const max = Math.max(...values);

    if (mode === 'electronegativity') {
      label = 'Electronegativity (Pauling)';
      heatmapLowLabel.textContent = `Min: ${min.toFixed(2)}`;
      heatmapHighLabel.textContent = `Max: ${max.toFixed(2)}`;
    } else if (mode === 'density') {
      label = 'Density';
      unit = 'g/cm³';
      heatmapLowLabel.textContent = `Min: ${min.toFixed(4)} ${unit}`;
      heatmapHighLabel.textContent = `Max: ${max.toFixed(1)} ${unit}`;
    } else if (mode === 'melt') {
      label = 'Melting Point';
      unit = 'K';
      heatmapLowLabel.textContent = `Min: ${min} K`;
      heatmapHighLabel.textContent = `Max: ${max} K`;
    } else if (mode === 'boil') {
      label = 'Boiling Point';
      unit = 'K';
      heatmapLowLabel.textContent = `Min: ${min} K`;
      heatmapHighLabel.textContent = `Max: ${max} K`;
    } else if (mode === 'atomic_mass') {
      label = 'Atomic Mass';
      unit = 'u';
      heatmapLowLabel.textContent = `Min: ${min.toFixed(1)} u`;
      heatmapHighLabel.textContent = `Max: ${max.toFixed(1)} u`;
    }

    tiles.forEach(tile => {
      const num = parseInt(tile.dataset.number, 10);
      const el = state.elements[num - 1];
      const val = el ? el[mode] : null;

      if (val === null || val === undefined || isNaN(val)) {
        tile.style.background = 'rgba(108, 83, 72, 0.10)';
        tile.style.borderColor = 'rgba(108, 83, 72, 0.18)';
        tile.style.color = '#806f67';
      } else {
        const ratio = Math.max(0, Math.min(1, (val - min) / (max - min || 1)));
        const color = getHeatmapColor(ratio);
        tile.style.background = `rgba(${color.r}, ${color.g}, ${color.b}, 0.28)`;
        tile.style.borderColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.65)`;
        tile.style.color = `rgb(${color.r}, ${color.g}, ${color.b})`;
        tile.style.boxShadow = `0 0 10px rgba(${color.r}, ${color.g}, ${color.b}, 0.25)`;
      }
    });
  }

  // Calculate RGB along heatmap gradient
  function getHeatmapColor(ratio) {
    const stops = [
      { r: 229, g: 90, b: 100 },   // coral
      { r: 245, g: 158, b: 11 },   // amber
      { r: 16, g: 185, b: 129 },   // emerald
      { r: 139, g: 92, b: 246 },   // violet
      { r: 190, g: 55, b: 130 }    // plum
    ];
    const p = ratio * (stops.length - 1);
    const i = Math.floor(p);
    const f = p - i;
    if (i >= stops.length - 1) return stops[stops.length - 1];
    return {
      r: Math.round(stops[i].r + f * (stops[i + 1].r - stops[i].r)),
      g: Math.round(stops[i].g + f * (stops[i + 1].g - stops[i].g)),
      b: Math.round(stops[i].b + f * (stops[i + 1].b - stops[i].b))
    };
  }

  // Filtering: Category, Block, and Search
  function applyFilters() {
    const tiles = document.querySelectorAll('.element-tile');
    const query = state.searchQuery.toLowerCase().trim();

    tiles.forEach(tile => {
      const num = parseInt(tile.dataset.number, 10);
      const el = state.elements[num - 1];
      if (!el) return;

      let matchCategory = (state.activeCategory === 'all' || el.category === state.activeCategory);
      let matchBlock = (state.activeBlock === 'all' || el.block === state.activeBlock);
      let matchSearch = true;

      if (query) {
        matchSearch = (
          el.name.toLowerCase().includes(query) ||
          el.symbol.toLowerCase() === query ||
          el.symbol.toLowerCase().startsWith(query) ||
          el.number.toString() === query ||
          String(el.category ?? '').toLowerCase().includes(query) ||
          String(el.discovered_by ?? '').toLowerCase().includes(query)
        );
      }

      const isVisible = matchCategory && matchBlock && matchSearch;

      // Filtering must actually remove non-matching tiles from the visual grid.
      // Previously these tiles were only dimmed, which made the filters appear broken.
      tile.hidden = !isVisible;
      tile.classList.toggle('dimmed', !isVisible);
      tile.classList.toggle('highlighted', Boolean(query && isVisible));

      // Keep accessibility state in sync with the visual filter.
      tile.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
    });
  }

  // Set Category Filter
  function setCategoryFilter(cat) {
    state.activeCategory = cat;
    document.querySelectorAll('.cat-pill').forEach(btn => {
      if (btn.dataset.category === cat) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    applyFilters();
    updateSeriesPlaceholders();
  }

  // Open Modal with Element Details
  function openElementModal(el) {
    if (!el) return;
    state.selectedElement = el;

    // Update Topbar
    const catBadge = document.getElementById('modalCategoryBadge');
    catBadge.textContent = formatCategoryName(el.category);
    catBadge.className = `modal-pill-info cat-${el.category}`;

    // Update Nav Buttons
    const prevNum = el.number > 1 ? el.number - 1 : 118;
    const nextNum = el.number < 118 ? el.number + 1 : 1;
    const prevEl = state.elements[prevNum - 1];
    const nextEl = state.elements[nextNum - 1];

    prevElementLabel.textContent = `${prevEl.symbol} (${prevEl.number})`;
    nextElementLabel.textContent = `${nextEl.symbol} (${nextEl.number})`;

    // Hero Badge
    const heroBadge = document.getElementById('modalHeroBadge');
    heroBadge.className = `element-hero-badge cat-${el.category}`;
    document.getElementById('modalHeroNumber').textContent = el.number;
    document.getElementById('modalHeroSymbol').textContent = el.symbol;
    document.getElementById('modalHeroName').textContent = el.name;
    document.getElementById('modalHeroMass').textContent = `${el.atomic_mass} u`;
    document.getElementById('modalHeroConfig').textContent = el.electron_configuration;

    // Summary & Appearance
    document.getElementById('modalSummaryText').textContent = el.summary;
    document.getElementById('modalAppearanceText').textContent = el.appearance;

    // Bohr Shells Info
    document.getElementById('bohrShellsLabel').textContent = `Shells: ${el.shells.join(' · ')}`;
    startBohrAnimation(el);

    // Specimen Photo
    const photoImg = document.getElementById('modalElementPhoto');
    const photoSpinner = document.getElementById('photoSpinner');
    const photoFallback = document.getElementById('photoFallback');
    const photoLink = document.getElementById('photoExternalLink');
    const photoCaption = document.getElementById('modalPhotoCaption');

    photoCaption.textContent = el.image_caption || `Authentic specimen of ${el.name}.`;
    photoLink.href = el.image || `https://en.wikipedia.org/wiki/${encodeURIComponent(el.name)}`;

    photoSpinner.style.display = 'block';
    photoFallback.style.display = 'none';
    photoImg.style.display = 'none';

    // Image loading with fallback
    photoImg.onload = function () {
      photoSpinner.style.display = 'none';
      photoImg.style.display = 'block';
    };
    photoImg.onerror = function () {
      photoSpinner.style.display = 'none';
      photoImg.style.display = 'none';
      photoFallback.style.display = 'flex';
      document.getElementById('fallbackSymbol').textContent = el.symbol;
    };
    photoImg.src = el.image;

    // Overview Tab
    document.getElementById('modalUsesText').textContent = el.uses;
    document.getElementById('modalGroup').textContent = el.group ? `Group ${el.group}` : 'Group –';
    document.getElementById('modalPeriod').textContent = `Period ${el.period}`;
    document.getElementById('modalBlock').textContent = `${el.block}-block`;
    document.getElementById('modalCategory').textContent = formatCategoryName(el.category);

    const currentPhase = getElementPhase(el, state.currentTempK);
    document.getElementById('modalPhase').textContent = currentPhase;
    document.getElementById('modalDensity').textContent = el.density !== null ? `${el.density} g/cm³` : 'Unknown';
    document.getElementById('modalMeltBrief').textContent = el.melt !== null ? `${el.melt} K (${(el.melt - 273.15).toFixed(1)} °C)` : 'Unknown';
    document.getElementById('modalBoilBrief').textContent = el.boil !== null ? `${el.boil} K (${(el.boil - 273.15).toFixed(1)} °C)` : 'Unknown';

    // Atomic Tab
    document.getElementById('modalConfigFull').textContent = el.electron_configuration;
    document.getElementById('modalShellsList').textContent = el.shells.join(', ');
    document.getElementById('modalValence').textContent = el.shells[el.shells.length - 1];
    document.getElementById('modalElectronegativity').textContent = el.electronegativity !== null ? el.electronegativity : 'None';
    document.getElementById('modalAtomicWeight').textContent = `${el.atomic_mass} u`;
    document.getElementById('modalAtomicNumFull').textContent = el.number;
    const estMass = typeof el.atomic_mass === 'number' ? Math.round(el.atomic_mass) : el.number * 2;
    document.getElementById('modalNeutrons').textContent = estMass - el.number;

    // Thermal Tab
    document.getElementById('modalMeltK').textContent = el.melt !== null ? `${el.melt} K` : 'Unknown';
    document.getElementById('modalMeltC').textContent = el.melt !== null ? `${(el.melt - 273.15).toFixed(2)} °C` : 'Unknown';
    document.getElementById('modalMeltF').textContent = el.melt !== null ? `${((el.melt - 273.15) * 9 / 5 + 32).toFixed(2)} °F` : 'Unknown';

    document.getElementById('modalBoilK').textContent = el.boil !== null ? `${el.boil} K` : 'Unknown';
    document.getElementById('modalBoilC').textContent = el.boil !== null ? `${(el.boil - 273.15).toFixed(2)} °C` : 'Unknown';

    document.getElementById('modalDensityFull').textContent = el.density !== null ? `${el.density} g/cm³` : 'Unknown';
    document.getElementById('modalCurrentState').textContent = currentPhase;
    document.getElementById('modalBlockFull').textContent = `${el.block.toUpperCase()} (${formatCategoryName(el.category)})`;

    // History Tab
    document.getElementById('modalDiscoverer').textContent = el.discovered_by;
    document.getElementById('modalYear').textContent = el.year;
    document.getElementById('modalWikipediaLink').href = `https://en.wikipedia.org/wiki/${encodeURIComponent(el.name)}`;

    // Reset Tabs to First
    document.querySelectorAll('.modal-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    document.querySelector('.modal-tab-btn[data-tab="tab-overview"]').classList.add('active');
    document.getElementById('tab-overview').classList.add('active');

    // Publish selection for optional extension modules such as the Cosmic Chemistry Lab.
    window.dispatchEvent(new CustomEvent('periodic-element-selected', { detail: el }));

    // Show Modal
    elementModal.classList.add('open');
    elementModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  // Close Modal
  function closeElementModal() {
    elementModal.classList.remove('open');
    elementModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    stopBohrAnimation();
  }

  // Format Category Strings to Title
  function formatCategoryName(cat) {
    if (!cat) return '';
    return cat.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  // ==========================================================================
  // Interactive Bohr Atom Model Simulator
  // ==========================================================================
  function startBohrAnimation(el) {
    stopBohrAnimation();
    if (!bohrCtx) return;

    const width = bohrCanvas.width;
    const height = bohrCanvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const shells = el.shells || [1];
    const numShells = shells.length;

    const maxRadius = width / 2 - 25;
    const minRadius = 38;
    const radiusStep = (maxRadius - minRadius) / Math.max(1, numShells - 1);

    function animate() {
      bohrCtx.clearRect(0, 0, width, height);

      // Draw Center Nucleus Glow
      const nucleusGradient = bohrCtx.createRadialGradient(centerX, centerY, 4, centerX, centerY, 24);
      nucleusGradient.addColorStop(0, '#ffffff');
      nucleusGradient.addColorStop(0.3, '#38bdf8');
      nucleusGradient.addColorStop(1, 'rgba(56, 189, 248, 0)');

      bohrCtx.beginPath();
      bohrCtx.arc(centerX, centerY, 24, 0, Math.PI * 2);
      bohrCtx.fillStyle = nucleusGradient;
      bohrCtx.fill();

      // Nucleus Solid Core
      bohrCtx.beginPath();
      bohrCtx.arc(centerX, centerY, 13, 0, Math.PI * 2);
      bohrCtx.fillStyle = '#d97706';
      bohrCtx.fill();
      bohrCtx.lineWidth = 1.5;
      bohrCtx.strokeStyle = '#fff7ed';
      bohrCtx.stroke();

      // Nucleus Label (Z = protons)
      bohrCtx.fillStyle = '#ffffff';
      bohrCtx.font = 'bold 10px JetBrains Mono';
      bohrCtx.textAlign = 'center';
      bohrCtx.textBaseline = 'middle';
      bohrCtx.fillText(`${el.number}+`, centerX, centerY);

      // Draw Each Orbit Shell and Orbiting Electrons
      shells.forEach((count, sIdx) => {
        const r = minRadius + sIdx * radiusStep;

        // Orbital Ring
        bohrCtx.beginPath();
        bohrCtx.arc(centerX, centerY, r, 0, Math.PI * 2);
        bohrCtx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
        bohrCtx.lineWidth = 1.2;
        bohrCtx.setLineDash([4, 4]);
        bohrCtx.stroke();
        bohrCtx.setLineDash([]); // Reset line dash

        // Orbit speed decreases with distance (Kepler-like)
        const speed = (0.018 / (sIdx + 1)) * (sIdx % 2 === 0 ? 1 : -1);
        const baseAngle = state.bohrAngleOffset * speed;

        // Draw Electrons on this Shell
        for (let e = 0; e < count; e++) {
          const angle = baseAngle + (e * (Math.PI * 2 / count));
          const ex = centerX + r * Math.cos(angle);
          const ey = centerY + r * Math.sin(angle);

          // Electron Particle Glow
          const eGlow = bohrCtx.createRadialGradient(ex, ey, 1, ex, ey, 6);
          eGlow.addColorStop(0, '#d9468f');
          eGlow.addColorStop(1, 'rgba(217, 70, 143, 0)');
          bohrCtx.beginPath();
          bohrCtx.arc(ex, ey, 6, 0, Math.PI * 2);
          bohrCtx.fillStyle = eGlow;
          bohrCtx.fill();

          // Electron Particle Center
          bohrCtx.beginPath();
          bohrCtx.arc(ex, ey, 3.2, 0, Math.PI * 2);
          bohrCtx.fillStyle = '#ffffff';
          bohrCtx.fill();
        }
      });

      state.bohrAngleOffset += 1;
      state.bohrAnimId = requestAnimationFrame(animate);
    }

    animate();
  }

  function stopBohrAnimation() {
    if (state.bohrAnimId) {
      cancelAnimationFrame(state.bohrAnimId);
      state.bohrAnimId = null;
    }
  }

  // ==========================================================================
  // Event Listeners
  // ==========================================================================
  function setupEventListeners() {
    // Search Input
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
      applyFilters();
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      state.searchQuery = '';
      clearSearchBtn.style.display = 'none';
      applyFilters();
      searchInput.focus();
    });

    // Random Element Discovery
    randomElementBtn.addEventListener('click', () => {
      playClickSound();
      const randomIndex = Math.floor(Math.random() * state.elements.length);
      openElementModal(state.elements[randomIndex]);
    });

    // Sound Toggle
    soundToggleBtn.addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      soundIcon.innerHTML = state.soundEnabled ? '&#128266;' : '&#128263;';
      soundToggleBtn.title = state.soundEnabled ? 'Mute sound effects' : 'Unmute sound effects';
      if (state.soundEnabled) playClickSound();
    });

    // Info Modal
    infoModalBtn.addEventListener('click', () => {
      playClickSound();
      infoModal.classList.add('open');
      infoModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    });

    closeInfoModalBtn.addEventListener('click', () => {
      infoModal.classList.remove('open');
      infoModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    });

    infoModalBackdrop.addEventListener('click', () => {
      infoModal.classList.remove('open');
      infoModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    });

    // Category Filter Pills
    categoryPills.addEventListener('click', (e) => {
      const pill = e.target.closest('.cat-pill');
      if (!pill) return;
      playClickSound();
      const category = pill.dataset.category;
      setCategoryFilter(category);
    });

    // Block Filter Segments
    blockControl.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      playClickSound();
      document.querySelectorAll('#blockControl .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeBlock = btn.dataset.block;
      applyFilters();
    });

    // Color Mode / Heatmap Selector
    colorModeSelect.addEventListener('change', (e) => {
      playClickSound();
      applyColorMode(e.target.value);
    });

    // Temperature Slider
    tempSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.currentTempK = val;
      const celsius = (val - 273.15).toFixed(1);
      tempValueDisplay.textContent = `${val} K (${celsius} °C)`;
      
      // Update Active preset button if exact match
      tempPresets.forEach(btn => {
        if (parseInt(btn.dataset.temp, 10) === val) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      updateStateCounts();
      if (state.colorMode === 'phase') {
        applyColorMode('phase');
      }

      // If modal is open, update current state display
      if (state.selectedElement && elementModal.classList.contains('open')) {
        const currP = getElementPhase(state.selectedElement, state.currentTempK);
        document.getElementById('modalCurrentState').textContent = currP;
      }
    });

    // Temperature Presets Buttons
    tempPresets.forEach(btn => {
      btn.addEventListener('click', () => {
        playClickSound();
        const val = parseInt(btn.dataset.temp, 10);
        tempSlider.value = val;
        tempSlider.dispatchEvent(new Event('input'));
      });
    });

    // Modal Close
    closeModalBtn.addEventListener('click', () => {
      playClickSound();
      closeElementModal();
    });

    modalBackdrop.addEventListener('click', () => {
      closeElementModal();
    });

    // Modal Prev / Next Navigation
    prevElementBtn.addEventListener('click', () => {
      if (!state.selectedElement) return;
      playClickSound();
      const prevNum = state.selectedElement.number > 1 ? state.selectedElement.number - 1 : 118;
      openElementModal(state.elements[prevNum - 1]);
    });

    nextElementBtn.addEventListener('click', () => {
      if (!state.selectedElement) return;
      playClickSound();
      const nextNum = state.selectedElement.number < 118 ? state.selectedElement.number + 1 : 1;
      openElementModal(state.elements[nextNum - 1]);
    });

    // Modal Tab Buttons
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        playClickSound();
        document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetTab = document.getElementById(btn.dataset.tab);
        if (targetTab) targetTab.classList.add('active');
      });
    });

    // Global Keyboard Navigation (Esc to close, Arrow keys for modal prev/next or table navigation)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (elementModal.classList.contains('open')) {
          closeElementModal();
        } else if (infoModal.classList.contains('open')) {
          infoModal.classList.remove('open');
          document.body.style.overflow = '';
        }
      } else if (elementModal.classList.contains('open')) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          prevElementBtn.click();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          nextElementBtn.click();
        }
      }
    });
  }

  // Small public API for dependency-free extension modules.
  window.PeriodicTableAPI = {
    getElement: (number) => state.elements.find(el => el.number === Number(number)) || null,
    openElement: (number) => {
      const el = state.elements.find(item => item.number === Number(number));
      if (el) openElementModal(el);
    },
    getElements: () => state.elements.slice()
  };

  // Initialize on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
