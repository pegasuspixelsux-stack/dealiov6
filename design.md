---
name: Ultima High-Octane
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f4'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#444748'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c9c6c5'
  secondary: '#5f5e5c'
  on-secondary: '#ffffff'
  secondary-container: '#e4e2df'
  on-secondary-container: '#656462'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1c1b1a'
  on-tertiary-container: '#868381'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c9c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474646'
  secondary-fixed: '#e4e2df'
  secondary-fixed-dim: '#c8c6c3'
  on-secondary-fixed: '#1b1c1a'
  on-secondary-fixed-variant: '#474745'
  tertiary-fixed: '#e6e2de'
  tertiary-fixed-dim: '#c9c6c3'
  on-tertiary-fixed: '#1c1b1a'
  on-tertiary-fixed-variant: '#484644'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Coolvetica
    fontSize: 64px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Coolvetica
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.1'
  headline-md:
    fontFamily: Coolvetica
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-sm:
    fontFamily: Coolvetica
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.4'
  meta-data:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  margin-desktop: 64px
  margin-mobile: 20px
  gutter: 16px
  section-gap: 120px
  component-padding: 16px
---

## Brand & Style
The design system embodies a premium, high-performance aesthetic tailored for the luxury automotive market. It targets a discerning audience that values both technical precision and bold visual statements.

The style is **Bold / Minimalist**, characterized by a cinematic use of photography, aggressive typography, and a "mechanical" cleanliness. It utilizes high-contrast color blocking—switching between deep charcoal and sterile whites—to create a sense of speed and sophistication. The interface remains intentionally sparse to ensure the vehicles are the primary focus, utilizing large-scale imagery and tight, structured layouts.

## Colors
The palette is rooted in achromatic and metallic tones, reflecting the materials found in high-end automotive engineering.

- **Primary (#0D0D0D):** A deep charcoal black used for core backgrounds, heavy-hitting text, and primary action buttons.
- **Secondary (#D8D6D3):** A warm, light limestone gray used for subtle section backgrounds and providing a softer alternative to pure white.
- **Tertiary (#A6A3A0):** A mid-tone gray utilized for secondary text, metadata, and decorative UI accents like borders or inactive states.
- **Neutral (#FFFFFF):** Pure white, used for high-impact text on dark backgrounds and as a clean canvas for vehicle categories.

The design system toggles between these colors to create distinct sections (e.g., a dark hero section followed by a white category grid).

## Typography
The system uses **Coolvetica** for all headings and branding to provide a custom, high-energy sans-serif feel with tight kerning. For body copy and functional labels, **Inter** is used to ensure maximum legibility and a systematic, technical feel.

Headlines should always be set with tight letter spacing to emphasize the "Coolvetica" character. On mobile, display sizes scale down significantly to maintain readability within the viewport while preserving the bold weight.

## Layout & Spacing
This design system utilizes a **Fixed Grid** approach for content containers on desktop, while transitioning to a **Fluid Grid** for mobile.

- **Desktop:** 12-column grid with a max-width container. Margins are generous (64px) to create an editorial feel.
- **Mobile:** 4-column grid with 20px side margins. 
- **Vertical Rhythm:** Large "Section Gaps" (120px+) separate major content blocks (e.g., Hero to Categories) to ensure the UI feels uncrowded and premium.
- **Density:** Vehicle cards and categories use minimal internal padding to maximize the visual scale of the car imagery.

## Elevation & Depth
The system avoids traditional shadows in favor of **Tonal Layers** and **Glassmorphism**.

- **Depth via Contrast:** Depth is created by stacking dark containers on light backgrounds or vice-versa.
- **Glassmorphism:** Navigation menus and specific overlays (like the mobile menu) use a high-density backdrop blur (20px+) with a semi-transparent dark tint.
- **Ghost Outlines:** Form fields and secondary containers use low-contrast outlines (#D8D6D3) on white backgrounds to maintain a flat, architectural look.
- **Zero Elevation:** Buttons and cards do not use drop shadows; they rely on color fills and clear borders for definition.

## Shapes
The shape language is primarily **Sharp**, favoring a precision-engineered look. 

- **Primary Elements:** Containers, cards, and section blocks use 0px radius for a brutalist, modern feel.
- **Interaction Elements:** Buttons and certain image masks (like the "Book Now" buttons) use a "Soft" radius (4px to 8px) or a full Pill-shape to distinguish them as touch targets.
- **Avatar Elements:** Customer testimonials use a distinct overlapping circular mask to break the rigid grid.

## Components

### Buttons
- **Primary:** Solid #0D0D0D fill with white Inter Bold text. Fully rounded (pill) or 8px radius.
- **Secondary/Ghost:** Transparent with a 1px #0D0D0D border.
- **CTA In-Card:** Small, high-contrast black buttons used specifically for "Book now" actions within white card environments.

### Vehicle Cards
- **Trend Cards:** Large imagery with a 4:5 aspect ratio, text overlays at the top, and a white action bar at the bottom containing the "Book" action and pricing.
- **Category Cards:** Pure white backgrounds with a centered car silhouette, a small "arrow-up-right" icon in the corner, and metadata text at the bottom.

### Inputs & Forms
- Rounded corners (8px).
- 1px border using #D8D6D3.
- Left-aligned icons for Location, Date, and User to enhance scannability.

### Navigation
- **Mobile:** Floating hamburger menu (top right) that triggers a full-screen blurred overlay.
- **Desktop:** Right-aligned text links in Inter, with the logo (Ultima.cars) anchored to the left. Navigation should be pinned to the top with a backdrop blur for transparency.

### Testimonials
- Uses a dual-circle image overlap.
- Large quote text followed by a 5-star rating system using the Accent color (#A6A3A0).