import { calculateEffectiveWheelAngle, calculateCasterMultiplier } from './math-utils.js';
import { getRequiredPositions, getBoltRange, getBoltPositions } from './constants.js';
import { updateMeasurementMethodText, getCurrentDensity } from './measurement-utils.js';

const TARGET_STORAGE = {
  camber: 'alignment_target_camber',
  caster: 'alignment_target_caster',
  toeFront: 'alignment_target_toe_front',
  camberRear: 'alignment_target_camber_rear',
  toeRear: 'alignment_target_toe_rear',
};

const CONSTANT_STORAGE = {
  casterInputMode: 'alignment_constant_caster_input_mode',
  steeringRatio: 'alignment_constant_steering_ratio',
  casterWheelDegrees: 'alignment_constant_caster_wheel_degrees',
  wheelDiameter: 'alignment_constant_wheel_diameter',
};

const LEGACY_STORAGE = {
  steeringRatio: 'alignment_target_steering_ratio',
};

const TARGET_DEFAULTS = {
  camber: -1.1,
  caster: 5.0,
  toeFront: 0.07,
  camberRear: -1.5,
  toeRear: 0.07,
};

const CONSTANT_DEFAULTS = {
  casterInputMode: 'steering-ratio',
  steeringRatio: 15,
  casterWheelDegrees: 24,
  wheelDiameter: 469,
};

// Format numbers with . as decimal separator, independent of locale
function formatNumber(num, decimals) {
  return num.toFixed(decimals).replace(',', '.');
}

function getStoredNumber(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw == null || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function _mmToDegrees(mm, wheelDiameterMm) {
  return Math.atan(mm / wheelDiameterMm) * (180 / Math.PI);
}

function normalizeToeTargetDegrees(rawValue) {
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return null;

  // Legacy toe targets were stored in mm (typically around 0.5-0.7).
  // Degree targets are much smaller (typically around 0.05-0.15).
  if (Math.abs(value) > 0.3) {
    return _mmToDegrees(value, CONSTANT_DEFAULTS.wheelDiameter);
  }

  return value;
}

function getTargets() {
  const rawToeFront = getStoredNumber(TARGET_STORAGE.toeFront, TARGET_DEFAULTS.toeFront);
  const rawToeRear = getStoredNumber(TARGET_STORAGE.toeRear, TARGET_DEFAULTS.toeRear);

  return {
    camber: getStoredNumber(TARGET_STORAGE.camber, TARGET_DEFAULTS.camber),
    caster: getStoredNumber(TARGET_STORAGE.caster, TARGET_DEFAULTS.caster),
    toeFront: normalizeToeTargetDegrees(rawToeFront) ?? TARGET_DEFAULTS.toeFront,
    camberRear: getStoredNumber(TARGET_STORAGE.camberRear, TARGET_DEFAULTS.camberRear),
    toeRear: normalizeToeTargetDegrees(rawToeRear) ?? TARGET_DEFAULTS.toeRear,
  };
}

function getConfigs() {
  const casterInputModeRaw = localStorage.getItem(CONSTANT_STORAGE.casterInputMode);
  const casterInputMode = casterInputModeRaw === 'wheel-degrees' ? 'wheel-degrees' : CONSTANT_DEFAULTS.casterInputMode;

  const steeringRatio = localStorage.getItem(CONSTANT_STORAGE.steeringRatio) != null
    ? getStoredNumber(CONSTANT_STORAGE.steeringRatio, CONSTANT_DEFAULTS.steeringRatio)
    : getStoredNumber(LEGACY_STORAGE.steeringRatio, CONSTANT_DEFAULTS.steeringRatio);

  const measurementDensity = localStorage.getItem('alignment_measurement_density');
  const parsedDensity = measurementDensity !== null ? parseInt(measurementDensity, 10) : 5;

  return {
    casterInputMode,
    steeringRatio,
    casterWheelDegrees: getStoredNumber(CONSTANT_STORAGE.casterWheelDegrees, CONSTANT_DEFAULTS.casterWheelDegrees),
    wheelDiameter: getStoredNumber(CONSTANT_STORAGE.wheelDiameter, CONSTANT_DEFAULTS.wheelDiameter),
    measurementDensity: parsedDensity,
  };
}

function saveTargets(values) {
  localStorage.setItem(TARGET_STORAGE.camber, String(values.camber));
  localStorage.setItem(TARGET_STORAGE.caster, String(values.caster));
  localStorage.setItem(TARGET_STORAGE.toeFront, String(values.toeFront));
  localStorage.setItem(TARGET_STORAGE.camberRear, String(values.camberRear));
  localStorage.setItem(TARGET_STORAGE.toeRear, String(values.toeRear));
}

function saveConfigs(values) {
  localStorage.setItem(CONSTANT_STORAGE.casterInputMode, values.casterInputMode);
  localStorage.setItem(CONSTANT_STORAGE.steeringRatio, String(values.steeringRatio));
  localStorage.setItem(CONSTANT_STORAGE.casterWheelDegrees, String(values.casterWheelDegrees));
  localStorage.setItem(CONSTANT_STORAGE.wheelDiameter, String(values.wheelDiameter));
  // Keep legacy key in sync for backward compatibility with older flows.
  localStorage.setItem(LEGACY_STORAGE.steeringRatio, String(values.steeringRatio));
  // Save measurement density if provided
  if (values.measurementDensity !== undefined) {
    localStorage.setItem('alignment_measurement_density', String(values.measurementDensity));
  }
}

function resetTargets() {
  Object.values(TARGET_STORAGE).forEach((key) => localStorage.removeItem(key));
}

function resetConfigs() {
  Object.values(CONSTANT_STORAGE).forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(LEGACY_STORAGE.steeringRatio);
}

function setTargetInputs(values) {
  document.getElementById('camber-input').value = formatNumber(values.camber, 2);
  document.getElementById('caster-input').value = formatNumber(values.caster, 2);
  document.getElementById('toe-front-input').value = formatNumber(values.toeFront, 2);
  document.getElementById('camber-rear-input').value = formatNumber(values.camberRear, 2);
  document.getElementById('toe-rear-input').value = formatNumber(values.toeRear, 2);
}

function setConfigInputs(values) {
  const ratioModeRadio = document.getElementById('caster-mode-ratio');
  const wheelModeRadio = document.getElementById('caster-mode-wheel');
  if (ratioModeRadio) ratioModeRadio.checked = values.casterInputMode === 'steering-ratio';
  if (wheelModeRadio) wheelModeRadio.checked = values.casterInputMode === 'wheel-degrees';

  // Show/hide input groups based on selected mode
  const steeringRatioGroup = document.getElementById('steering-ratio-group');
  const wheelDegreesGroup = document.getElementById('wheel-degrees-group');
  if (steeringRatioGroup) steeringRatioGroup.style.display = values.casterInputMode === 'steering-ratio' ? '' : 'none';
  if (wheelDegreesGroup) wheelDegreesGroup.style.display = values.casterInputMode === 'wheel-degrees' ? '' : 'none';

  document.getElementById('steering-ratio-input').value = formatNumber(values.steeringRatio, 1);
  document.getElementById('wheel-degrees-input').value = formatNumber(values.casterWheelDegrees, 1);
  document.getElementById('wheel-diameter-input').value = formatNumber(values.wheelDiameter, 0);

  // Set measurement density selector if provided
  const densitySelect = document.getElementById('measurement-density-select');
  if (densitySelect && values.measurementDensity !== undefined) {
    densitySelect.value = String(values.measurementDensity);
  }

  updateDerivedConfigs(values);
}

function updateDerivedConfigs(values) {
  const effectiveWheelAngle = values.casterInputMode === 'wheel-degrees'
    ? Number(values.casterWheelDegrees)
    : calculateEffectiveWheelAngle(values.steeringRatio);
  const casterMultiplier = values.casterInputMode === 'wheel-degrees'
    ? calculateCasterMultiplier({ wheelDegrees: values.casterWheelDegrees })
    : calculateCasterMultiplier(values.steeringRatio);

  document.getElementById('effective-wheel-angle-display').textContent = `${formatNumber(effectiveWheelAngle, 2)} deg`;
  document.getElementById('caster-multiplier-display').textContent = formatNumber(casterMultiplier, 3);

  // Update bolt range display based on measurement density
  const boltRange = getBoltRange();
  const boltRangeDisplay = document.getElementById('bolt-range-display');
  if (boltRangeDisplay) {
    boltRangeDisplay.textContent = `−${Math.abs(boltRange.min)} to +${boltRange.max} (${getBoltPositions().length} positions)`;
  }

  // Update required washer points display - always -1 to +1 (3×3 grid = 9 points)
  const requiredDisplay = document.getElementById('required-points-display');
  if (requiredDisplay) {
    const requiredPositions = [-1, 0, 1];
    const positionString = requiredPositions.map(p => p === 0 ? '0' : (p < 0 ? `−${Math.abs(p)}` : `+${p}`)).join(', ');
    requiredDisplay.textContent = `${positionString} (${requiredPositions.length * requiredPositions.length} points)`;
  }
}

function readTargetInputs() {
  const parseNumber = (str) => Number(str.replace(',', '.'));
  return {
    camber: parseNumber(document.getElementById('camber-input').value),
    caster: parseNumber(document.getElementById('caster-input').value),
    toeFront: parseNumber(document.getElementById('toe-front-input').value),
    camberRear: parseNumber(document.getElementById('camber-rear-input').value),
    toeRear: parseNumber(document.getElementById('toe-rear-input').value),
  };
}

function readConfigInputs() {
  const parseNumber = (str) => Number(str.replace(',', '.'));
  const mode = document.getElementById('caster-mode-wheel')?.checked ? 'wheel-degrees' : 'steering-ratio';
  const densitySelect = document.getElementById('measurement-density-select');
  return {
    casterInputMode: mode,
    steeringRatio: parseNumber(document.getElementById('steering-ratio-input').value),
    casterWheelDegrees: parseNumber(document.getElementById('wheel-degrees-input').value),
    wheelDiameter: parseNumber(document.getElementById('wheel-diameter-input').value),
    measurementDensity: densitySelect ? parseInt(densitySelect.value, 10) : undefined,
  };
}

function isValidTargets(values) {
  return Number.isFinite(values.camber)
    && Number.isFinite(values.caster)
    && Number.isFinite(values.toeFront)
    && Number.isFinite(values.camberRear)
    && Number.isFinite(values.toeRear);
}

function isValidConfigs(values) {
  const ratioValid = Number.isFinite(values.steeringRatio) && values.steeringRatio > 0;
  const wheelDegreesValid = Number.isFinite(values.casterWheelDegrees) && values.casterWheelDegrees > 0;

  return (values.casterInputMode === 'wheel-degrees' ? wheelDegreesValid : ratioValid)
    && Number.isFinite(values.wheelDiameter)
    && values.wheelDiameter > 0;
}

function setActiveTab(tab) {
  const tabs = document.querySelectorAll('#config-tabs button');
  tabs.forEach((btn) => {
    const isActive = btn.dataset.tab === tab;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  document.getElementById('targets-panel').style.display = tab === 'targets' ? '' : 'none';
  document.getElementById('configs-panel').style.display = tab === 'configs' ? '' : 'none';
}

function bindTabEvents() {
  document.querySelectorAll('#config-tabs button').forEach((btn) => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
  });
}

function bindTargetEvents() {
  const form = document.getElementById('targets-form');
  const saveBtn = document.getElementById('btn-save-targets');

  const markDirty = () => {
    if (saveBtn) saveBtn.classList.add('primary');
  };

  const markClean = () => {
    if (saveBtn) saveBtn.classList.remove('primary');
  };

  document.getElementById('btn-reset-targets').addEventListener('click', () => {
    resetTargets();
    setTargetInputs(getTargets());
    markClean();
  });

  form.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', markDirty);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = readTargetInputs();
    if (!isValidTargets(values)) return;
    saveTargets(values);
    markClean();
  });
}

function bindConfigEvents() {
  const form = document.getElementById('configs-form');
  const saveBtn = document.getElementById('btn-save-configs');
  const ratioModeRadio = document.getElementById('caster-mode-ratio');
  const wheelModeRadio = document.getElementById('caster-mode-wheel');
  const steeringRatioInput = document.getElementById('steering-ratio-input');
  const wheelDegreesInput = document.getElementById('wheel-degrees-input');
  const wheelDiameterInput = document.getElementById('wheel-diameter-input');
  const densitySelect = document.getElementById('measurement-density-select');

  const markDirty = () => {
    if (saveBtn) saveBtn.classList.add('primary');
  };

  const markClean = () => {
    if (saveBtn) saveBtn.classList.remove('primary');
  };

  document.getElementById('btn-reset-configs').addEventListener('click', () => {
    resetConfigs();
    setConfigInputs(getConfigs());
    markClean();
  });

  const toggleVisibility = () => {
    const steeringRatioGroup = document.getElementById('steering-ratio-group');
    const wheelDegreesGroup = document.getElementById('wheel-degrees-group');
    const isRatioMode = ratioModeRadio?.checked;

    if (steeringRatioGroup) steeringRatioGroup.style.display = isRatioMode ? '' : 'none';
    if (wheelDegreesGroup) wheelDegreesGroup.style.display = isRatioMode ? 'none' : '';

    markDirty();
    const values = readConfigInputs();
    updateDerivedConfigs(values);
  };

  const rerenderDerivedConfigs = () => {
    const values = readConfigInputs();
    if (values.casterInputMode !== 'wheel-degrees' && (!Number.isFinite(values.steeringRatio) || values.steeringRatio <= 0)) return;
    if (values.casterInputMode === 'wheel-degrees' && (!Number.isFinite(values.casterWheelDegrees) || values.casterWheelDegrees <= 0)) return;
    if (!Number.isFinite(values.wheelDiameter) || values.wheelDiameter <= 0) return;
    updateDerivedConfigs(values);
  };

  if (ratioModeRadio) ratioModeRadio.addEventListener('change', toggleVisibility);
  if (wheelModeRadio) wheelModeRadio.addEventListener('change', toggleVisibility);
  if (steeringRatioInput) {
    steeringRatioInput.addEventListener('input', markDirty);
    steeringRatioInput.addEventListener('input', rerenderDerivedConfigs);
  }
  if (wheelDegreesInput) {
    wheelDegreesInput.addEventListener('input', markDirty);
    wheelDegreesInput.addEventListener('input', rerenderDerivedConfigs);
  }
  if (wheelDiameterInput) {
    wheelDiameterInput.addEventListener('input', markDirty);
    wheelDiameterInput.addEventListener('input', rerenderDerivedConfigs);
  }
  if (densitySelect) {
    densitySelect.addEventListener('change', markDirty);
    densitySelect.addEventListener('change', rerenderDerivedConfigs);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = readConfigInputs();
    if (!isValidConfigs(values)) return;
    saveConfigs(values);
    setConfigInputs(values);
    updateMeasurementMethodText(values.casterInputMode, values.measurementDensity);
    markClean();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const initialConfigs = getConfigs();
  setTargetInputs(getTargets());
  setConfigInputs(initialConfigs);
  setActiveTab('targets');
  updateMeasurementMethodText(initialConfigs.casterInputMode, initialConfigs.measurementDensity);

  bindTabEvents();
  bindTargetEvents();
  bindConfigEvents();
});
