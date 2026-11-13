import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { criarSessao } from "@/lib/sessao";

const completo = { ok: true, banco: true, instagram: { conectado: true, conta: "minhaconta" } };
vi.mock("@/lib/saude", () => ({ estadoDaInstalacao: async () => completo }));
const { GET } = await import("@/app/api/saude/route");

const pedir = (host: string, cookie?: string) =>
  new NextRequest(new URL("/api/saude", `http://${host}`), { headers: { host, ...(cookie ? { cookie } : {}) } });

describe("rota de saúde", () => {
  it("de fora, só diz se está no ar", async () => {
    vi.stubEnv("PAINEL_SENHA", "cf-teste");
    const r = await GET(pedir("painel.exemplo.com"));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
  });

  it("no próprio computador (instalador) e logado no painel, mostra os detalhes", async () => {
    vi.stubEnv("PAINEL_SENHA", "cf-teste");
    expect(await (await GET(pedir("localhost:3000"))).json()).toEqual(completo);
    expect(await (await GET(pedir("painel.exemplo.com", `cf_sessao=${criarSessao("cf-teste")}`))).json()).toEqual(completo);
  });
});
