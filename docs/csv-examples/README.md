# CSV Examples for MX-5 NC1 Alignment Tool

## import-template.csv

Complete template with all possible columns filled. Use this as a starting point for creating import files.

**Columns**:
- `front_bolt`: Front eccentric bolt position (-6 to +6)
- `rear_bolt`: Rear eccentric bolt position (-6 to +6)  
- `camber_neg20`: Camber measurement at -20° steering angle (degrees)
- `camber_0`: Camber measurement at 0° steering angle (degrees)
- `camber_pos20`: Camber measurement at +20° steering angle (degrees)
- `toe`: (Optional) Toe measurement in mm (leave blank if not measured)

**How to Use**:
1. Download template or copy columns from import-template.csv
2. Enter your measurements (or leave cells blank for unmeasured positions)
3. Import via "Load from CSV" in the application
4. System will interpolate missing positions

---

## export-sample.csv

Example export showing typical output format with analyzed results.

**Interpretation**:
- Each row represents one bolt position combination (front & rear)
- Three camber values show measurements at three steering angles
- toe column shows toe measurement if captured
- analysis_note shows whether value was measured or interpolated

---

## Minimal Required Columns

Minimum viable CSV for import (only required columns):

```csv
front_bolt,rear_bolt,camber_neg20,camber_0,camber_pos20
-1,-2,-1.12,-1.08,-1.05
0,-2,-1.05,-1.02,-1.00
1,-2,-0.98,-0.95,-0.92
```

---

## Format Rules

1. **Encoding**: UTF-8 (required)
2. **Delimiter**: Comma (,)
3. **Line Endings**: LF (\n) or CRLF (\r\n)
4. **First Row**: Column headers (required)
5. **Data Type**: 
   - Bolt positions: Integers (-6 to +6)
   - Camber/Toe: Decimal numbers (e.g., 1.23, -0.45)
6. **Missing Data**: Leave cell blank or omit row
7. **Ranges**:
   - Camber: -3.0 to +3.0 degrees
   - Toe: -2.0 to +2.0 mm

---

## Common Patterns

### Minimal Test Data (9 measurements)
Covers a small region around center (0,0):
```
front_bolt,rear_bolt,camber_0
-1,-1,-1.10
-1,0,-1.05
-1,1,-1.00
0,-1,-1.08
0,0,-1.02
0,1,-0.98
1,-1,-1.05
1,0,-1.00
1,1,-0.95
```

### Full Grid (169 measurements)
All 13×13 combinations:
```
front_bolt,rear_bolt,camber_0
-6,-6,-1.50
-6,-5,-1.42
... (164 more rows)
+6,+6,-0.50
```

### Sparse Grid with Toe (25 measurements)
5×5 sampling with optional toe data:
```
front_bolt,rear_bolt,camber_0,toe
-4,-4,-1.35,0.60
-4,0,-1.05,0.58
-4,+4,-0.95,0.56
0,-4,-1.10,0.60
0,0,-1.02,0.58
... (20 more rows)
```

---

## Error Handling Examples

### Problem: Missing Column

**Input**:
```csv
front_bolt,rear_bolt,camber_0
-1,-2,-1.10
```

**Error**: Missing `camber_neg20` and `camber_pos20` columns  
**Action**: Import fails; system requests full column set

---

### Problem: Out-of-Range Value

**Input**:
```csv
front_bolt,rear_bolt,camber_neg20,camber_0,camber_pos20
-1,-2,5.0,-1.10,-1.05
```

**Warning**: camber_neg20 = 5.0° exceeds maximum range (±3.0°)  
**Action**: Row rejected; import continues with other rows

---

### Problem: Invalid Data Type

**Input**:
```csv
front_bolt,rear_bolt,camber_neg20,camber_0,camber_pos20
-1,-2,-1.12,CENTER,-1.05
```

**Error**: camber_0 = "CENTER" (not numeric)  
**Action**: Import fails; system requests numeric values

---

### Problem: Duplicate Row

**Input**:
```csv
front_bolt,rear_bolt,camber_neg20,camber_0,camber_pos20
-1,-2,-1.12,-1.08,-1.05
-1,-2,-1.10,-1.06,-1.02
```

**Warning**: Two measurements for same position (-1, -2)  
**Action**: First value retained; second ignored (or user prompted to choose)

---

## Best Practices

1. **Measure systematically**: Capture a regular pattern (every 1-2 bolt positions) rather than random spots
2. **Include measurement conditions**: Add note about temperature, tire pressure, steering feel
3. **Three steering angles**: Always include neg20, 0, and pos20 for accurate caster calculation
4. **Validate before import**: Open CSV in spreadsheet editor first to verify formatting
5. **Keep backup**: Save original measurement CSV before processing
6. **Document source**: Note vehicle, date, measurement tool, technician in file or comments

---

## Troubleshooting Import Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| File won't open | Wrong file type | Ensure .csv extension, UTF-8 encoding |
| Blank grid after import | No valid measurements | Check column names and data range |
| Some rows missing | Out-of-range values | Review validation rules; adjust data |
| Measurements seem wrong | Wrong units | Verify camber in degrees, toe in mm |
| Can't find "wheel" column | Wrong file structure | Check template format above |

---

## Advanced: Exporting Analysis Results

When you export results after analysis, the CSV includes:
- All 169 positions (measured + interpolated)
- Calculated camber and caster values at each position
- Scoring information (Golden Rule scores)
- Best three optima recommendations

Use exported CSV for:
- Long-term record of alignment session
- Comparison between different test dates
- Sharing results with other technicians
- Archiving before vehicle modifications
