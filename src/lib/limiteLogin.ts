/**
 * Limite de tentativas de senha do painel. Fica na memória do servidor (o
 * CommentFlow roda numa instância só): 5 erros do mesmo IP em 15 min
 * bloqueiam aquele IP por 15 min; 100 erros no total em 15 min bloqueiam
 * novas tentativas de qualquer IP pelo mesmo tempo. Quem já está logado
 * (cookie válido) não passa por aqui. Módulo puro, testado.
 */
export const JANELA_MS = 15 * 60_000;
export const MAX_POR_IP = 5;
export const MAX_TOTAL = 100;

export type Registro = { falhas: number[] };
export type EstadoLimite = { porIp: Map<string, Registro>; total: number[] };

export const novoEstado = (): EstadoLimite => ({ porIp: new Map(), total: [] });

const recentes = (lista: number[], agora: number) => lista.filter((t) => agora - t < JANELA_MS);

/** Segundos até poder tentar de novo (0 = pode tentar agora). */
export function esperaParaTentar(e: EstadoLimite, ip: string, agora = Date.now()): number {
  e.total = recentes(e.total, agora);
  const r = e.porIp.get(ip);
  const meus = r ? (r.falhas = recentes(r.falhas, agora)) : [];
  const fim = (lista: number[], max: number) => (lista.length >= max ? lista[lista.length - max] + JANELA_MS : 0);
  const ate = Math.max(fim(meus, MAX_POR_IP), fim(e.total, MAX_TOTAL));
  return ate > agora ? Math.ceil((ate - agora) / 1000) : 0;
}

export function registrarFalha(e: EstadoLimite, ip: string, agora = Date.now()) {
  const r = e.porIp.get(ip) ?? { falhas: [] };
  r.falhas = [...recentes(r.falhas, agora), agora];
  e.porIp.set(ip, r);
  e.total = [...recentes(e.total, agora), agora];
  if (e.porIp.size > 5000) for (const [k, v] of e.porIp) if (!recentes(v.falhas, agora).length) e.porIp.delete(k);
}

export function registrarAcerto(e: EstadoLimite, ip: string) {
  e.porIp.delete(ip);
}

/** O IP de quem chama: o primeiro do X-Forwarded-For (Render e túneis põem o real ali). */
export function ipDe(headers: Headers): string {
  return (headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || headers.get("x-real-ip") || "desconhecido";
}

/** Estado único do processo. */
export const limiteLogin: EstadoLimite = novoEstado();
