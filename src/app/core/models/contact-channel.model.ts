export interface ContactChannel {
  id: string;
  icon: string;
  label: string;
  value: string;
  /** External link (tel:, https://wa.me/, mailto:, maps URL). */
  href: string;
}

export interface SocialLink {
  id: string;
  icon: string;
  label: string;
  href: string;
}

export interface ContactFormPayload {
  name: string;
  phone: string;
  message: string;
  interest: string;
}
