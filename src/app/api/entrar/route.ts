import type { NextRequest } from "next/server";
import { COOKIE_SESSAO, DIAS_SESSAO, criarSessao, senhaConfere, senhaDoPainel } from "@/lib/sessao";
import { esperaParaTentar, ipDe, limiteLogin, registrarAcerto, registrarFalha } from "@/lib/limiteLogin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Só volta para dentro do painel, nunca para outro site. */
const destino = (v: FormDataEntryValue | null) => (typeof v === "string" && v.startsWith("/app") && !v.startsWith("//") ? v : "/app");

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const volta = destino(form?.get("volta") ?? null);
  const digitada = String(form?.get("senha") ?? "");
  const senha = senhaDoPainel();
  const ip = ipDe(req.headers);

  // muitas tentativas erradas: nem confere a senha até passar o bloqueio
  const espera = esperaParaTentar(limiteLogin, ip);
  if (espera > 0) {
    return new Response(null, { status: 303, headers: { Location: `/entrar?erro=bloqueado&min=${Math.ceil(espera / 60)}&volta=${encodeURIComponent(volta)}` } });
  }

  if (!senha || !senhaConfere(digitada, senha)) {
    registrarFalha(limiteLogin, ip);
    // segura um pouco cada erro: atrapalha quem tenta adivinhar
    await new Promise((r) => setTimeout(r, 900));
    return new Response(null, { status: 303, headers: { Location: `/entrar?erro=1&volta=${encodeURIComponent(volta)}` } });
  }

  registrarAcerto(limiteLogin, ip);
  const https = req.headers.get("x-forwarded-proto") === "https" || req.nextUrl.protocol === "https:";
  return new Response(null, {
    status: 303,
    headers: {
      Location: volta,
      "Set-Cookie": `${COOKIE_SESSAO}=${criarSessao(senha)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DIAS_SESSAO * 24 * 3600}${https ? "; Secure" : ""}`,
    },
  });
}
