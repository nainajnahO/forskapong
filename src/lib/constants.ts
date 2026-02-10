// Shared Layout Constants
export const SECTION_PADDING = "py-16 md:py-24" as const;

// Event Information
export const EVENT_INFO = {
  name: 'Forskåpong 2026',
  edition: '76:e',
  date: '28 February 2026',
  time: '19:00',
  location: 'Uppsala, Sweden',
  venue: 'Bridgens Hus',
} as const;

// Navigation Links
export const NAV_LINKS = [
  { label: 'Om', href: '#about' },
  { label: 'Schema', href: '#schedule' },
  { label: 'Sponsorer', href: '#sponsors' },
  { label: 'Plats', href: '#venue' },
] as const;

// Social Media Links
export const SOCIAL_LINKS = {
  facebook: '#facebook',
  instagram: '#instagram',
  linkedin: '#linkedin',
  twitter: '#twitter',
} as const;

// Footer Links
export const FOOTER_LINKS = [
  { label: 'Om', href: '#about' },
  { label: 'Schema', href: '#schedule' },
  { label: 'Sponsorer', href: '#sponsors' },
  { label: 'Kontakt', href: '#contact' },
] as const;

// Hero Section
export const HERO_ROTATING_WORDS = ['Enheter', 'Bra kast', 'Tofflor'] as const;

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
    'Varje lag tävlar i spännande matcher genom kvällen, med en kommentator som håller stämningen på topp. Oavsett om du är nybörjare eller erfaren spelare, garanterar vi en oförglömlig upplevelse med vänner och kollegor.',
} as const;

// Schedule Data
export const SCHEDULE_PHASES = [
  {
    name: 'Öppnar',
    startTime: '19:00',
    events: [
      {
        time: '19:00-19:30',
        title: 'Mingel',
        description: 'Dörrna öppnas och alla är välkommna till skönt häng!',
      },
      {
        time: '19:30',
        title: 'Välkomstceremoni',
        description: 'Projektledarna hälsar alla varmt välkommna.',
        italic: true,
        speakers: [
          { name: '(W)ebb24', title: 'CEO, Hjälpis' },
          { name: '(W)ebb25', title: 'CTO, Rolln\' Solution' },
        ],
      },
    ],
  },
  {
    name: 'Avspark',
    startTime: '19:50',
    events: [
      {
        time: '19:50',
        title: 'Skotten i Bridgens Hus',
        description: 'Forskåpongen går av stapeln för 76:e gången.',
        bold: true,
      },
      {
        time: '19:50-21:30',
        title: 'Spelchemat',
        description:
          'Schemat för era matcher hittar ni här: https://longdogechallenge.com\nKommentatorn för kvällen är ingen mindre än vår kära Aria Assadi.',
        bold: true,
        speakers: [{ name: 'Aria Assadi', title: 'Sportkommentator' }],
      },
    ],
  },
  {
    name: 'Utgång',
    startTime: '22:00',
    events: [
      {
        time: '22:00-22:15',
        title: 'Prisutdelning',
        description: '🤫🤫',
        bold: true,
      },
      {
        time: '22:30',
        title: 'Utvisning',
        description: 'Förbud att stanna kvar i Bridgens. Vi drar till gähda istället.',
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
      position: [2.00, 2.00, 4.00] as const,
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
      subtext: '10 minuter per match.',
      position: ['15%', '50%'] as const,
    },
    {
      text: 'Armbågen?',
      subtext: 'Är den verkligen bakom bordet...',
      position: ['30%', '70%'] as const,
    },
    {
      text: 'Muggarna',
      subtext: '1 omformation per match.' +
          '\n-Studsprick? 2 bort'  +
          '\n-Parprick? 3 bort',
      position: ['25%', '30%'] as const,
    },
    {
      text: 'Redo att spela?',
      subtext: '28 februari 2026',
      position: ['45%', '50%'] as const,
    },
  ] as const,
} as const;

// Venue Map Configuration
export const VENUE_MAP_CONFIG = {
  scrollPages: 5,
  mapStyle: 'mapbox://styles/mapbox/dark-v11',
  venue: { lng: 17.648043, lat: 59.837987 },
  cameraWaypoints: [
    { progress: 0,          center: [17.634663, 59.845666] as const, zoom: 12,   pitch: 24, bearing: 17 },
    { progress: 0.055555,   center: [17.633594, 59.849386] as const, zoom: 12.8, pitch: 30, bearing: 45 },
    { progress: 0.111111,   center: [17.632487, 59.851849] as const, zoom: 13.6, pitch: 48, bearing: 94 },
    { progress: 0.166667,   center: [17.637732, 59.849341] as const, zoom: 15.1, pitch: 59, bearing: 119 },
    { progress: 0.222222,   center: [17.638425, 59.84686] as const,  zoom: 15.9, pitch: 63, bearing: 152 },
    { progress: 0.277778,   center: [17.637819, 59.844697] as const, zoom: 16.9, pitch: 76, bearing: 170 },
    { progress: 0.333333,   center: [17.638519, 59.842928] as const, zoom: 17.4, pitch: 80, bearing: 171 },
    { progress: 0.388889,   center: [17.639496, 59.840328] as const, zoom: 17.7, pitch: 80, bearing: 171 },
    { progress: 0.444444,   center: [17.640123, 59.838603] as const, zoom: 17.7, pitch: 80, bearing: 171 },
    { progress: 0.5,        center: [17.644568, 59.839801] as const, zoom: 17.7, pitch: 83, bearing: 77 },
    { progress: 0.555555,   center: [17.647874, 59.840329] as const, zoom: 17.7, pitch: 83, bearing: 77 },
    { progress: 0.611111,   center: [17.648445, 59.839723] as const, zoom: 17.7, pitch: 82, bearing: 133 },
    { progress: 0.666667,   center: [17.648402, 59.83919] as const,  zoom: 18,   pitch: 84, bearing: 166 },
    { progress: 0.722222,   center: [17.648867, 59.83844] as const,  zoom: 18,   pitch: 85, bearing: 163 },
    { progress: 0.777778,   center: [17.648706, 59.837716] as const, zoom: 18,   pitch: 84, bearing: 179 },
    { progress: 0.833333,   center: [17.648527, 59.837459] as const, zoom: 18.4, pitch: 84, bearing: -162 },
    { progress: 0.888889,   center: [17.647161, 59.837425] as const, zoom: 18.1, pitch: 84, bearing: -128 },
    { progress: 0.944444,   center: [17.646647, 59.837886] as const, zoom: 18.1, pitch: 83, bearing: -98 },
    { progress: 1.0,        center: [17.647362, 59.837941] as const, zoom: 19,   pitch: 83, bearing: -98 },
  ],
  annotations: [
    { text: 'Hitta hit', subtext: 'Uppsala, Sverige', scrollRange: [0, 0.35] as const, position: ['15%', '50%'] as const },
    { text: 'Ångström', subtext: 'Mikrorummet', scrollRange: [0.4, 0.75] as const, position: ['20%', '30%'] as const },
    { text: 'Vi ses här!', subtext: '31 Mars 2026' + '\n kl 18:00', scrollRange: [0.75, 1.0] as const, position: ['25%', '70%'] as const },
  ],
} as const;

// Ticket Information
export const TICKET_INFO = {
  sectionTitle: 'ANMÄLAN',
  heading: 'Anmäl er',
  headingHighlight: 'NU!',
  registrationNote: 'Anmälan sker lagvis (2 personer per lag)',
  registrationUrl: 'https://longdogechallenge.com',
} as const;
