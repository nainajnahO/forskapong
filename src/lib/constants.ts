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
        description: 'Sam (Största) & David',
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
        description: '8 lag kvar',
        bold: true,
      },
      {
        time: '19:30-19:45',
        title: 'Semi-Final',
        description: '4 lag kvar',
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
      text: 'Fler regler!',
      subtext:
        'Inga trickshots\nBlåsa & slå tillåtet vid studs\n\nRäknas som träffad:\nKopp välter av boll/försvarare\nTappad boll i egen kopp\nFörsvarare nuddar ostudsad boll\n\nFråga domarna vid dispyt',
      position: ['15%', '64%'] as const,
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
    { progress: 0, center: [17.609628, 59.85112] as const, zoom: 12.3, pitch: 22, bearing: 70 },
    { progress: 0.097561, center: [17.621617, 59.845779] as const, zoom: 12.3, pitch: 58, bearing: 20 },
    { progress: 0.191854, center: [17.636039, 59.842292] as const, zoom: 14, pitch: 70, bearing: -1 },
    { progress: 0.27722, center: [17.638297, 59.843025] as const, zoom: 15.17, pitch: 81, bearing: -10 },
    { progress: 0.350391, center: [17.639002, 59.842657] as const, zoom: 16.89, pitch: 85, bearing: -9 },
    { progress: 0.411366, center: [17.637539, 59.84638] as const, zoom: 17.29, pitch: 85, bearing: -9 },
    { progress: 0.463414, center: [17.637044, 59.847715] as const, zoom: 17.55, pitch: 85, bearing: -9 },
    { progress: 0.512195, center: [17.636222, 59.850066] as const, zoom: 17.55, pitch: 85, bearing: -9 },
    { progress: 0.560975, center: [17.635677, 59.85032] as const, zoom: 17.92, pitch: 85, bearing: -17 },
    { progress: 0.609756, center: [17.633728, 59.852406] as const, zoom: 17.92, pitch: 84, bearing: -22 },
    { progress: 0.658536, center: [17.631654, 59.855028] as const, zoom: 17.92, pitch: 84, bearing: -22 },
    { progress: 0.707317, center: [17.631799, 59.856401] as const, zoom: 17.92, pitch: 85, bearing: -10 },
    { progress: 0.756097, center: [17.631436, 59.858574] as const, zoom: 17.92, pitch: 85, bearing: -10 },
    { progress: 0.804878, center: [17.631108, 59.859077] as const, zoom: 17.89, pitch: 81, bearing: -18 },
    { progress: 0.853658, center: [17.630444, 59.859412] as const, zoom: 17.89, pitch: 84, bearing: -36 },
    { progress: 0.902439, center: [17.629533, 59.85922] as const, zoom: 17.89, pitch: 84, bearing: -64 },
    { progress: 0.95122, center: [17.629466, 59.859193] as const, zoom: 18.47, pitch: 82, bearing: -89 },
    { progress: 1, center: [17.629666, 59.858641] as const, zoom: 19, pitch: 85, bearing: -148 },
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

// Tournament structure
/** Number of teams that advance from the Swiss stage into the knockout bracket. */
export const PLAYOFF_CUTOFF = 8;
/**
 * Round number of the first knockout match (quarterfinals); the semifinal is
 * KNOCKOUT_START_ROUND + 1 and the final is KNOCKOUT_START_ROUND + 2. Swiss rounds
 * occupy 1..KNOCKOUT_START_ROUND - 1, so the configurable Swiss round count is capped
 * below this to keep a Swiss round from colliding with the quarterfinals.
 */
export const KNOCKOUT_START_ROUND = 8;

// Sponsors
export const SPONSORS: readonly { name: string; logo: string; href?: string }[] = [
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

// Background
export const FRAMER_BACKGROUND_URL = 'https://incomplete-listening-378233.framer.app' as const;
