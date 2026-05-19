# GIIP Images Directory

This directory contains all images used in the GIIP (Global Innovation and Intellectual Property) platform frontend.

## Directory Structure

```
images/
├── README.md                                                                    # This file
├── features/                                                                   # Feature section images (not currently used)
│   ├── innovation.jpg                                                         # Innovation-themed image
│   ├── research.jpg                                                          # Research-themed image
│   └── collaboration.jpg                                                     # Collaboration-themed image
├── hero/                                                                      # Hero section background images
│   ├── hero-bg.jpg                                                          # General hero background (space/earth theme)
│   ├── innovation-bg.jpg                                                    # Innovation-themed background (used on homepage)
│   └── tech-network-bg.jpg                                                  # Technology/network background (used on about page)
├── icons/                                                                     # Icon images
│   └── giip-logo.png                                                        # Main GIIP logo (used in header, footer, favicon)
├── speakers/                                                                  # Speaker photos (32 speaker images)
│   ├── Alex Wang Professor of Practice,Fudan University.jpeg
│   ├── Bernard Y. Yeung SUSTech and NUS.jpeg
│   ├── Boris Armstrong Qi Chief Representative, IPR Daily Japan Center.jpeg
│   └── ... (29 more speaker images)
└── sponsors/                                                                  # Sponsor/partner organization logos
    ├── SCHOOL OF MANAGEMENT FUDAN UNIVERSITY.jpg                            # Fudan University School of Management
    ├── Peking University.png                                                 # Peking University
    ├── Washington University in St.Louis MCDONNELL INTERNATIONAL SCHOLARS ACADEMY.jpeg  # McDonnell International Scholars Academy
    ├── WashU olin Business School.jpeg                                       # WashU Olin Business School
    └── ZHEJIANG University.jpg                                               # Zhejiang University
```

## Image Requirements

### Logo Images
- **icons/giip-logo.png**: Main GIIP logo
  - Format: PNG with transparency
  - Recommended size: 200x80px
  - Usage: Header navigation, footer, favicon base

### Hero Section
Hero background images are now actively used across multiple pages:

- **innovation-bg.jpg**: Innovation-themed background
  - Format: JPG
  - Size: 1920x1080px
  - Theme: Innovation, lightbulb, creativity
  - Usage: Homepage hero section
  - Source: Unsplash

- **tech-network-bg.jpg**: Technology/network background
  - Format: JPG
  - Size: 1920x1080px
  - Theme: Technology, networks, connectivity
  - Usage: About page hero section
  - Source: Unsplash

- **hero-bg.jpg**: General hero background
  - Format: JPG
  - Size: 1920x1080px
  - Theme: Space, earth, global perspective
  - Usage: Events page hero section
  - Source: Unsplash

All hero images work well with white text overlay and include a gradient overlay for better readability.

### Feature Images
- **innovation.jpg**: Innovation feature image
  - Format: JPG
  - Recommended size: 400x300px
  - Theme: Innovation, patents, new ideas

- **research.jpg**: Research feature image
  - Format: JPG
  - Recommended size: 400x300px
  - Theme: Academic research, publications, studies

- **collaboration.jpg**: Collaboration feature image
  - Format: JPG
  - Recommended size: 400x300px
  - Theme: Partnership, teamwork, global cooperation

### Social Media
- Currently using the main logo for Open Graph images
- For better social media sharing, consider creating a dedicated og-image.jpg:
  - Format: JPG
  - Required size: 1200x630px
  - Should include GIIP branding and key messaging
  - Used for social media sharing (Facebook, Twitter, LinkedIn)

### Sponsor Logos
All sponsor logos should be:
- High quality and professional
- Consistent height when displayed (100-120px)
- Transparent background preferred
- Official logos from respective institutions

Current sponsor logos:
- SCHOOL OF MANAGEMENT FUDAN UNIVERSITY.jpg
- Peking University.png
- Washington University in St.Louis MCDONNELL INTERNATIONAL SCHOLARS ACADEMY.jpeg
- WashU olin Business School.jpeg
- ZHEJIANG University.jpg

### Speaker Photos
32 speaker photos are available in the speakers/ directory, named with the format:
"[Name] [Title/Institution].jpeg"

## Usage in Code

All images are referenced using absolute paths from the public directory:

```jsx
// Logo usage
<img src="/images/icons/giip-logo.png" alt="GIIP Logo" />

// Sponsor logos
<img src="/images/sponsors/SCHOOL OF MANAGEMENT FUDAN UNIVERSITY.jpg" alt="Fudan University" />
<img src="/images/sponsors/Peking University.png" alt="Peking University" />

// Speaker photos
<img src="/images/speakers/Alex Wang Professor of Practice,Fudan University.jpeg" alt="Alex Wang" />

// Hero background images (actively used)
<HeroSection title="Page Title" backgroundImage="innovation" />
<HeroSection title="About" backgroundImage="tech-network" />

// Feature images (available but not currently used)
<img src="/images/features/innovation.jpg" alt="Innovation" />
```

## Optimization Guidelines

1. **File Size**: Keep images optimized for web
   - JPG: Use for photos, aim for <200KB
   - PNG: Use for logos with transparency, aim for <100KB

2. **Responsive**: Provide high-resolution images that scale well

3. **Alt Text**: Always include descriptive alt text for accessibility

4. **Loading**: Consider lazy loading for non-critical images

## Replacement Instructions

To replace placeholder images with actual images:

1. Prepare images according to the specifications above
2. Replace the placeholder files with the same filename
3. Ensure file formats match (JPG/PNG as specified)
4. Test the display across different screen sizes
5. Verify accessibility with screen readers

## Notes

- Currently using FontAwesome icons instead of image icons
- All placeholder files should be replaced with actual images
- Maintain consistent branding across all images
- Consider creating a favicon.ico from the main logo