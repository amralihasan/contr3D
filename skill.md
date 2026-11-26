---
name: counter-wood-furniture-3d-app
description: Build and extend a 3D web application for designing custom counter-wood (خشب كونتر) furniture (tables, TV units, shoe racks, cabinets) using React, TypeScript, React Three Fiber, Zustand, and Tailwind CSS with an Arabic RTL touch-friendly UI. Use whenever the user asks to create, edit, debug, or add features to the 3D furniture designer app, 3D board snapping, doors/drawers, cut lists, or counter-wood sheet optimization.
---
# counter-wood-furniture-3d-app

This skill guides the development of a tablet-friendly, Arabic (RTL) 3D furniture design web app tailored specifically for natural counter-wood carpentry.

## When to Use

- Building or extending the 3D furniture design web application (tables, coffee tables, TV units, shoe racks, cabinets)
- Writing React Three Fiber (Three.js) components for boards, snapping, camera controls, or 3D dimension lines
- Managing furniture state, undo/redo history, or LocalStorage persistence with Zustand
- Implementing carpentry logic such as standard counter-wood thicknesses, door/drawer clearances, cut lists, and sheet nesting

## Steps

### 1. Enforce the Tech Stack and Folder Structure

Use the following stack consistently:

- Framework: React + Vite + TypeScript (strict types, no implicit `any`)
- 3D Engine: Three.js via `@react-three/fiber` and `@react-three/drei`
- State Management: Zustand (with clean Undo/Redo history and LocalStorage persistence)
- Styling: Tailwind CSS (Arabic `dir="rtl"`) and `lucide-react` icons

Organize code cleanly so future phases plug in without rewrites:

- `src/types/` for board, material, door/drawer, and project interfaces
- `src/store/` for Zustand stores
- `src/components/canvas/` for 3D scene, boards, snapping, lights, camera controls, and dimension guides
- `src/components/ui/` for touch-friendly RTL toolbars, property panels, presets, and modals
- `src/utils/` for geometry math, snapping calculations, cut list generation, and sheet layout optimization

### 2. Apply Counter-Wood Carpentry Rules

- Work internally in centimeters (cm) consistently, displaying clear Arabic labels.
- Provide quick thickness presets: `1.8 cm` (18 mm) for main counter-wood panels and `0.6 cm` (6 mm) or `0.4 cm` (4 mm) for back panels (ضهر).
- Provide quick part templates: Top (قرصة), Side Panel (جنب), Shelf (رف داخلي), Back Panel (ضهر), Divider (قاطع).
- Account for realistic clearances (خلوص) of 2-3 mm when generating doors (ضلف) and drawers (أدراج).
- Use the standard counter-wood sheet size of `122 x 244 cm` when calculating cut lists (كشف التقطيع) and sheet counts.

### 3. Keep 3D Performance Smooth on Tablets

- Disable `OrbitControls` while `TransformControls` is actively dragging a board (`dragging-changed`) so camera rotation and object movement never conflict.
- Use granular Zustand selectors to prevent unnecessary re-renders of the entire 3D scene when only one board moves.
- Reuse geometries and materials where possible instead of recreating them on every render.

### 4. Implement Accurate Snapping and Controls

- Snap board movement to clean increments (default `0.5 cm`) and clamp boards so they rest cleanly on the floor (`Y = 0`) without sinking below it.
- Implement surface-to-surface snapping (magnetic alignment) between adjacent boards to prevent overlaps or accidental gaps.
- Provide quick camera preset buttons (Front, Side, Top, 3D) and 90-degree rotation buttons on X, Y, Z axes.

### 5. Build an Arabic RTL Touch-First UI

- Set `dir="rtl"` at the root and write all labels, tooltips, and buttons in clear, natural Arabic.
- Keep tap targets at least `44x44px` with comfortable spacing for fingers and stylus pens.
- Keep the 3D canvas occupying most of the viewport, using collapsible panels for properties and part actions.

## Gotchas

- **OrbitControls vs. TransformControls conflict:** Failing to disable OrbitControls on `dragging-changed` makes dragging boards unusable on touchscreens.
- **Center-origin math errors:** Three.js box geometries are centered at `(0, 0, 0)`. Always offset by `height / 2` when placing a board flush on the floor (`Y = 0`) or snapping faces together.
- **Full-scene re-renders:** Passing the entire boards array to every child mesh causes lag on tablets. Subscribe each board component only to its own slice of state.