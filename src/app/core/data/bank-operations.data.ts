import { BankOperation } from '../models';

export const BANK_OPERATIONS: BankOperation[] = [
  { id: 'depositos', icon: 'arrow-down-circle', label: 'Depósitos en cuenta' },
  { id: 'retiros', icon: 'arrow-up-circle', label: 'Retiros de efectivo' },
  { id: 'pago-servicios', icon: 'receipt', label: 'Pago de servicios' },
  { id: 'transferencias', icon: 'send', label: 'Transferencias' },
  { id: 'recargas', icon: 'smartphone', label: 'Recargas y paquetes' },
  { id: 'consultas', icon: 'file-check', label: 'Consulta de saldos' },
];

export const BANK_TRUST_POINTS = [
  { id: 'seguro', icon: 'shield-check', text: 'Operaciones respaldadas y verificadas al instante' },
  { id: 'sin-colas', icon: 'clock', text: 'Sin colas ni traslados a una agencia bancaria' },
  { id: 'atencion', icon: 'user-check', text: 'Atención personalizada por un equipo capacitado' },
];
