import { NavLink } from '../models';

export const NAV_LINKS: NavLink[] = [
  { label: 'Inicio', path: '/', fragment: 'inicio' },
  { label: 'Quiénes somos', path: '/', fragment: 'quienes-somos' },
  { label: 'Agentes bancarios', path: '/', fragment: 'agentes-bancarios' },
  { label: 'Contacto', path: '/', fragment: 'contacto' },
  { label: 'Catálogo', path: '/catalogo' },
];

export const NAV_LOGIN_LINK: NavLink = { label: 'Iniciar sesión', path: '/login' };
export const NAV_CTA_LINK: NavLink = { label: 'Ver catálogo', path: '/catalogo', isCta: true };
