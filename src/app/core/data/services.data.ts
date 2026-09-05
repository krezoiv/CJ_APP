import { ServiceItem } from '../models';

export const SERVICES: ServiceItem[] = [
  {
    id: 'utiles-escolares',
    icon: 'book',
    title: 'Útiles escolares',
    description:
      'Todo lo que tu familia necesita para el colegio y la oficina, con marcas confiables y buen precio.',
    tag: 'Más solicitado',
  },
  {
    id: 'fotocopias',
    icon: 'copy',
    title: 'Fotocopias e impresiones',
    description: 'Copias, impresiones, escaneos y anillados listos en minutos, a color o blanco y negro.',
  },
  {
    id: 'agente-bancario',
    icon: 'bank',
    title: 'Agente bancario',
    description: 'Depósitos, retiros, pagos de servicios y transferencias sin hacer cola en el banco.',
    tag: 'Rápido y seguro',
  },
  {
    id: 'servicios-administrativos',
    icon: 'briefcase',
    title: 'Servicios administrativos',
    description: 'Trámites, pago de servicios, recargas y gestiones que te ahorran tiempo y viajes.',
  },
  {
    id: 'venta-telefonos',
    icon: 'phone',
    title: 'Venta de teléfonos',
    description: 'Equipos y accesorios de telefonía con asesoría honesta según lo que realmente necesitas.',
  },
  {
    id: 'papeleria-empresarial',
    icon: 'layers',
    title: 'Papelería empresarial',
    description: 'Insumos de oficina al por mayor para negocios, colegios e instituciones.',
  },
];
