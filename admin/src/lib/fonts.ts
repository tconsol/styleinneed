// 100+ Google Font families for the appearance picker. All support 400/700
// weights so the loader can request them safely.
export const FONT_OPTIONS: string[] = [
  'Inter', 'Poppins', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Nunito', 'Nunito Sans',
  'Raleway', 'Work Sans', 'Rubik', 'Mulish', 'Manrope', 'DM Sans', 'Karla', 'Quicksand',
  'Josefin Sans', 'Source Sans 3', 'Barlow', 'Barlow Condensed', 'Oswald', 'PT Sans', 'PT Serif',
  'Playfair Display', 'Merriweather', 'Lora', 'Roboto Slab', 'Bitter', 'Arvo', 'Cormorant Garamond',
  'Cormorant', 'EB Garamond', 'Libre Baskerville', 'Crimson Text', 'Crimson Pro', 'Spectral',
  'Source Serif 4', 'Noto Serif', 'Noto Sans', 'Cardo', 'Vollkorn', 'Zilla Slab', 'Domine',
  'Frank Ruhl Libre', 'Bodoni Moda', 'DM Serif Display', 'DM Serif Text', 'Prata', 'Marcellus',
  'Cinzel', 'Fraunces', 'Newsreader', 'Petrona', 'Piazzolla',
  'Montserrat Alternates', 'Archivo', 'Archivo Narrow', 'Archivo Black', 'Sora', 'Space Grotesk',
  'Outfit', 'Lexend', 'Lexend Deca', 'Red Hat Display', 'Red Hat Text', 'Public Sans', 'Figtree',
  'Plus Jakarta Sans', 'Epilogue', 'Urbanist', 'Albert Sans', 'Onest', 'Hanken Grotesk',
  'Schibsted Grotesk', 'Instrument Sans', 'Bricolage Grotesque', 'Unbounded', 'Gabarito',
  'Titillium Web', 'Cabin', 'Fira Sans', 'Fira Sans Condensed', 'Hind', 'Assistant', 'Heebo',
  'Signika', 'Signika Negative', 'Overpass', 'Exo', 'Exo 2', 'Kanit', 'Prompt', 'Chivo',
  'Saira', 'Saira Condensed', 'Encode Sans', 'Jost', 'Comfortaa', 'Baloo 2', 'Fredoka',
  'Bricolage', 'Onest',
  'Playball', 'Pacifico', 'Lobster', 'Caveat', 'Sacramento', 'Dancing Script', 'Great Vibes',
  'Satisfy', 'Cookie', 'Kaushan Script', 'Yellowtail', 'Parisienne', 'Allura', 'Tangerine',
  'Abril Fatface', 'Bebas Neue', 'Anton', 'Alfa Slab One', 'Righteous', 'Passion One', 'Teko',
  'Staatliches', 'Fjalla One', 'Yeseva One', 'Sacramento', 'Rozha One', 'Philosopher',
  'Space Mono', 'JetBrains Mono', 'IBM Plex Sans', 'IBM Plex Serif', 'IBM Plex Mono',
  'Roboto Mono', 'Source Code Pro', 'Fira Code',
];

// De-dup while preserving order (a couple names repeat across groups above).
export const FONTS: string[] = Array.from(new Set(FONT_OPTIONS));
