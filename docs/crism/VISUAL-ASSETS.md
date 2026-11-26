# CRISM visual assets

Owner requested school homepage background images, modern animation and relevant imagery across public school pages on 26 November 2026. The supplied CRISM logo remains unaltered on the school site and certificate.

Original AI-created illustrative images, generated with the built-in image tool and compressed to WebP for web delivery:

- `public/assets/crism/bible-library.webp`: open Bible in a sunlit theological library; navy shadows, gold light and uncluttered left side for HTML text.
- `public/assets/crism/learning-together.webp`: diverse adult African and international ministry learners studying Scripture around a seminar table with a female instructor; warm light, modest navy/cream clothing.
- `public/assets/crism/ministry-service.webp`: adult African volunteers with books and supplies walking together at golden hour; compassionate service without invented campus landmarks.

Prompts specified no lettering, logos or watermarks and no depiction as actual enrolled students, faculty or an existing CRISM campus. Images of people are described as illustrative. Original generated PNGs were preserved; web assets use quality 82 WebP without changing the composition. Total additional image transfer is approximately 468 KiB, with lazy loading for supporting scenes and priority loading only for the homepage hero.

Public pages use image-backed titles, school cards, a formation feature and mission background. Animation is restrained: a finite hero drift, entrance effects, scroll reveals and hover movement. Reduced-motion settings disable animation and reveal hiding. Missing IntersectionObserver leaves content visible. Student account, payment and assessment screens retain their functional layout.

Verification: production build and existing 10 CRISM UI tests pass. Desktop homepage, formation section and About page reviewed in preview. Responsive single-column layouts and reduced-motion fallback are implemented; no claim of a physical mobile-device test.

## Distinct school cards

Owner requested replacement of reused card imagery. Six new images generated individually with the built-in image tool now map one-to-one to all school slugs. Prompts requested warm natural editorial photography, navy/cream/gold colors, centered subjects for a 16:9 crop, realistic adult participants and no institutional branding or claims of actual CRISM people/facilities. Scenes: individual Scripture comparison (Biblical Studies), doctrine/history seminar (Theology), preaching practice (Ministry & Pastoral Studies), team planning (Christian Leadership), cross-cultural community outreach (Missions & Evangelism), and compassionate listening to an adult couple (Counselling & Family Ministry).

Final files: `public/assets/crism/school-{school-slug}.webp`, 960×640, WebP quality 80. Original PNGs preserved. Existing homepage, portal and certificate imagery are preserved. Each card has a distinct source and descriptive alt text.
