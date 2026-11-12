import { describe, expect, it, vi } from "vitest";
import { buildMessage, segueConta } from "@/lib/meta";

describe("botão do direct", () => {
  it("até 3 botões curtos ficam dentro do balão, embaixo do texto", () => {
    expect(buildMessage("Preparei um texto. Toque abaixo pra receber.", [{ title: "Quero ler", payload: "p1" }])).toEqual({
      attachment: {
        type: "template",
        payload: { template_type: "button", text: "Preparei um texto. Toque abaixo pra receber.", buttons: [{ type: "postback", title: "Quero ler", payload: "p1" }] },
      },
    });
  });

  it("sem botão é só texto; mais de 3 ou texto longo voltam a ser respostas rápidas", () => {
    expect(buildMessage("oi")).toEqual({ text: "oi" });
    const quatro = ["a", "b", "c", "d"].map((t) => ({ title: t, payload: t }));
    expect(buildMessage("escolha", quatro)).toMatchObject({ text: "escolha", quick_replies: expect.any(Array) });
    expect(buildMessage("x".repeat(641), [{ title: "Sim", payload: "s" }])).toMatchObject({ quick_replies: expect.any(Array) });
  });
});

describe("segue a conta?", () => {
  const creds = { accessToken: "t", igUserId: "1" };
  const responde = (ok: boolean, corpo: unknown) =>
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({ ok, json: async () => corpo } as Response);

  it("lê is_user_follow_business", async () => {
    responde(true, { is_user_follow_business: true });
    expect(await segueConta(creds, "123")).toBe(true);
    responde(true, { is_user_follow_business: false });
    expect(await segueConta(creds, "123")).toBe(false);
  });

  it("devolve null quando a API recusa ou não traz o campo", async () => {
    responde(false, { error: { message: "x" } });
    expect(await segueConta(creds, "123")).toBeNull();
    responde(true, {});
    expect(await segueConta(creds, "123")).toBeNull();
  });
});
