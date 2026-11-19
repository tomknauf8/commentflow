/**
 * Os tipos de gatilho (como na Mandei, os que a API oficial do Instagram
 * deixa fazer). Módulo puro: editor, webhook e motor leem daqui.
 *
 *   comentario      comentário em post/reel com palavra-chave: resposta
 *                   pública + resposta privada (a porta original)
 *   live            comentário numa live com palavra-chave: só resposta
 *                   privada, e só enquanto a live está no ar (regra da Meta)
 *   story_resposta  a pessoa respondeu um story seu. Com palavra-chave ou
 *                   qualquer resposta. Ela escreveu: a conversa já está aberta
 *   story_mencao    a pessoa marcou a sua conta num story. Sem palavra
 *   reacao          reagiu a uma mensagem sua no direct. Sem palavra. A Meta
 *                   não garante que reação abra a conversa: se recusar, para
 *   mensagem        a pessoa mandou uma mensagem no direct (texto livre). Com
 *                   palavra-chave ou qualquer mensagem. No máximo uma vez por
 *                   pessoa a cada 7 dias e nunca no meio de um atendimento
 */
export type TipoGatilho = "comentario" | "live" | "story_resposta" | "story_mencao" | "reacao" | "mensagem";
export const TIPOS: TipoGatilho[] = ["comentario", "live", "story_resposta", "story_mencao", "reacao", "mensagem"];

export const GATILHOS: Record<TipoGatilho, {
  rotulo: string;
  descricao: string;
  /** obrigatorias = sem palavra não dispara; opcionais = pode valer qualquer texto; nenhuma = não há texto */
  palavras: "obrigatorias" | "opcionais" | "nenhuma";
  /** escolhe em qual post vale */
  post: boolean;
  /** tem resposta pública embaixo do comentário */
  publica: boolean;
  /** a primeira mensagem é a resposta privada a um comentário (um envio só) */
  respostaPrivada: boolean;
}> = {
  comentario: { rotulo: "Comentário no post", descricao: "Quando alguém comenta num post ou reel seu.", palavras: "obrigatorias", post: true, publica: true, respostaPrivada: true },
  live: { rotulo: "Comentário na live", descricao: "Quando alguém comenta na sua live. Só vale com a live no ar.", palavras: "obrigatorias", post: false, publica: false, respostaPrivada: true },
  story_resposta: { rotulo: "Resposta ao story", descricao: "Quando alguém responde um story seu no direct.", palavras: "opcionais", post: false, publica: false, respostaPrivada: false },
  story_mencao: { rotulo: "Menção no story", descricao: "Quando alguém marca a sua conta num story.", palavras: "nenhuma", post: false, publica: false, respostaPrivada: false },
  mensagem: { rotulo: "Mensagem no direct", descricao: "Quando alguém manda uma mensagem para a sua conta no direct. Dispara no máximo uma vez por pessoa a cada 7 dias.", palavras: "opcionais", post: false, publica: false, respostaPrivada: false },
  reacao: { rotulo: "Reação no direct", descricao: "Quando alguém reage a uma mensagem sua no direct.", palavras: "nenhuma", post: false, publica: false, respostaPrivada: false },
};

export const tipoDe = (t: string | null | undefined): TipoGatilho => (t && (TIPOS as string[]).includes(t) ? (t as TipoGatilho) : "comentario");

export const JANELA_MENSAGEM_DIAS = 7;

/** Tem letra ou número? Mensagem só de emoji, pontuação ou espaço não conta como conversa. */
export const temConteudo = (texto: string) => /[\p{L}\p{N}]/u.test(texto);

/**
 * Regras anti-incômodo do gatilho "mensagem no direct" (módulo puro, testado).
 * Sempre: não aborda quem está em atendimento, quem você respondeu à mão nas
 * últimas 24 h, quem está no meio de outra automação, nem quem já recebeu esta
 * abordagem nos últimos 7 dias. Na automação de "qualquer mensagem", além disso,
 * só aborda quem escreve pela primeira vez (contato novo) e com texto de verdade:
 * amigos, clientes e quem manda só um emoji ficam de fora.
 */
export function podeAbordarNoDirect(s: {
  emAtendimento: boolean;
  ultimaRespostaManual: Date | null;
  execucaoAtiva: boolean;
  ultimoDisparo: Date | null;
  qualquerMensagem?: boolean;
  contatoConhecido?: boolean;
  texto?: string;
}, agora = new Date()): boolean {
  const horas = (d: Date) => (agora.getTime() - d.getTime()) / 3_600_000;
  if (s.emAtendimento || s.execucaoAtiva) return false;
  if (s.ultimaRespostaManual && horas(s.ultimaRespostaManual) < 24) return false;
  if (s.ultimoDisparo && horas(s.ultimoDisparo) < JANELA_MENSAGEM_DIAS * 24) return false;
  if (s.qualquerMensagem && (s.contatoConhecido || !temConteudo(s.texto ?? ""))) return false;
  return true;
}
