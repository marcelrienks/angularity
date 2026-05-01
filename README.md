# MX-5 NC1 Wheel Alignment System

**Web-based digital analysis tool + comprehensive physical measurement methodology for home wheel alignment**

> **Status**: ✅ MVP Complete (Phase 3) — 149 tests passing, AWS S3+CloudFront deployment ready

---

## 🎯 Executive Summary

This system enables **home mechanics** to optimize wheel alignment on a Mazda MX-5 NC1 by:
1. **Capturing discrete measurements** at multiple eccentric bolt positions (13×13 grid per wheel)
2. **Analyzing trade-offs** using a weighted scoring algorithm (the "Golden Rule")
3. **Recommending optimal bolt positions** that balance camber, caster, and symmetry
4. **Providing physical measurement procedures** for caster, camber, and toe using affordable tools

**Key Design Decisions**:
- ✅ **Value Symmetry, Not Bolt Symmetry** — FL and FR match on alignment values, not bolt positions
- ✅ **Three Independent Optima** — Each wheel shows best compromise + best camber + best caster
- ✅ **Client-Side Only** — All calculations in browser; data never leaves your machine
- ✅ **Discrete Grid** — 13×13 represents physical detents (169 combinations per wheel)

**Core Accessibility**: While designed for the MX-5 NC1, the methodology applies to any vehicle with eccentric bolt adjustment (BMW E30/E36, Honda Civic, Nissan S13/S14, etc.) — adapt measurement procedures and washer diagrams to your vehicle.

---

## 📖 Documentation Portal — Complete Reference

### **For Developers: All Technical Topics**

**Quick Reference** (start here):

| Document | Topic | What's In It | Read Time |
|----------|-------|--------------|-----------|
| [**QUICKSTART.md**](docs/QUICKSTART.md) | Setup & Installation | Installation, running tests, project structure, common dev tasks | 10 min |
| [**ARCHITECTURE.md**](docs/ARCHITECTURE.md) | System Design | 13×13 grid, three optima, value symmetry, input/report architecture, algorithms, data flow | 20 min |
| [**DESIGN.md**](docs/DESIGN.md) | Why It's Designed This Way | 8 strategic decisions + 6 implementation constraints; physics rationale | 15 min |

**For In-Depth Understanding**:

| Document | Topic | What's In It | Read Time |
|----------|-------|--------------|-----------|
| [**MODULES.md**](docs/MODULES.md) | Module Reference | 21 production modules: responsibility, API, dependencies, usage examples | 30 min |
| [**INDEX.md**](docs/INDEX.md) | Module Navigation & Dependencies | Quick lookup for all 21 modules, dependency matrix, impact analysis | 20 min |
| [**MODULES.md § Dependency Matrix**](docs/MODULES.md#dependency-matrix) | Dependency Analysis | Detailed dependency matrix, impact analysis examples, high-impact modules | 15 min |
| [**ARCHITECTURE.md § Visualizations**](docs/ARCHITECTURE.md#system-visualizations) | Visual Architecture | System layers, data flow, session lifecycle, CSV flow (Mermaid diagrams) | 15 min |
| [**INTERPOLATION.md**](docs/INTERPOLATION.md) | Bilinear Interpolation | Algorithm details, mathematical formula, implementation, testing | 20 min |
| [**REPORTING.md**](docs/REPORTING.md) | Three Optima Walkthrough | Step-by-step analysis pipeline, Golden Rule scoring, symmetry logic | 20 min |
| [**PERSISTENCE.md**](docs/PERSISTENCE.md) | CSV & localStorage | Schema, examples, error handling, quota management, usage patterns | 15 min |
| [**DEBUGGING.md**](docs/DEBUGGING.md) | Troubleshooting & Maintenance | Data transformation tracing, code impact analysis, maintenance procedures | 20 min |

**Operational Guides**:

| Document | Topic | What's In It | Read Time |
|----------|-------|--------------|-----------|
| [**TESTING.md**](docs/TESTING.md) | Test Coverage | 33+ Puppeteer integration tests, test matrix, how to run tests | 8 min |
| [**STYLING.md**](docs/STYLING.md) | Visual Design | Color palette, semantic colors, typography, design principles | 5 min |
| [**PRODUCT.md**](docs/PRODUCT.md) | Product Requirements | User stories, functional requirements, success criteria | 15 min |
| [**IMPLEMENTATION.md**](docs/IMPLEMENTATION.md) | Roadmap & Status | 4-phase roadmap, current status, blockers, execution plans | 10 min |
| [**DEPLOYMENT.md**](docs/DEPLOYMENT.md) | AWS Deployment | S3 + CloudFront setup, GitHub Actions CI/CD | 15 min |
| [**OPERATIONS.md**](docs/OPERATIONS.md) | Production Operations | Health checks, deployment, monitoring, incident response | 10 min |

---

### **For Mechanics: Align Your MX-5**

| Topic | Section | What You'll Learn |
|-------|---------|-------------------|
| 🎯 **Getting Started** | [Alignment Targets](#alignment-targets--presets) | Preset configurations, factory specs, target values |
| 📋 **Physical Procedures** | [Physical Measurement Methods](#physical-measurement-methods) | How to measure caster (20° sweep), camber (digital gauge), toe (string box) |
| 🔄 **Step-by-Step Workflow** | [Complete Alignment Workflow](#complete-alignment-workflow-checklist) | Full end-to-end procedure with checklists |
| ⚙️ **Hardware & Adjustment** | [Adjustment Hardware](#adjustment-hardware) | Eccentric washers, bolt positions, adjustment procedures |
| 📊 **Analysis & Prioritization** | [The Golden Rule](#prioritisation-the-golden-rule) | How to balance camber vs caster when compromises are needed |
| 🛠️ **Math & References** | [Calculations & Reference](#calculations--reference) | Formulas, conversions, worked examples |

---

### **Documentation Consolidation Strategy**

Our documentation uses a **consolidation-first approach** to maximize clarity while minimizing maintenance burden:

- **DESIGN.md** consolidates 5 files (decisions + constraints + three optima + rear wheel support + toe status)
- **PERSISTENCE.md** consolidates 7 files (CSV schema + localStorage schema + examples + error handling)
- **DEBUGGING.md** consolidates 3 files (data tracing + code impact + maintenance)
- **ARCHITECTURE.md** consolidates system overview, 8 visual diagrams, and input/output architecture
- **INDEX.md** consolidates module reference + dependency matrix from 2 sources

**Result**: 14 focused docs instead of 30+, same information value, better navigation

---

## 🚀 Quick Start by Role

### 👨‍💻 **Developer (First Time Setup)**

**5 Minutes:**
```bash
git clone https://github.com/marcelrienks/mx5-nc1.git
cd alignment
npm install && npm run start
```

**20 Minutes — Read Core Docs:**
1. [ARCHITECTURE.md](docs/ARCHITECTURE.md) — How the system works (15 min)
2. [QUICKSTART.md](docs/QUICKSTART.md) — Project structure & dev tasks (5 min)

**3 Minutes — Run Tests:**
```bash
npm run test:all-sync    # All 33+ tests
```

**Next Steps:** 
- [Adding features?](docs/MODULES.md) ← See module reference
- [Full implementation guide?](docs/IMPLEMENTATION.md) ← Project roadmap
- [Understanding design decisions?](docs/DESIGN.md) ← Why it works this way

---

### 👔 **Project Manager / Product Owner**

1. **Current Status** (5 min): [IMPLEMENTATION.md § Status](docs/IMPLEMENTATION.md#part-0-status-update--decisions-april-12-2026)
2. **Feature Overview** (10 min): [PRODUCT.md](docs/PRODUCT.md) — Requirements & success criteria
3. **Deployment Plan** (10 min): [DEPLOYMENT.md](docs/DEPLOYMENT.md) + [OPERATIONS.md](docs/OPERATIONS.md)

---

### 🔧 **Aligning Your MX-5 (Mechanic)**

1. **Plan**: [Alignment Targets](#alignment-targets--presets) — Pick a preset or customize
2. **Measure**: [Physical Measurement Methods](#physical-measurement-methods) — Detailed procedures
3. **Adjust**: [Complete Workflow](#complete-alignment-workflow-checklist) — Step-by-step checklist
4. **Analyze**: Use the web tool: input sheet → report with recommendations

---

## 🌍 Universal Applicability

While designed for the **Mazda MX-5 NC1**, the methodology applies broadly:

| Aspect | Specific to MX-5 | Universal | 
|--------|-----|----------|
| **Measurement methods** (digital gauge, string box, plumb line) | ❌ | ✅ Works for most sports cars/sedans |
| **Calculation formulas** (caster from steering sweep, camber targets) | ❌ | ✅ Caster multiplier varies by steering range |
| **Eccentric washer diagrams** | ✅ MX-5 specific | ⚠️ Concept universal; washer design varies |
| **Dependency order** (caster → camber → toe) | ❌ | ✅ Universal best practice |
| **Digital analysis tools** (grid mapping, symmetry analysis) | ❌ | ✅ Adapts to any adjustment system |

**For Other Vehicles** (BMW E30/E36, Honda Civic, Nissan S13/S14):
1. Use **measurement procedures and dependency order** as-is
2. Adapt **caster calculation multiplier** for your steering geometry
3. Adjust **eccentric washer diagrams** to match your hardware
4. Use **digital analysis tools** for grid mapping and position/value matching

---

## 📚 Full Table of Contents

**Developer Documentation →** See [Documentation Portal](#-documentation-portal--complete-reference) above

**Mechanic's Guide:**
1. [Alignment Targets & Presets](#alignment-targets--presets)
2. [Quick Start Workflow](#quick-start-workflow)
3. [Physical Measurement Methods](#physical-measurement-methods)
   - [Caster Measurement (20° Sweep)](#caster-measurement-20-sweep)
   - [Camber Measurement (Digital Gauge + Plumb Line)](#camber-measurement-digital-gauge--plumb-line)
   - [Toe Measurement (String Box Method)](#toe-measurement-string-box-method)
4. [Adjustment Hardware](#adjustment-hardware)
5. [Complete Alignment Workflow Checklist](#complete-alignment-workflow-checklist)
6. [Calculations & Reference](#calculations--reference)
7. [Prioritisation: The Golden Rule](#prioritisation-the-golden-rule)
8. [The Hierarchy of Priority](#the-hierarchy-of-priority)
9. [The Golden Order of Adjustment](#the-golden-order-of-adjustment)
10. [Rules for Best Practice & Compromise](#rules-for-best-practice--compromise)
11. [The "Weekend Car" Compromise Strategy](#the-weekend-car-compromise-strategy)
12. [Digital Analysis Tools](#digital-analysis-tools)
13. [Factory Specifications](#factory-specifications)
14. [Safety & Maintenance](#safety--maintenance)

---

## Alignment Targets & Presets

### Preset: Flyin Miata (Suggested)

**Front:**
- Caster: 5.0°
- Camber: −1.0°
- Toe-in (per side): 4.5′

**Rear:**
- Camber: −1.5°
- Toe-in (per side): 4.5′

### Preset: Fast Road Alignment (Suggested)

**Front:**
- Caster: 5.0°
- Camber: −1.2°
- Toe-in (per side): 4.0′

**Rear:**
- Camber: −1.5°
- Toe-in (per side): 4.0′

### Preset: Consolidated Middle Ground (Recommended)

Average of the two presets above — good balance for both street and spirited driving.

**Front:**
- Caster: 5.0°
- Camber: −1.1°
- Toe-in (per side): 4.25′

**Rear:**
- Camber: −1.5°
- Toe-in (per side): 4.25′

---

## Quick Start Workflow

This section provides an overview of **what to measure** and **target values for each step**, in the correct order.

### Assumptions
- You have a **digital angle gauge** (magnetic base, suitable for rotor or rim face mounting)
- You have a **string box** and **plumb line** for validation and toe measurement
- Your car is equipped with **eccentric washers** (standard on NC/NC1 models)
  - Front: two eccentric bolts per wheel (on lower control arm) control camber and caster, coupled together
  - Rear: eccentric bolts (on trailing arm or control arm) control camber (toe controlled separately)
- **Wheel diameter (outer edge to outer edge): 469 mm**
- Car settled on wheel cribs on a flat surface

### Quick Symmetry Checks (Targets)
**Symmetry applies to FINAL ALIGNMENT VALUES only, NOT bolt positions.**

- **Left/right camber (both axles):** Match within **≤ 1–2 mm** top-in difference
- **Left/right toe (both axles):** Match within **≤ 0.1–0.2 mm** difference
- **Front caster (left/right):** Match within **≤ 0.3°**

**Note:** FL and FR may require DIFFERENT eccentric bolt positions to achieve these symmetric values. The bolt positions themselves are irrelevant—only the final camber/caster/toe measurements matter for symmetry.

### Step 1: Measure & Adjust Caster (Front Only)

**Primary tool:** Digital angle gauge

**Procedure:** Use a ±20° steering sweep
- Mount the gauge on the brake rotor face (wheel removed) or rim face (wheel on)
- Steer to **+20°** and record camber reading: $C_{+20}$
- Steer to **−20°** and record camber reading: $C_{-20}$
- Compute: $|\Delta C| = |C_{+20} - C_{-20}|$
- Calculate caster: **Caster ≈ 1.462 × |ΔC|** (for 20° sweep)

**Target:** 5.0° caster (front)

**Expected reading:** For a 5.0° caster target, you should see $|\Delta C| \approx 3.4°$ camber change over the 20° sweep.

### Step 2: Measure & Adjust Camber (Front & Rear)

**Primary tool:** Digital angle gauge

**Procedure:** Steer straight (0°). Mount gauge on brake rotor face or rim face. Read camber directly.

| Axle | Target | Plumb-Line Equivalent |
|------|--------|----------------------|
| Front | −1.1° | 9.0 mm top-in |
| Rear | −1.5° | 12.3 mm top-in |

**Validation:** After adjusting with the gauge, cross-check using the plumb-line method (hang a plumb line at each wheel, measure mm top-in from the rim to the plumb line). The mm reading should convert back to your digital gauge reading within ~0.1–0.2°.

### Step 3: Measure & Adjust Toe (Front & Rear)

**Primary tool:** String box + plumb line

**Note:** Digital angle gauge does not measure toe; use the string box method.

| Axle | Target |
|------|--------|
| Front | +0.58 mm per wheel (4.25′) |
| Rear | +0.58 mm per wheel (4.25′) |

**Procedure:** Use plumb line as a pointer to the string line, measure rim distances front/rear, compute toe.

---

## Physical Measurement Methods

### Caster Measurement (20° Sweep)

#### Quick Reference
- **Target:** 5.0° caster (front) — left/right matching within **≤ 0.3°** is more critical than hitting the exact value
- **Method:** Digital gauge + 20° steering sweep
- **Formula:** Caster ≈ **1.462 × |ΔC|**, where |ΔC| is the magnitude of camber change between +20° and −20° steering
- **Expected reading:** For 5.0° target, you should see ~3.4° camber change over the 20° sweep

#### The Core Idea
When you steer a wheel left/right by a known angle, the wheel's camber reading changes due to caster. Measuring camber at +20° and −20° steering gives you the information needed to calculate caster.

#### What You Need

**For accurate steering angle:**
- Real turn plates with degree scales (+20° and −20° marked clearly), **or**
- DIY approach: two slip plates (greased/teflon between boards) + printed protractor scale + pointer mounted to car frame

**For camber measurement:**
- **Digital angle gauge** (magnetic base, mountable on brake rotor or rim face)
  - Accuracy: ±0.1° is typical
  - Rotor mounting (wheel off) is preferred for repeatability

**Setup:**
- Flat surface, correct tire pressures, wheels settled on cribs
- Steering wheel centered and locked in place (except during the sweep)
- Front wheels on slip/turn plates so they rotate freely

#### Step-by-Step Measurement Procedure (Per Wheel)

1. **Straight-ahead baseline**
   - Set the wheel to **0°** (straight ahead)
   - Record camber reading: $C_0$ (baseline; useful as sanity check)

2. **Turn to +20°**
   - Steer that wheel to **+20°** from straight ahead
   - Let the suspension settle briefly
   - Mount the digital gauge on the brake rotor face or rim face
   - **Mount the gauge repeatably** so it reads the same camber angle orientation each time
   - Record the camber reading: $C_{+20}$

3. **Turn to −20°**
   - Steer to **−20°** (opposite direction)
   - Let the suspension settle briefly
   - Mount the gauge in the same orientation as step 2
   - Record the camber reading: $C_{-20}$

4. **Compute camber change**
   $$\Delta C = C_{+20} - C_{-20}$$
   Use the **magnitude:** $|\Delta C| = |C_{+20} - C_{-20}|$

5. **Compute caster**
   $$\text{Caster} \approx \frac{|\Delta C|}{2 \sin(20°)} \approx 1.462 \times |\Delta C|$$

#### Worked Example
If you measure:
- $C_{+20} = -3.0°$
- $C_{-20} = 0.4°$
- $\Delta C = -3.0 - 0.4 = -3.4°$
- $|\Delta C| = 3.4°$
- Caster ≈ 1.462 × 3.4° ≈ **4.97°** ✓

#### Interpretation & Troubleshooting

**Wide swing in results?**
- Steering angle not actually ±20° (turn plate error or DIY protractor misaligned)
- Wheels binding on slip plates (poor lubrication or plates too tight)
- Gauge not mounted repeatably (gauge orientation / pressure changes)
- Suspension not fully settled before measuring

**Left/right caster differs significantly?**
- Normal if the difference is ≤0.3°; larger differences may indicate suspension damage or bent components

**Camber readings at 0° seem way different from expected?**
- Check that your 0° steering position is truly centered
- Confirm the gauge is mounted consistently
- Cross-check with the plumb-line method to validate

#### After Measuring Caster

- **Note your results:** Write down left and right caster values and note any eccentric washer positions used
- **If caster is off target:**
  - Caster is adjusted via the **front eccentric bolts** (lower control arm)
  - The front eccentric bolt position directly affects caster (along with camber)
  - Rotate the front eccentric washer slightly (1–2 positions on the −6 to +6 scale)
  - Test the direction: if caster increases as you rotate, note that direction
  - Settle suspension and re-measure caster at 0° steering
  - Record the new eccentric position
  - Iterate in small steps until within target tolerance
  - **Important:** Caster and camber are coupled via the front eccentric bolt, so expect camber to shift slightly. You may need to revisit camber after caster adjustment.

### Camber Measurement (Digital Gauge + Plumb Line)

#### Quick Reference
- **Target:** Front −1.1°, Rear −1.5° (measured at 0° steering)
- **Primary method:** Digital angle gauge, read directly in degrees
- **Validation method:** Plumb line measured in mm (convert to degrees to cross-check)
- **Tolerance:** Gauge and plumb-line method should agree within ~0.1°

#### The Core Idea
Camber is the angle of the wheel relative to vertical when viewed from the front. **Negative camber** means the top of the wheel tilts inward (towards the car's centerline).

The **digital angle gauge** reads this angle directly. The **plumb-line method** derives the same information from horizontal mm measurements, which you can convert back to degrees as a sanity check.

#### What You Need

**Primary measurement:**
- **Digital angle gauge** (magnetic base, mountable on rotor or rim face)
  - Mount on the **brake rotor face** (wheel removed) for best repeatability
  - Mount on the **outer rim face** if the wheel stays on
  - Accuracy ±0.1° is sufficient

**Validation measurement:**
- Plumb bob (or weighted string)
- String box (from the DIY String Box Method setup)
- Tape measure / calipers (mm resolution)

**Setup:**
- Car settled on wheel cribs
- Steering wheel straight (0° steering angle) and locked
- Suspension settled (roll forward/back, bounce corners)

#### Measurement Procedure (Per Wheel at 0° Steering)

1. **Prepare for measurement**
   - Ensure steering wheel is straight and locked in place
   - Settle the suspension
   - If using rotor mounting: remove the wheel and brake splash shield (if necessary)
   - If using rim mounting: keep the wheel on and position the gauge on the outer rim face

2. **Mount the digital gauge**
   - Place the gauge on the **rotor face** (wheel off, preferred) or **outer rim face** (wheel on)
   - Ensure the magnetic base sits flat and secure
   - The gauge should read vertical (perpendicular to ground)
   - **Repeatability is key:** Use the same mounting surface and orientation every time

3. **Read the camber angle**
   - Read the angle directly from the digital display
   - Record the value with its sign (e.g., −1.2° means negative camber)
   - Take multiple readings on the same spot to verify consistency (±0.1° variation is normal; >0.2° suggests an unstable mount)

4. **Record and compare to target**
   - Front target: −1.1°
   - Rear target: −1.5°
   - If your reading matches the target within ~0.2°, you're good; otherwise, adjust

#### Validation Using Plumb Line + String Box (Optional but Recommended)

After measuring with the digital gauge, cross-check by using the plumb-line method:

1. **Set up your string box** (if not already set up)
2. **At the wheel you just measured:**
   - Hang a plumb line so it's vertical and clear of the wheel
   - Measure the horizontal distance from the plumb line to the **top edge** of the rim: $d_{top}$
   - Measure the horizontal distance from the plumb line to the **bottom edge** of the rim: $d_{bottom}$
   - Compute "top-in": $\Delta = d_{top} - d_{bottom}$ (positive = top tilted inward, which matches negative camber)

3. **Convert mm to degrees:**
   $$|\phi| = \arcsin(\Delta / 469)$$
   Where 469 mm is the wheel diameter (outer edge to outer edge)

4. **Compare to your gauge reading:**
   - Your digital gauge reading (in degrees) should match this calculated angle within ~0.1–0.2°
   - If they differ more than that, re-check:
     - Gauge mount repeatability (same surface, same orientation)
     - Plumb line is truly vertical
     - Rim measurement points are the correct ones

| Target Angle | Expected mm Top-In |
|---|---|
| −1.1° (front) | ~9.0 mm |
| −1.5° (rear) | ~12.3 mm |

#### Adjustment Notes

**Front Camber, Caster & Toe (Eccentric Bolts):**

The front suspension uses eccentric bolts for all three parameters:
- **Front eccentric bolt** (lower control arm, forward position):
  - **Primary effect:** Sets camber; rotating changes both camber and caster together (they're coupled)
  - **Position range:** −6 to +6
  - Rotating toward **+6** adds negative camber (wheel leans in more at the top)
  - Rotating toward **−6** reduces negative camber (wheel stands more upright)
  
- **Rear eccentric bolt** (lower control arm, rearward position):
  - **Primary effect:** Primarily affects caster; also affects camber due to geometry coupling
  - **Position range:** −6 to +6
  - Rotating adjusts both caster and camber; test small adjustments and measure
  - **Note**: Toe is NOT controlled by eccentric bolts; toe requires separate tie-rod or linkage adjustment

**Adjustment procedure:**
1. Loosen the eccentric bolt slightly (it should still grip; do not remove)
2. Rotate the washer in small increments (1–2 positions on the scale)
3. Tighten the bolt firmly to proper torque spec (consult NC1 service manual)
4. Settle suspension (roll forward, bounce each corner)
5. Re-measure immediately; record the eccentric position (e.g., "FL: Front +4, Rear −2")
6. Iterate in small steps

**Rear Camber & Toe (Eccentric Bolts):**

Rear suspension uses eccentric bolts for both camber and toe:
- **Eccentric bolt location:** typically on the trailing arm or control arm attachment
- **Position range:** −6 to +6
- **Effect:** Rotation adjusts camber; toe is controlled separately via dedicated rear linkage

### Toe Measurement (String Box Method)

#### Tools & Materials
- 2 × long strings (low-stretch line is best)
- 2 × PVC crossbars (front and rear)
- Tape measure / steel ruler / calipers (mm resolution helps)
- Plumb bob (or weighted nut on thin line)
- Wrenches for tie rods and rear toe adjusters
- Chalk / masking tape + marker (for reference points)

#### My Current Setup
- The car sits on **wheel cribs** so the wheels can be turned/adjusted with the suspension loaded
- I use **two PVC pipes** (front + rear) as crossbars
- I run **two string lines** along the sides of the car (left + right) tied to the PVC crossbars, forming a rectangle ("box")
- At each wheel I use a **plumb line** as a pointer to read measurements precisely where the plumb line *just touches the inner surface* of the box string line

#### Important Notes (Repeatability)
- Use the **flattest surface** available; settle suspension before each measurement (roll forward/back, bounce corners)
- Zero steering wheel and lock it to avoid toe changes during measurement
- Measure toe in **mm** (easier to hit consistently than angle conversions)
- **Safety:** Use wheel cribs under the car, not just jacks (risk of collapse under sustained load)

#### 1) Build the String Box
1. Place the front PVC pipe ahead of the front bumper area and the rear PVC pipe behind the rear bumper area
2. Tie a string line down each side of the car between the PVC pipes
3. Adjust the strings so they are **tight** and at **hub height** (or as close as you can manage consistently)

#### 2) Square the Box to the Car

Goal: the left and right strings should be **parallel to the car's centerline**, not necessarily parallel to the wheels.

**Method A — Reference the Rear Track (Simple & Common):**
1. On the rear wheels, measure from the string to the **rear rim lip** at the front and rear edge of the rim (same height each time)
2. Adjust the left and right strings until the string-to-rim distance is **equal on both sides** (left vs right) and consistent front/rear for the rear axle
3. This makes the strings parallel to the rear axle

**Method B — Center the Box About the Car:**
1. Pick repeatable chassis points (e.g., pinch weld seams) near the front and rear
2. Measure from each string to those points and adjust until the chassis is **centered** within the box

**Tip:** Write down your chosen reference points so you can recreate the same baseline next time.

#### 3) Measure Toe at Each Wheel Using the String
You're measuring the wheel's angle relative to the string line.

1. At a wheel, measure from the string to the **front edge of the rim** and to the **rear edge of the rim** at the same height
2. Compute: `toe_mm = front_distance - rear_distance`
   - With a typical string setup (string line **outside** the wheels):
     - Toe-in gives `front_distance > rear_distance`, so `toe_mm` will be **positive**
     - If you use the opposite subtraction (`rear - front`), the same toe-in reads as a **negative** number — either convention works as long as you're consistent
   - The important thing is being consistent about which subtraction you use

**Using a plumb line as a pointer:**
- Hold/position the plumb line so it's vertical, and adjust it so it **just touches the inner surface** of the string line

#### 4) Adjust Toe

**Front (tie rods):**
- Loosen jam nuts, adjust each side in small steps, re-tighten lightly, settle suspension, and re-measure
- Try to keep the steering wheel centered by making **equal and opposite** adjustments left vs right

**Rear (toe adjusters):**
- Adjust the rear toe eccentric/links (depending on your NC1 hardware), settle suspension, and re-measure
- Keep left/right rear toe symmetrical unless you're chasing a thrust-angle issue

#### 5) Re-check and Lock It In
- After hitting targets, tighten all fasteners to spec
- Re-check measurements after final tighten (things can move)
- Do a short drive around the block, re-settle, and do a quick verification pass

#### Quick Troubleshooting
- **Numbers jump around:** strings not tight, car not settled, measuring at different heights, or the wheel is being nudged while measuring
- **Can't center steering wheel:** you changed toe unevenly side-to-side; re-balance by splitting changes evenly
- **Rear feels "crabby":** rear toe mismatch or thrust angle; re-square strings and re-check rear toe symmetry

---

## Adjustment Hardware

### Eccentric Washers & Bolts

The NC1 suspension uses **eccentric washers** (also called eccentric bolts or cam bolts) for precise alignment adjustment. Understanding how they work is critical for making repeatable, accurate adjustments.

#### Universal Principle

While the **specific configuration shown below is for the MX-5 NC1**, the principle of using eccentric bolts for alignment adjustment is found across many vehicles with adjustable suspensions:
- **BMW E30/E36, Z3** — front and rear eccentric bolts
- **Honda Civic EK/EG, Integra** — front lower control arm eccentric bolts
- **Nissan S13/S14/S15** — front and rear cam adjusters
- **Mazda MX-5 (all generations)** — eccentric washers on front and rear

The **core concept remains the same**: rotate the eccentric lobe to change the point of attachment, thereby adjusting suspension geometry. The specific washer design, number markings, and bolt locations will vary by vehicle.

#### What Are Eccentric Washers?

An eccentric washer is a hardware component with an **offset bolt hole and a rotating lobe** that allows infinitesimal angular adjustment of suspension geometry.

**Design:**
- **Bolt hole location:** positioned at the **12 o'clock** position (top) of the washer
- **Eccentric lobe:** offset towards the **bottom (6 o'clock)** of the washer, creating the eccentric effect
- **Rotating effect:** when the bolt is loosened slightly and the washer rotated, the lobe moves, changing the suspension attachment point and thus the wheel angle

#### Markings & Reading the Adjustment

The bottom half of each eccentric washer is marked with **13 indication lines** spread evenly across the bottom arc, spanning from **9 o'clock to 3 o'clock** positions.

**Zero and Scale:**
- **0 position:** the bottom of the washer (**6 o'clock**)
- **+6 position:** **3 o'clock** side (right side, when looking at the wheel from outside the car)
- **−6 position:** **9 o'clock** side (left side, when looking at the wheel from outside the car)

This gives a total range of **−6 to +6** (12 steps total) for each eccentric washer.

**Reading the current position:**
- Locate the reference mark on the suspension arm or bracket (usually a paint line or scribed mark)
- Align it with the numbers on the eccentric washer edge
- Record the position (e.g., "Front +6, Rear −4" for a wheel)

#### Where Eccentric Washers Are Used

**Front Suspension:**

Front eccentric washers are found at the **lower control arm attachment points** (two per wheel):
- **Front bolt:** controls **camber and caster** primarily when rotated
- **Rear bolt:** controls **camber and toe** primarily when rotated

Together, the front and rear bolts give you 3-axis control of the front wheel: **camber, caster, and toe**.

**Rear Suspension:**

Rear eccentric washers are typically located at the **trailing arm or rear control arm attachment points** (number and location vary by year/trim):
- Control **camber and toe** adjustment
- Caster adjustment is not typically available in the rear (not needed)

#### Adjustment Procedure (General)

1. **Loosen the bolt** slightly (do not remove it completely; keep the washer in contact with the bracket)
2. **Rotate the washer** clockwise or counterclockwise to move the eccentric lobe
   - Rotating toward **+6 (3 o'clock)** moves the wheel in one direction
   - Rotating toward **−6 (9 o'clock)** moves the wheel in the opposite direction
3. **Watch the wheel angle change** as you rotate (this is why measurements must be taken after settling)
4. **Tighten the bolt firmly** once you reach your target angle
5. **Settle the suspension** and **re-measure** — the angle may shift slightly as fasteners settle

#### Recording Positions for Repeatability

**Always write down the eccentric washer positions** after successful adjustment:
- Note which wheel (FL, FR, RL, RR)
- Record the front and rear position for each wheel (e.g., "Front Left: Front bolt +3, Rear bolt −2")
- Include the date and the alignment angles achieved

This makes returning to the same setup much faster if you ever need to re-adjust.

---

## Complete Alignment Workflow Checklist

Follow these steps sequentially to complete a full alignment.

### Pre-Flight Checklist

Before starting any measurements:

- [ ] **Park on the flattest, level surface** available (garage floor, level driveway, or alignment ramp if you have one)
- [ ] **Check tire pressures** — inflate to the vehicle manufacturer's recommended cold pressure (typically printed on driver's door jamb or fuel door)
- [ ] **Loosen all suspension fasteners** that may be stiff to ensure smooth rotation during adjustment:
  - **Eccentric bolts** (front lower control arm, front & rear positions; rear trailing arm or control arm)
  - **Tie-rod jam nuts** (front)
  - **Rear toe adjuster fasteners** (if applicable)
  - These should be loosened just enough to allow free rotation of the eccentric washers; do not remove completely
- [ ] **Place wheels on cribs** under the suspension (never work under a car supported only by jacks)
- [ ] **Raise the car on jacks** and support with wheel cribs; ensure stability
- [ ] **Settle the suspension:** Roll the car forward about 1 meter (or have it roll naturally), then bounce each corner 2–3 times to let the suspension settle
- [ ] **Lock the steering wheel** in the center position (straight ahead) to prevent unintended changes during setup
- [ ] **Gather all tools** (digital gauge, string, plumb line, ruler, turn plates, wrenches, etc.)

### Step 1: Build & Square the String Box

1. Place **front and rear PVC pipes** ahead of the front bumper and behind the rear bumper
2. Tie **two string lines** down the left and right sides of the car between the pipes
3. Adjust strings so they are **tight** and at approximately **hub height**
4. **Square the box to the car** (see **Toe Measurement (String Box Method)** → "Square the Box to the Car" for Method A or B)
5. **Write down your reference points** (rear rim edges used for squaring, or chassis points) so you can recreate the baseline next time

### Step 2: Measure & Adjust Caster (Front Only)

1. **Mount the digital gauge** on the brake rotor face (preferred) or rim face
2. **Perform the 20° steering sweep:**
   - Steer to +20° and record camber: $C_{+20}$
   - Steer to −20° and record camber: $C_{−20}$
   - Compute $|\Delta C| = |C_{+20} - C_{−20}|$
   - Calculate caster: **Caster ≈ 1.462 × |ΔC|**
3. **Compare to target (5.0°)** and decide if adjustment is needed
4. **If caster is off:**
   - Locate the caster adjustment points on your NC1 (typically eccentric bolts on lower control arm)
   - Adjust in small increments
   - Re-settle suspension and re-measure
   - Repeat until within ~0.3° of target
5. **When caster is on target:** Verify left and right are balanced (within ~0.3°), then proceed to Step 3

### Step 3: Measure & Adjust Camber (Front, Then Rear)

#### Front Camber

1. **Set steering wheel straight (0°)** and ensure it's locked in place
2. **Mount the digital gauge** on the rotor face or rim face (same mounting as the caster sweep)
3. **Read camber directly**
4. **Target:** −1.1° (front)
5. **If off target, use eccentric washers to adjust** (see [Adjustment Hardware](#adjustment-hardware) for detailed procedure)
6. **Proceed to rear camber**

#### Rear Camber

1. **Move to rear wheels**
2. **Mount the digital gauge** on rotor (if wheel off) or rim face (if wheel on)
3. **Read camber directly**
4. **Target:** −1.5° (rear)
5. **If off target, use eccentric washers to adjust**
6. **Verify left/right symmetry:** front and rear left/right camber should match within ~1–2 mm top-in (equivalent to ~0.1–0.2°)

### Step 4: Measure & Adjust Toe (Front, Then Rear)

Toe is done last because it doesn't affect caster or camber, but caster and camber affect toe measurement accuracy.

#### Front Toe

1. **At each front wheel:**
   - Measure from the **plumb line** (used as a pointer to the string) to the **front rim edge**: $d_{front}$
   - Measure to the **rear rim edge**: $d_{rear}$
   - Compute: `toe_mm = d_front - d_rear`
   - **Target:** +0.58 mm per wheel (positive = toe-in)
2. **If off target:**
   - Loosen tie-rod jam nuts (one per side)
   - Adjust each side in small increments (adjust in pairs to keep steering centered)
   - Tighten jam nuts lightly; settle suspension; re-measure
   - Iterate until within ~0.1 mm per wheel
3. **Verify left/right balance:** left and right toe-in should match within ~0.1–0.2 mm

#### Rear Toe

1. **At each rear wheel:**
   - Measure from plumb line (reference to string) to **front rim edge**: $d_{front}$
   - Measure to **rear rim edge**: $d_{rear}$
   - Compute: `toe_mm = d_front - d_rear`
   - **Target:** +0.58 mm per wheel
2. **If off target, use eccentric washers to adjust** (similar procedure to camber)
3. **Verify symmetry:** rear left/right toe should match within ~0.1–0.2 mm

### Step 5: Final Verification & Lock-Down

1. **Re-measure all alignments** (caster, camber, toe) to confirm everything is still on target after all adjustments
2. **Tighten all fasteners to OEM spec:**
   - Tie-rod jam nut torque: ~25–35 Nm (consult manual)
   - Eccentric bolt torques: consult manual
   - Wheel lug nut torque: ~88–118 Nm
3. **Re-settle the suspension** and do a quick re-check of caster and camber (toe can shift if tie rods move, so verify)
4. **Lower the car** off the cribs and jacks; roll it forward a meter and settle again
5. **Do a final short drive** around the parking lot or block
6. **Re-settle and do one more quick verification** (at least camber and toe; caster is usually stable after fastener tightening)

### Sign-Off

- [ ] Caster: Left ___°, Right ___° (target 5.0° ± 0.3°)
- [ ] Camber Front: Left ___°, Right ___° (target −1.1° ± 0.2°)
- [ ] Camber Rear: Left ___°, Right ___° (target −1.5° ± 0.2°)
- [ ] Toe Front: Left ___mm, Right ___mm (target +0.58 mm ± 0.1 mm per wheel)
- [ ] Toe Rear: Left ___mm, Right ___mm (target +0.58 mm ± 0.1 mm per wheel)
- [ ] All fasteners torqued to spec
- [ ] No tools left under the car

---

## Calculations & Reference

### Toe: angle ↔ mm at the rim

#### What the String Box Is Measuring

At a given wheel you measure (at the same height):
- `front` = distance from string (via plumb) to the **front edge** of the rim
- `rear` = distance from string (via plumb) to the **rear edge** of the rim

The raw toe readout is:
- `toe_mm = front - rear`

Sign convention: `toe_mm > 0` means **toe-in** (front of rim is further from the string than the rear)

#### Convert Toe Angle to mm

If the two measurement points are separated by **L** (mm), then:

$$\text{toe\_mm} = L \cdot \tan(\theta)$$

For small angles (which alignment toe always is):

$$\text{toe\_mm} \approx L \cdot \theta_{rad}$$

#### Worked Example: 4.25′ Toe-in Per Wheel → mm

1. Convert arcminutes to degrees: $4.25' = 4.25 / 60 = 0.071°$
2. Convert to radians: $0.071° \times \pi/180 \approx 0.00124$ rad
3. Calculate mm: $469 \text{ mm} \times \tan(0.00124) \approx 0.58$ mm

That's where the Quickstart target **+0.58 mm** comes from.

#### Convert mm Back to Toe Angle

$$\theta = \arctan(\text{toe\_mm}/L)$$

Example: if you measure `toe_mm = +0.58` at `L = 469`: $\theta \approx 4.25'$

### Camber: angle ↔ mm "top-in" at the rim

#### What the Plumb-Line Method Is Measuring

At a wheel, you hang a plumb line and measure horizontal distance to the rim:
- `top` = distance from plumb line to rim edge near the top
- `bottom` = distance from plumb line to rim edge near the bottom

With negative camber ("top-in"), the top is tucked inboard:
- `top - bottom` is positive

#### Convert Camber Angle to mm

Using measurement points separated by **L** (mm) vertically on the rim:

$$\Delta = L \cdot \sin(|\phi|)$$

Where:
- $\phi$ is camber angle in radians/degrees
- $\Delta$ is the "top-in" magnitude in mm (i.e., `top - bottom`)

#### Worked Examples

**−1.1° camber → mm top-in:**
- $\Delta = 469 \times \sin(1.1°) \approx 469 \times 0.0192 \approx 9.0$ mm

**−1.5° camber → mm top-in:**
- $\Delta = 469 \times \sin(1.5°) \approx 469 \times 0.0262 \approx 12.3$ mm

#### Convert mm Back to Camber Angle

$$|\phi| = \arcsin(\Delta/L)$$

Example: if you measure `top - bottom = 9.0 mm` at `L = 469 mm`: $|\phi| \approx 1.1°$

### Caster: camber change over steering sweep ↔ caster angle

#### What the Steering Sweep Is Measuring

When you steer a wheel through a known angle (±20° from straight), the **camber reading** changes due to caster.

If you measure camber at:
- $C_{+20}$ = camber at +20° steering
- $C_{-20}$ = camber at −20° steering

Then the camber change is:
$$\Delta C = C_{+20} - C_{-20}$$

And caster is related to this change by the steering angle:
$$\text{Caster} = \frac{|\Delta C|}{2 \sin(\theta_{steer})}$$

#### Convert Steering Sweep Camber Change to Caster Angle

For a **20° steering sweep**:

$$2 \sin(20°) \approx 0.6840$$

So:
$$\text{Caster} \approx 1.462 \times |\Delta C|$$

#### Worked Example: 5.0° Caster Target with 20° Sweep

If your car has roughly 5.0° caster:
$$|\Delta C| \approx 2 \times 5.0° \times \sin(20°) = 2 \times 5.0 \times 0.342 \approx 3.42°$$

So you should expect a camber change of roughly **3.4°** between the +20° and −20° steering readings.

Conversely, if you measure $|\Delta C| = 3.4°$:
$$\text{Caster} \approx 1.462 \times 3.4° \approx 4.97°$$ ✓

---

## Prioritisation: The Golden Rule

**Key Principle**: Camber affects tire wear (most critical), caster affects steering feel (important), toe affects stability (non-negotiable).

> If camber is within ±0.5°, prioritize caster. However, don't sacrifice camber by >1.0° just to hit a caster target — you'll hurt the car's overall performance.

**For detailed scoring algorithm and trade-off analysis**, see [DESIGN.md § Decision 8: Golden Rule Hierarchy](docs/DESIGN.md#decision-8-golden-rule-hierarchy)

---

## The Golden Order of Adjustment

You **must work from the "inside out"** to minimize how much each adjustment throws off the others:

### Step 1: Caster First
- Adjusting caster involves moving the entire control arm forward/backward
- This massive movement drastically swings the camber and toe
- Get caster "in the ballpark" first before fine-tuning anything else

### Step 2: Camber Second
- Once caster is set, fine-tune your camber
- This will likely shift your toe, but it shouldn't significantly alter the caster you just set

### Step 3: Toe Last
- Toe is the most sensitive and is affected by everything else
- **Critical rule**: Never adjust camber or caster after toe is set, or you will have to redo toe entirely
- Toe should always be your final lock-in adjustment

---

## Rules for Best Practice & Compromise

### The "Symmetry" Rule (Values, Not Positions)
**If you can't hit your target on one side of the car, detune the other side to match it.**

**Symmetry applies to FINAL VALUES (camber, caster, toe), NOT to bolt positions.**

**Example**: 
- If target is −1.1° camber and 5.0° caster:
  - FL best camber: Front +0, Rear −3 → −1.10° camber
  - FR best camber: Front +1, Rear −4 → −1.10° camber
  - → Both wheels achieve −1.10° camber; use these positions

**Why**: An asymmetrical car will pull under braking and handle differently in left vs. right turns, which is dangerous. Matching VALUES (not positions) ensures symmetrical handling.

### The "Tire Longevity" Tie-Breaker
If you are forced to choose between "too aggressive" or "too conservative" compared to your target:

- **For Camber**: Lean toward conservative (less negative) — saves tires
- **For Caster**: Lean toward aggressive (more positive) — improves stability

### The "Cross-Talk" Check
Whenever you make a significant change to one corner of the car, **re-check the opposite corner**.

In lightweight sports cars like the MX-5:
- Adjusting the front-right can shift weight distribution enough to slightly alter the rear-left
- A toe adjustment on one side can affect the thrust angle
- Large caster changes can indirectly influence camber on the opposite wheel

**Action**: After major adjustments, re-verify the opposite wheel's measurements before finalizing.

---

## The "Weekend Car" Compromise Strategy

For a **weekend car** (not a dedicated race car), your design philosophy should always be **Predictability**.

### Priority Ranking for Weekend Driving

1. **Priority 1: Zero "Cross-Pull" (Perfect Symmetry)**
   - The car must not pull left or right under braking or acceleration
   - Symmetry > hitting absolute targets

2. **Priority 2: Solid Straight-Line Tracking**
   - Prioritize toe and caster for stable high-speed cruising
   - Good straight-line stability makes the car feel planted even on imperfect roads

3. **Priority 3: Peak Cornering Grip**
   - Camber comes last because it's traded for symmetry and stability
   - The car doesn't need race-car grip; it needs predictable, manageable performance

### Adjustment Checklist for Weekend Setup

1. **Set Caster** (L/R Symmetry is key) → both sides match ±0.25°
2. **Set Camber** (Match the "weakest" side) → prioritize L/R symmetry over absolute targets
3. **Set Toe** (The final, precision lock-in) → never adjust after this

---

## Digital Analysis Tools

The `/site/` directory contains a browser-based digital analysis system for visualizing alignment data.

### Running the System

**Start the development server:**
```bash
npm run start
# Server on http://localhost:8080
```

### Key Configuration

**Data Storage:**
- localStorage key: `'mx5-nc1-alignment'`
- Targets: TARGET_CAMBER: −1.1°, TARGET_CASTER: 5.0°

**File Structure:**
```
alignment/
├── js/                     # Business logic
│   ├── report-engine.js    # Core algorithms
│   ├── input-grid.js       # Input rendering
│   ├── chart-builder.js    # Visualization
│   └── ...
├── site/                   # HTML pages & CSS
│   ├── index.html         # Home
│   ├── input.html         # Measurements
│   ├── report.html        # Analysis
│   └── css/shared.css     # Styling
└── tests/integration/     # 33+ tests
```

---

## Factory Specifications

### Body / Chassis Dimensions

- Wheelbase: 2,330 mm
- Overall width: 1,720 mm
- Overall length: 4,020 mm (PRHT) / 4,000 mm (soft-top)
- Overall height: 1,255 mm (PRHT) / 1,240 mm (soft-top)
- Front track: 1,490 mm
- Rear track: 1,495 mm

### Wheel / Hub / Fitment

- Bolt pattern (PCD): 5×114.3
- Center bore: 67.1 mm
- Typical wheel: 17×7 ET55
- Typical tyre size: 205/45R17
- Wheel nut torque: 88–118 Nm
- **Measured on my car** — Wheel diameter (outer edge to outer edge): 469 mm

---

## Safety & Maintenance

### Re-check Alignment After

- Suspension component changes (springs, shocks, control arms, sway bars)
- Significant curb/pothole impacts
- Tire changes to a different size/profile
- Every 12 months (or 10,000 miles) under normal driving

### DIY Alignment Safety

- **Always use wheel cribs** in addition to jacks — a jack can fail under sustained load
- Work on the flattest, most level surface available
- Do not work under a car supported only by jacks
- Perform measurements in daylight or well-lit conditions
- Double-check all measurements before making adjustments
- Tighten all fasteners to OEM spec after adjustment; re-measure after tightening
- Keep all tools organized; do a final check before lowering the car
- Inspect plumb line and strings for damage before use
- Check that cribs are stable and not damaged before placing the car on them

---

**This document provides a foundation for home-based wheel alignment on the Mazda MX-5 NC1. Careful measurement, patience with small adjustment iterations, and diligent cross-checking will yield results comparable to professional alignment.**
