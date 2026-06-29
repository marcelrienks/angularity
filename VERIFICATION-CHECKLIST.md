# Alignment Verification Checklist

**Generated**: 2026-06-29  
**Sample Data**: Populated with 13×13 grid (169 combinations)  
**Screenshots**: `/screenshots/` directory

---

## ✓ Data Population

- [x] Input page populated with sample data (13×13 grid visible)
- [x] 75 input cells created (5 columns × 15 rows visible per position set)
- [x] Three steering positions per cell (360° ACW, 0°, 360° CW)
- [x] All four wheels have data (FL, FR, RL, RR)

---

## 🎯 INDEX PAGE - Targets & Config

**Expected values visible in screenshot:**
```
Front Axle Targets:
  Camber (°): -1.10
  Caster (°): 5.00
  Toe (° per wheel): 0.07

Rear Axle Targets:
  Camber (°): -1.50
  Toe (° per wheel): 0.07
```

**Verify:**
- [ ] Front camber target: `-1.10°` matches displayed value
- [ ] Front caster target: `5.00°` matches displayed value
- [ ] Front toe target: `0.07°` matches displayed value
- [ ] Rear camber target: `-1.50°` matches displayed value
- [ ] Rear toe target: `0.07°` matches displayed value
- [ ] All targets consistent across page navigation (index → report → input)

---

## 📊 INPUT PAGE - Sample Data Grid

**Verify measurement consistency:**

**Front Left (FL) - Sample values visible:**
```
Position (-6, -6): 5.71, 1.2, 0.74
Position (-6, -5): 5.01, 1.52, 0.53
Position (-6, -4): 4.32, 1.04, 0.33
...
```

**Checks to perform:**
- [ ] All 169 cells (13×13) have data populated
- [ ] No empty cells in required positions (-6, -3, 0, +3, +6)
- [ ] Values are numeric and reasonable (angles ~0-7°)
- [ ] Same data appears when switching between wheels and back
- [ ] Export data matches visible values when exported

**Per-wheel verification:**
- [ ] FL (Front Left): All values visible and non-empty
- [ ] FR (Front Right): All values visible and non-empty  
- [ ] RL (Rear Left): All values visible and non-empty
- [ ] RR (Rear Right): All values visible and non-empty

---

## 📈 REPORT PAGE - Calculations & Charts

### Raw Data Summary Table
**Visible in screenshot:**
- 13×13 grid showing calculated values
- Color coding: Green (good), Orange (acceptable), Red (off-target)
- Cells show both measured and interpolated values

**Verify:**
- [ ] All 169 combinations rendered in table
- [ ] Interpolated values (italicized) are only between measured points
- [ ] Color coding matches values vs targets
  - [ ] Green = values closest to targets
  - [ ] Orange = acceptable deviation
  - [ ] Red = off-target
- [ ] Best cell has green border (closest to targets)

### Alignment vs Bolt Position Chart
**Scatter plot showing:**
- X-axis: Camber bolt position (-6 to +6)
- Y-axis: Achieved camber/caster angle
- Points colored by bolt group

**Verify:**
- [ ] Chart renders without errors
- [ ] Points form expected scatter pattern (curved lines per bolt group)
- [ ] Legend shows all bolt positions colored
- [ ] All 4 wheels displayed separately in tabs
- [ ] Chart responsiveness: zoom/pan work if implemented

### Axle Symmetry Analysis
**Checks:**
- [ ] Front axle symmetry detected (FL ↔ FR comparison)
- [ ] Rear axle symmetry analysis shown
- [ ] Recommendations generated for symmetric bolt positions

### Recommended Summary
**Should show:**
- [ ] Best bolt combination for each wheel
- [ ] Expected camber value at best position
- [ ] Caster value achievable
- [ ] Toe alignment status

### Symmetry Options
**Verify:**
- [ ] Camber symmetry pair options listed
- [ ] Caster symmetry pair options listed (if applicable)
- [ ] Rear axle pairing options shown
- [ ] All options are valid (within bolt range)

### Independent Optimizations
**Each wheel (FL, FR, RL, RR) should show:**
- [ ] Camber: optimal bolt combo
- [ ] Caster: optimal bolt combo (if independent)
- [ ] Expected values with configured bolts

---

## 🔢 Cross-Page Value Consistency

**Verify no data divergence:**
- [ ] Index targets (seen on INDEX) = Report targets (used in REPORT)
- [ ] Input values (edited on INPUT) = Report input data (displayed in REPORT)
- [ ] Calculated camber/caster (INPUT grid) = Report summary values

**Calculation validation:**
- [ ] Caster calculated from 3 steering positions
  - [ ] Formula: (camber_360CW - camber_360ACW) / 2 ≈ caster
  - [ ] Values reasonable (~4-6° for typical alignment)
- [ ] Camber average: (360°ACW + 0° + 360°CW) / 3
- [ ] Interpolation: only between measured positions, not extrapolated

---

## 🎨 Diagrams Page

**Verify:**
- [ ] Diagrams render without loading errors
- [ ] All four wheels shown (FL, FR, RL, RR)
- [ ] Washer positions diagram visible
- [ ] Symmetry indication diagram (if shown)

---

## ⚠️ Known Issues to Check

Based on prior audit ([project_math_audit.md](project_math_audit.md)):

- [ ] Golden rule score applies correctly (should be monotonic)
- [ ] Rear symmetry logic respects asymmetric targets when configured
- [ ] Locked bolt handling (e.g., rear toe) functions correctly
- [ ] Color coding accurately reflects distance to targets (not hardcoded)

---

## 📋 Overall Validation

| Component | Status | Notes |
|-----------|--------|-------|
| Input grid populated | ✓ | 13×13 with sample data |
| Index targets visible | ? | Check against screenshot |
| Report table rendered | ✓ | 13×13 grid with colors |
| Report chart rendered | ✓ | Scatter plot visible |
| Wheel tabs functional | ? | Check FR, RL, RR tabs |
| Values consistent | ? | Compare across pages |
| Calculations correct | ? | Validate caster formula |
| Color coding accurate | ? | Green/Orange/Red match values |

---

## 📷 Screenshots Available

```
screenshots/
├── index/
│   ├── 00-fullpage.png          (targets & config)
│   └── 01-section-main.png
├── input/
│   └── 00-fullpage.png          (13×13 measurement grid)
├── report/
│   ├── 00-fullpage.png          (full report)
│   ├── report-table-FL.png      (front left summary)
│   ├── report-table-FR.png      (front right summary)
│   ├── report-table-RL.png      (rear left summary)
│   └── report-table-RR.png      (rear right summary)
└── diagrams/
    └── 00-fullpage.png          (alignment diagrams)
```

---

## 🚀 Next Steps

1. **Visual verification**: Open each screenshot and cross-check values
2. **Automated tests**: Run `/test:report-values-check` or similar
3. **Data export**: Click "Export" on input page, verify CSV matches grid
4. **Calculation spot-check**: Pick 3-5 cells, manually verify caster calculation
5. **Wheel tab consistency**: Confirm each wheel tab shows correct data
6. **Symmetry validation**: Check that rear symmetry rules are applied
7. **Color accuracy**: Spot-check that color coding matches expected distances
