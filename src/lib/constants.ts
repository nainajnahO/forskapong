// Shared Layout Constants
export const SECTION_PADDING = 'py-16 md:py-24' as const;

// Event Date (used for countdown + scoreboard gate)
export const EVENT_DATE = new Date('2026-06-06T17:00:00+02:00');

// Event Information
export const EVENT_INFO = {
  name: 'TentaFestivalen Beerpong',
  date: '6 Juni 2026',
  time: '17:00',
  location: 'Uppsala, Sweden',
  venue: 'Bryggan Sommarklubb',
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

// Schedule Data
export const SCHEDULE_PHASES = [
  {
    name: 'Anmälan',
    startTime: '17:00',
    events: [
      {
        time: '17:00-17:30',
        title: 'Anmälan',
        description: 'Hämta eran lagkod och enheter.',
      },
      {
        time: '17:30-',
        title: 'Domare',
        description: 'Sam & David',
        italic: true,
      },
    ],
  },
  {
    name: 'Spel',
    startTime: '17:45',
    events: [
      {
        time: '17:45-18:30',
        title: 'Gruppspel',
        description: 'Skriv in din 6-teckens kod för att se era matcher.',
        bold: true,
        type: 'login' as const,
      },
      {
        time: '18:30-19:30',
        title: 'Slutspel',
        description: '',
        bold: true,
      },
      {
        time: '19:30-19:45',
        title: 'Semi-Final',
        description: '',
        bold: true,
      },
      {
        time: '19:45-20:00',
        title: 'Final',
        description: 'Prisutdelningen!!',
        bold: true,
      },
    ],
  },
  {
    name: 'Klubb',
    startTime: '20:00',
    events: [
      {
        time: '20:00-02:00',
        title: 'Klubb',
        description: '',
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
      subtext: '10 minuter per match.',
      position: ['15%', '34%'] as const,
    },
    {
      text: 'Armbågen?',
      subtext: 'Är den verkligen bakom bordet...',
      position: ['30%', '70%'] as const,
    },
    {
      text: 'Muggarna',
      subtext:
        '1 omformation per match\nRedemption tillåtet\nParskott i olika koppar: 2 koppar + ballback\nParskott i samma kopp: 3 koppar + ballback\nStuds: +1 kopp',
      position: ['20%', '15%'] as const,
    },
    {
      text: 'Fler regler! (fråga domarna om dispyt)',
      subtext: 'Inga trickshots\nBlåsa och slå (vid studs) är tillåtet\nVälter kopp pga boll eller försvarare: räknas som träffad\nTappad boll i egen kopp: räknas som träffad\nFörsvarare nudar icke studsad boll över bordet: räknas som träffad',
      position: ['25%', '50%'] as const,
    },
  ] as const,
} as const;

// Venue Map Configuration
// Cinematic 19-waypoint "walking" flyover that traces the route from Studentvägen
// (south-west of central Uppsala) east past Carolina Rediviva, then north along
// the east side of the Snerikes block, curving around to the NW corner with a
// continuous left turn and settling on an overlook of Bryggan Sommarklubb facing
// SW at the pin (the entrance side of the nation).
// Bearing rotates from ~85° (E, along the eastbound leg) all the way to 235° (SW)
// in a smooth ~210° CCW arc.
export const VENUE_MAP_CONFIG = {
  scrollPages: 5,
  mapStyle: 'mapbox://styles/mapbox/dark-v11',
  venue: { lng: 17.630059, lat: 59.858978 },
  cameraWaypoints: [
    { progress: 0, center: [17.6, 59.854] as const, zoom: 12.3, pitch: 22, bearing: 70 },
    {
      progress: 0.055555,
      center: [17.606, 59.8542] as const,
      zoom: 12.8,
      pitch: 28,
      bearing: 74,
    },
    {
      progress: 0.111111,
      center: [17.611, 59.8544] as const,
      zoom: 13.3,
      pitch: 34,
      bearing: 77,
    },
    {
      progress: 0.166667,
      center: [17.6134, 59.8546] as const,
      zoom: 13.9,
      pitch: 40,
      bearing: 79,
    },
    {
      progress: 0.222222,
      center: [17.617, 59.8548] as const,
      zoom: 14.4,
      pitch: 46,
      bearing: 81,
    },
    {
      progress: 0.277778,
      center: [17.621, 59.855] as const,
      zoom: 14.8,
      pitch: 52,
      bearing: 83,
    },
    {
      progress: 0.333333,
      center: [17.625, 59.8552] as const,
      zoom: 15.2,
      pitch: 57,
      bearing: 84,
    },
    {
      progress: 0.388889,
      center: [17.629, 59.8553] as const,
      zoom: 15.5,
      pitch: 61,
      bearing: 82,
    },
    {
      progress: 0.444444,
      center: [17.6311, 59.8555] as const,
      zoom: 15.8,
      pitch: 64,
      bearing: 72,
    },
    {
      progress: 0.5,
      center: [17.6316, 59.8563] as const,
      zoom: 16.1,
      pitch: 66,
      bearing: 55,
    },
    {
      progress: 0.555555,
      center: [17.6322, 59.8572] as const,
      zoom: 16.4,
      pitch: 68,
      bearing: 30,
    },
    {
      progress: 0.611111,
      center: [17.6322, 59.858] as const,
      zoom: 16.7,
      pitch: 69,
      bearing: 10,
    },
    {
      progress: 0.666667,
      center: [17.631187, 59.858722] as const,
      zoom: 17.0,
      pitch: 70,
      bearing: 350,
    },
    {
      progress: 0.722222,
      center: [17.631112, 59.858865] as const,
      zoom: 17.3,
      pitch: 70,
      bearing: 325,
    },
    {
      progress: 0.777778,
      center: [17.631037, 59.859008] as const,
      zoom: 17.5,
      pitch: 68,
      bearing: 300,
    },
    {
      progress: 0.833333,
      center: [17.630823, 59.85908] as const,
      zoom: 17.7,
      pitch: 64,
      bearing: 275,
    },
    {
      progress: 0.888889,
      center: [17.630609, 59.859151] as const,
      zoom: 17.7,
      pitch: 66,
      bearing: 250,
    },
    {
      progress: 0.944444,
      center: [17.629900, 59.858920] as const,
      zoom: 17.7,
      pitch: 64,
      bearing: 240,
    },
    {
      progress: 1.0,
      center: [17.629764, 59.858875] as const,
      zoom: 17.7,
      pitch: 62,
      bearing: 235,
    },
  ],
  annotations: [
    {
      text: 'Hitta hit',
      subtext: 'Uppsala, Sverige',
      scrollRange: [0, 0.35] as const,
      position: ['15%', '50%'] as const,
    },
    {
      text: 'Bryggan',
      subtext: 'Sommarklubb',
      scrollRange: [0.4, 0.75] as const,
      position: ['20%', '30%'] as const,
    },
    {
      text: 'Vi ses här!',
      subtext: '6 Juni 2026' + '\n kl 17:00',
      scrollRange: [0.75, 1.0] as const,
      position: ['25%', '70%'] as const,
    },
  ],
} as const;

// Sponsors
// TODO: add logo files for Monster and Zura under public/sponsors/ and wire up `logo` paths.
export const SPONSORS: readonly { name: string; logo?: string; text?: string; href?: string }[] = [
  {
    name: 'TentaFestivalen',
    logo: '/sponsors/logotyp_transparent_vit_tjock.png',
    href: 'https://www.instagram.com/tentafestivalen/',
  },
  { name: 'Monster', logo: '/sponsors/monster.png', href: 'https://www.instagram.com/monsterenergy/' },
  { name: 'Zura', logo: '/sponsors/zura.png', href: 'https://www.instagram.com/zurasverige/' },
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
