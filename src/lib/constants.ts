// Shared Layout Constants
export const SECTION_PADDING = 'py-16 md:py-24' as const;

// Event Date (used for countdown + scoreboard gate)
export const EVENT_DATE = new Date('2026-03-31T18:00:00');

// Event Information
export const EVENT_INFO = {
  name: 'Forskåpong 2026',
  edition: '76:e',
  date: '31 Mars 2026',
  time: '18:00',
  location: 'Uppsala, Sweden',
  venue: 'Bridgens Hus',
} as const;

// Navigation Links
export const NAV_LINKS = [
  { label: 'Regler', href: '#showcase' },
  { label: 'Om', href: '#about' },
  { label: 'Schema', href: '#schedule-v4' },
  { label: 'Plats', href: '#venue' },
] as const;

// Footer Links
export const FOOTER_LINKS = [
  { label: 'Om', href: '#about' },
  { label: 'Schema', href: '#schedule' },
  { label: 'Kontakt', href: '#contact' },
] as const;

// Hero Section
export const HERO_ROTATING_WORDS = ['Enheter', 'Bra kast', 'Armbåge', '99 kr'] as const;

// Attendee Categories
export const ATTENDEE_CATEGORIES = [
  { name: 'Forskå', highlighted: true },
  { name: 'Gamla Forskå', highlighted: false },
  { name: 'Uncs', highlighted: false },
  { name: 'Prehistorical Uncs', highlighted: false },
] as const;

// About Section
export const ABOUT_CONTENT = {
  title: 'Årets Mest Hypade',
  titleHighlight: 'Event',
  description1:
    'Forskåpong är en årlig beer pong-turnering som samlar forskåare från när och fjärran för en kväll fylld av tävling, gemenskap och glädje. Detta är 76:e gången vi arrangerar detta legendariska event som har blivit en älskad tradition.',
  description2:
    'Varje lag tävlar i spännande matcher genom kvällen, med en kommentator som håller stämningen på topp. Oavsett om du är nybörjare eller erfaren spelare, garanterar vi en oförglömlig upplevelse.',
} as const;

// Schedule Data
export const SCHEDULE_PHASES = [
  {
    name: 'Öppnar',
    startTime: '18:00',
    events: [
      {
        time: '18:00-18:40',
        title: 'Mingel',
        description: 'Dörrna öppnas och alla är välkommna till skönt häng!',
      },
      {
        time: '18:45',
        title: 'Välkomstceremoni',
        description: 'Projektledarna hälsar alla varmt välkommna.',
        italic: true,
        speakers: [
          { name: '(W)ebb24', title: 'CEO, Hjälpis' },
          { name: '(W)ebb25', title: "CTO, Hjälpis" },
        ],
      },
    ],
  },
  {
    name: 'Avspark',
    startTime: '18:55',
    events: [
      {
        time: '18:55',
        title: 'Skotten i Mikrorummet',
        description: 'Forskåpongen går av stapeln för 76:e gången.',
        bold: true,
      },
      {
        time: '19:00-21:30',
        title: 'Spelchemat',
        description:
          'Skriv in din 6-teckens kod för att se era matcher.',
        bold: true,
        type: 'login' as const,
        speakers: [{ name: 'Aria Assadi', title: 'Sportkommentator' }],
      },
    ],
  },
  {
    name: 'Utgång',
    startTime: '21:40',
    events: [
      {
        time: '21:45-22:00',
        title: 'Prisutdelning',
        description: '',
        bold: true,
      },
      {
        time: '22:30',
        title: 'Utvisning',
        description: 'Förbud att stanna kvar. Vi drar till gähda istället.',
        italic: true,
      },
    ],
  },
] as const;

// 3D Showcase Camera Journey Configuration
export const SHOWCASE_CONFIG = {
  modelPath: '/models/beerpong.glb',
  scrollPages: 4,
  // Camera waypoints: scroll progress → camera position + lookAt target
  // Model: center(0, 0.23, 0.03) size(1.05 wide, 1.40 tall, 4.04 deep along Z)
  cameraWaypoints: [
    {
      progress: 0.0,
      position: [2.0, 2.0, 4.0] as const,
      lookAt: [0, 0.23, 0] as const,
    },
    {
      progress: 0.33,
      position: [-0.17, 0.98, 2.04] as const,
      lookAt: [0, 0.23, 0] as const,
    },
    {
      progress: 0.66,
      position: [-0.32, 0.49, -1.96] as const,
      lookAt: [0, 0.23, 0] as const,
    },
    {
      progress: 1.0,
      position: [2.46, 0.87, -3.29] as const,
      lookAt: [0, 0.23, 0] as const,
    },
  ] as const,
  annotations: [
    {
      text: 'Klara, färdiga, gå!',
      subtext: '7 minuter per match.',
      position: ['15%', '34%'] as const,
    },
    {
      text: 'Armbågen?',
      subtext: 'Är den verkligen bakom bordet...',
      position: ['30%', '70%'] as const,
    },
    {
      text: 'Muggarna',
      subtext: '1 omformation per match.\nRedemption tillåtet.\n-Studsprick? 2 bort\n-Parprick? 3 bort',
      position: ['20%', '15%'] as const,
    },
    {
      text: 'Redo att spela?',
      subtext: 'Vi ses den\n31:a Mars 2026',
      position: ['25%', '50%'] as const,
    },
  ] as const,
} as const;

// Venue Map Configuration
export const VENUE_MAP_CONFIG = {
  scrollPages: 5,
  mapStyle: 'mapbox://styles/mapbox/dark-v11',
  venue: { lng: 17.648043, lat: 59.837987 },
  cameraWaypoints: [
    { progress: 0, center: [17.634663, 59.845666] as const, zoom: 12, pitch: 24, bearing: 17 },
    {
      progress: 0.055555,
      center: [17.633594, 59.849386] as const,
      zoom: 12.8,
      pitch: 30,
      bearing: 45,
    },
    {
      progress: 0.111111,
      center: [17.632487, 59.851849] as const,
      zoom: 13.6,
      pitch: 48,
      bearing: 94,
    },
    {
      progress: 0.166667,
      center: [17.637732, 59.849341] as const,
      zoom: 15.1,
      pitch: 59,
      bearing: 119,
    },
    {
      progress: 0.222222,
      center: [17.638425, 59.84686] as const,
      zoom: 15.9,
      pitch: 63,
      bearing: 152,
    },
    {
      progress: 0.277778,
      center: [17.637819, 59.844697] as const,
      zoom: 16.9,
      pitch: 76,
      bearing: 170,
    },
    {
      progress: 0.333333,
      center: [17.638519, 59.842928] as const,
      zoom: 17.4,
      pitch: 80,
      bearing: 171,
    },
    {
      progress: 0.388889,
      center: [17.639496, 59.840328] as const,
      zoom: 17.7,
      pitch: 80,
      bearing: 171,
    },
    {
      progress: 0.444444,
      center: [17.640123, 59.838603] as const,
      zoom: 17.7,
      pitch: 80,
      bearing: 171,
    },
    { progress: 0.5, center: [17.644568, 59.839801] as const, zoom: 17.7, pitch: 83, bearing: 77 },
    {
      progress: 0.555555,
      center: [17.647874, 59.840329] as const,
      zoom: 17.7,
      pitch: 83,
      bearing: 77,
    },
    {
      progress: 0.611111,
      center: [17.648445, 59.839723] as const,
      zoom: 17.7,
      pitch: 82,
      bearing: 133,
    },
    {
      progress: 0.666667,
      center: [17.648402, 59.83919] as const,
      zoom: 18,
      pitch: 84,
      bearing: 166,
    },
    {
      progress: 0.722222,
      center: [17.648867, 59.83844] as const,
      zoom: 18,
      pitch: 85,
      bearing: 163,
    },
    {
      progress: 0.777778,
      center: [17.648706, 59.837716] as const,
      zoom: 18,
      pitch: 84,
      bearing: 179,
    },
    {
      progress: 0.833333,
      center: [17.648527, 59.837459] as const,
      zoom: 18.4,
      pitch: 84,
      bearing: -162,
    },
    {
      progress: 0.888889,
      center: [17.647161, 59.837425] as const,
      zoom: 18.1,
      pitch: 84,
      bearing: -128,
    },
    {
      progress: 0.944444,
      center: [17.646647, 59.837886] as const,
      zoom: 18.1,
      pitch: 83,
      bearing: -98,
    },
    { progress: 1.0, center: [17.647362, 59.837941] as const, zoom: 19, pitch: 83, bearing: -98 },
  ],
  annotations: [
    {
      text: 'Hitta hit',
      subtext: 'Uppsala, Sverige',
      scrollRange: [0, 0.35] as const,
      position: ['15%', '50%'] as const,
    },
    {
      text: 'Ångström',
      subtext: 'Mikrorummet',
      scrollRange: [0.4, 0.75] as const,
      position: ['20%', '30%'] as const,
    },
    {
      text: 'Vi ses här!',
      subtext: '31 Mars 2026' + '\n kl 18:00',
      scrollRange: [0.75, 1.0] as const,
      position: ['25%', '70%'] as const,
    },
  ],
} as const;

// Sponsors
export const SPONSORS: readonly { name: string; logo?: string; text?: string; href?: string }[] = [
  { name: 'CTF', logo: '/sponsors/logotyp_CTF_transparent_inverterad.PNG', href: 'https://www.instagram.com/tentafestivalen/' },
  { name: 'Impact Solution', logo: '/sponsors/logo-vit-text-trans.png.webp', href: 'https://impactsolution.se' },
];

// Navbar Responsive Offsets (rem)
export const NAV_RESPONSIVE_OFFSETS = {
  desktop: 9.5, // >= 1024px
  tablet: 8, // >= 768px
  phoneLg: 7, // >= 640px
  phoneSm: 6.5, // < 640px
} as const;

// ExplodedView Title Animation
export const EXPLODED_VIEW_TITLE = {
  fadeStart: 0.93,
  fadeEnd: 0.99,
  yOffset: 20,
} as const;

// Background
export const FRAMER_BACKGROUND_URL = 'https://incomplete-listening-378233.framer.app' as const;

// Swish Payment
export const SWISH_NUMBER = '0736990412' as const;
export const SWISH_AMOUNT = 99 as const;

const SWISH_PAYEE = SWISH_NUMBER.replace(/^0/, '+46');

export function buildSwishUrl(code: string): string {
  const data = {
    version: 1,
    payee: { value: SWISH_PAYEE },
    amount: { value: SWISH_AMOUNT },
    message: { value: `Forskåpong - ${code.slice(0, 3)}.${code.slice(3)}`, editable: true },
  };
  return `swish://payment?data=${encodeURIComponent(JSON.stringify(data))}`;
}

// Hall of Fame Avatars
export const HALL_OF_FAME_AVATARS = [
  {
    src: '/avatar-forskarl.webp',
    fallback: 'FK',
    tooltip: 'Forskarl',
  },
  {
    src: '/avatar-fest.webp',
    fallback: 'FE',
    tooltip: 'Fest',
  },
  {
    src: '/avatar-hall.webp',
    fallback: 'HÅ',
    tooltip: 'Håll',
  },
] as const;
