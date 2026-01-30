export type StatusValidade = 'OK' | 'ATENCAO' | 'URGENTE' | 'VENCIDO';

export function calcularStatusValidade(dataValidade: Date | null): StatusValidade {
  if (!dataValidade) return 'OK';

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const validade = new Date(dataValidade);
  validade.setHours(0, 0, 0, 0);

  const diffMs = validade.getTime() - hoje.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias < 0) return 'VENCIDO';
  if (diffDias <= 1) return 'URGENTE';
  if (diffDias <= 5) return 'ATENCAO';
  return 'OK';
}

export function calcularDiasRestantes(dataValidade: Date | null): number | null {
  if (!dataValidade) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const validade = new Date(dataValidade);
  validade.setHours(0, 0, 0, 0);

  return Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}
