import { ContactChannel, SocialLink } from '../models';
import { SITE } from './site.data';

export const CONTACT_CHANNELS: ContactChannel[] = [
  { id: 'whatsapp', icon: 'whatsapp', label: 'WhatsApp', value: SITE.phoneDisplay, href: SITE.whatsappHref },
  { id: 'telefono', icon: 'phone-call', label: 'Teléfono', value: SITE.phoneDisplay, href: SITE.phoneHref },
  { id: 'correo', icon: 'mail', label: 'Correo', value: SITE.email, href: `mailto:${SITE.email}` },
  { id: 'direccion', icon: 'map-pin', label: 'Ubicación', value: SITE.address, href: '#' },
];

export const SOCIAL_LINKS: SocialLink[] = [
  { id: 'facebook', icon: 'facebook', label: 'Facebook', href: '#' },
  { id: 'instagram', icon: 'instagram', label: 'Instagram', href: '#' },
  { id: 'tiktok', icon: 'tiktok', label: 'TikTok', href: '#' },
  { id: 'whatsapp', icon: 'whatsapp', label: 'WhatsApp', href: SITE.whatsappHref },
];

export const CONTACT_INTERESTS: string[] = [
  'Útiles escolares',
  'Fotocopias e impresiones',
  'Agente bancario',
  'Servicios administrativos',
  'Venta de teléfonos',
  'Otro',
];
