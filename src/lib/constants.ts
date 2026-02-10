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
      text: 'Forskåpong',
      subtext: '76:e upplagan',
      position: ['15%', '50%'] as const,
      scrollRange: [0.00, 0.22] as const,
    },
    {
      text: 'Armbågen?',
      subtext: 'Ditt viktigaste verktyg',
      position: ['30%', '70%'] as const,
      scrollRange: [0.22, 0.44] as const,
    },
    {
      text: 'Muggarna',
      subtext: 'Träffa rätt',
      position: ['25%', '30%'] as const,
      scrollRange: [0.55, 0.77] as const,
    },
    {
      text: 'Redo att spela?',
      subtext: '28 februari 2026',
      position: ['45%', '50%'] as const,
      scrollRange: [0.78, 1.00] as const,
    },
  ] as const,
} as const;

// Ticket Information
export const TICKET_INFO = {
  sectionTitle: 'ANMÄLAN',
  heading: 'Anmäl er',
  headingHighlight: 'NU!',
  registrationNote: 'Anmälan sker lagvis (2 personer per lag)',
  registrationUrl: 'https://longdogechallenge.com',
} as const;
