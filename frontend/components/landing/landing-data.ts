// Datos estáticos de la landing (mockup: template/Univia Landing.html).

export const AUTH_ROUTES = {
  login: "/auth/login",
  signup: "/auth/signup",
} as const;

export const SECCIONES = [
  { id: "inicio", label: "Inicio" },
  { id: "plataforma", label: "Plataforma" },
  { id: "cursos", label: "Mis cursos" },
  { id: "ia", label: "Evaluaciones IA" },
  { id: "nosotros", label: "Nosotros" },
  { id: "equipo", label: "Equipo" },
] as const;

export type Course = {
  code: string;
  name: string;
  ciclo: string;
  credits: number;
  progreso: number;
  done: number;
  total: number;
  next: string;
  grad: string;
  icon: string;
  temas: string[];
};

export const COURSES: Course[] = [
  {
    code: "MB147",
    name: "Cálculo Diferencial",
    ciclo: "Ciclo II",
    credits: 4,
    progreso: 72,
    done: 8,
    total: 11,
    next: "Regla de la cadena",
    grad: "linear-gradient(135deg, #d93340 0%, #7957f1 100%)",
    icon: "ph-function",
    temas: ["Funciones y límites", "Continuidad", "Derivada y reglas", "Regla de la cadena", "Optimización"],
  },
  {
    code: "FI203",
    name: "Física I",
    ciclo: "Ciclo III",
    credits: 5,
    progreso: 48,
    done: 5,
    total: 12,
    next: "Trabajo y energía",
    grad: "linear-gradient(135deg, #d93340 0%, #a6249d 100%)",
    icon: "ph-atom",
    temas: ["Cinemática", "Leyes de Newton", "Trabajo y energía", "Momento lineal", "Rotación"],
  },
  {
    code: "CC131",
    name: "Programación Digital",
    ciclo: "Ciclo II",
    credits: 3,
    progreso: 91,
    done: 10,
    total: 11,
    next: "Estructuras dinámicas",
    grad: "linear-gradient(135deg, #a6249d 0%, #7957f1 100%)",
    icon: "ph-code",
    temas: ["Variables y tipos", "Condicionales", "Bucles", "Arreglos", "Estructuras dinámicas"],
  },
];

export const QUIZ = [
  { q: "Si f(x) = (3x² + 1)⁵, ¿cuál es f ′(x)?", opts: ["5(3x² + 1)⁴", "30x(3x² + 1)⁴", "6x(3x² + 1)⁵", "30x(3x² + 1)⁵"], ok: 1 },
  { q: "El límite de sen(x)/x cuando x → 0 es:", opts: ["0", "1", "∞", "No existe"], ok: 1 },
  { q: "∫ 2x dx es igual a:", opts: ["x² + C", "2 + C", "x²/2 + C", "2x² + C"], ok: 0 },
];

export const TOPICS = ["Derivadas", "Límites", "Integrales"];
export const DIFFS = ["Fácil", "Media", "Difícil"];

export const DASH_NAV = [
  { label: "Mi aprendizaje", icon: "ph-squares-four" },
  { label: "Mi malla", icon: "ph-graduation-cap" },
  { label: "Recursos", icon: "ph-file-text" },
  { label: "Perfil", icon: "ph-user" },
];

export const FOTOS = [
  { id: "lead-foto-1", src: "", cap: "Bienvenida del ciclo", desc: "Cada ciclo abrimos las puertas a nuevos cachimbos que quieren aprender acompañados." },
  { id: "lead-foto-2", src: "", cap: "Taller de IA aplicada", desc: "Sábados de práctica: de la teoría del curso a un proyecto que funciona." },
  { id: "lead-foto-3", src: "", cap: "LEAD Talks", desc: "Egresados UNI volviendo al campus a contar cómo llegaron a donde están." },
  { id: "lead-foto-4", src: "", cap: "Mentorías entre ciclos", desc: "Los de ciclos mayores explican lo que a ellos nadie les explicó a tiempo." },
  { id: "lead-foto-5", src: "", cap: "Hackathon interno", desc: "Dos días construyendo, discutiendo y aprendiendo a fallar rápido." },
  { id: "lead-foto-6", src: "", cap: "El equipo detrás de Univia", desc: "Estudiantes que vivieron el problema y decidieron resolverlo para todos." },
];

export const EQUIPO = [
  {
    id: "eliseo",
    src: "/photos/ELISEO.jpg",
    nombre: "Eliseo Cabello",
    rol: "Co-líder",
    linkedin: "https://www.linkedin.com/in/eliseo-cabello/",
    github: "https://github.com/eliseocabelloa-cmyk",
  },
  {
    id: "renato",
    src: "/photos/RENATO.jpg",
    nombre: "Renato Gutierrez",
    rol: "Co-líder",
    linkedin: "https://www.linkedin.com/in/renato-gutierrez/",
    github: "https://github.com/devrenato56",
  },
  {
    id: "sebastian",
    src: "/photos/SEBASTIAN.jpg",
    nombre: "Sebastian Sandy",
    rol: "Full-Stack Developers",
    linkedin: "https://www.linkedin.com/in/sebastianmartinezquisocala/",
    github: "https://github.com/sebastiansc10",
  },
  {
    id: "luis",
    src: "/photos/LUIS.jpg",
    nombre: "Luis Núñez",
    rol: "Full-Stack Developers",
    linkedin: "https://www.linkedin.com/in/luis-enrique-nr/",
    github: "https://github.com/Luis-Enrique-NR",
  },
  {
    id: "valentina",
    src: "/photos/VALENTINA.jpg",
    nombre: "Valentina Peralta",
    rol: "Full-Stack Developers",
    linkedin: "https://www.linkedin.com/in/alexandra-peralta-gil/",
    github: "https://github.com/valeepg",
  },
];

export const REDES = {
  instagram: "https://www.instagram.com/lead_uni/",
  linkedin: "https://www.linkedin.com/company/lead-uni/posts/?feedView=all",
  tiktok: "https://www.tiktok.com/@lead_uni",
  youtube: "https://www.youtube.com/@LEAD_UNI",
  email: "contacto@leaduni.pe",
};
