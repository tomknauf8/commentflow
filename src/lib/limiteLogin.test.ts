import { describe, expect, it } from "vitest";
import { JANELA_MS, MAX_POR_IP, MAX_TOTAL, esperaParaTentar, ipDe, novoEstado, registrarAcerto, registrarFalha } from "@/lib/limiteLogin";

const t0 = 1_800_000_000_000;

describe("limite de tentativas de senha", () => {
  it("deixa tentar até 4 erros e bloqueia o IP no 5º", () => {
    const e = novoEstado();
    for (let i = 0; i < MAX_POR_IP - 1; i++) registrarFalha(e, "1.1.1.1", t0 + i);
    expect(esperaParaTentar(e, "1.1.1.1", t0 + 10)).toBe(0);
    registrarFalha(e, "1.1.1.1", t0 + 10);
    expect(esperaParaTentar(e, "1.1.1.1", t0 + 11)).toBeGreaterThan(14 * 60);
  });

  it("bloqueio de um IP não atinge outro, e passa sozinho depois de 15 min", () => {
    const e = novoEstado();
    for (let i = 0; i < MAX_POR_IP; i++) registrarFalha(e, "1.1.1.1", t0);
    expect(esperaParaTentar(e, "2.2.2.2", t0 + 1)).toBe(0);
    expect(esperaParaTentar(e, "1.1.1.1", t0 + JANELA_MS + 1)).toBe(0);
  });

  it("acertar a senha zera os erros daquele IP", () => {
    const e = novoEstado();
    for (let i = 0; i < MAX_POR_IP - 1; i++) registrarFalha(e, "1.1.1.1", t0);
    registrarAcerto(e, "1.1.1.1");
    registrarFalha(e, "1.1.1.1", t0 + 1);
    expect(esperaParaTentar(e, "1.1.1.1", t0 + 2)).toBe(0);
  });

  it("ataque espalhado por muitos IPs trava novas tentativas", () => {
    const e = novoEstado();
    for (let i = 0; i < MAX_TOTAL; i++) registrarFalha(e, `10.0.${Math.floor(i / 250)}.${i % 250}`, t0 + i);
    expect(esperaParaTentar(e, "9.9.9.9", t0 + MAX_TOTAL + 1)).toBeGreaterThan(0);
  });

  it("lê o IP real do X-Forwarded-For", () => {
    expect(ipDe(new Headers({ "x-forwarded-for": "200.1.2.3, 10.0.0.1" }))).toBe("200.1.2.3");
    expect(ipDe(new Headers())).toBe("desconhecido");
  });
});
