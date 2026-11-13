import type { NextRequest } from "next/server";
import { estadoDaInstalacao } from "@/lib/saude";
import { COOKIE_SESSAO, ehLocal, senhaDoPainel, sessaoValida } from "@/lib/sessao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Pública, mas discreta: de fora, só diz se está no ar ({ ok }). Os detalhes
 * (conta conectada, datas, o que falta configurar) aparecem para o próprio
 * computador (o instalador) e para quem está logado no painel.
 */
export async function GET(req: NextRequest) {
  const e = await estadoDaInstalacao();
  const status = e.ok ? 200 : 503;
  const senha = senhaDoPainel();
  const detalhes = ehLocal(req.headers.get("host")) || (senha !== "" && sessaoValida(req.cookies.get(COOKIE_SESSAO)?.value, senha));
  return Response.json(detalhes ? e : { ok: e.ok }, { status });
}
