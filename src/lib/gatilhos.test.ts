import { describe, expect, it } from "vitest";
import { GATILHOS, TIPOS, podeAbordarNoDirect, temConteudo } from "@/lib/gatilhos";
import { GrafoSchema } from "@/lib/grafo";

const agora = new Date("2026-11-12T12:00:00Z");
const horasAtras = (h: number) => new Date(agora.getTime() - h * 3_600_000);
const livre = { emAtendimento: false, ultimaRespostaManual: null, execucaoAtiva: false, ultimoDisparo: null };

describe("gatilho mensagem no direct", () => {
  it("existe, aceita palavra opcional e não tem resposta pública", () => {
    expect(TIPOS).toContain("mensagem");
    expect(GATILHOS.mensagem).toMatchObject({ palavras: "opcionais", publica: false, respostaPrivada: false, post: false });
  });

  it("aborda quem chega pela primeira vez", () => {
    expect(podeAbordarNoDirect(livre, agora)).toBe(true);
  });

  it("não aborda quem está em atendimento ou no meio de outra automação", () => {
    expect(podeAbordarNoDirect({ ...livre, emAtendimento: true }, agora)).toBe(false);
    expect(podeAbordarNoDirect({ ...livre, execucaoAtiva: true }, agora)).toBe(false);
  });

  it("respeita 24 h depois de uma resposta sua feita à mão", () => {
    expect(podeAbordarNoDirect({ ...livre, ultimaRespostaManual: horasAtras(3) }, agora)).toBe(false);
    expect(podeAbordarNoDirect({ ...livre, ultimaRespostaManual: horasAtras(25) }, agora)).toBe(true);
  });

  it("aborda a mesma pessoa no máximo uma vez a cada 7 dias", () => {
    expect(podeAbordarNoDirect({ ...livre, ultimoDisparo: horasAtras(6 * 24) }, agora)).toBe(false);
    expect(podeAbordarNoDirect({ ...livre, ultimoDisparo: horasAtras(7 * 24 + 1) }, agora)).toBe(true);
  });
});

describe("qualquer mensagem só aborda contato novo com texto", () => {
  const qualquer = { ...livre, qualquerMensagem: true, contatoConhecido: false, texto: "Oi, quero saber sobre contabilidade" };

  it("aborda quem escreve pela primeira vez com texto", () => {
    expect(podeAbordarNoDirect(qualquer, agora)).toBe(true);
  });

  it("não aborda amigo ou cliente que já conversava com você", () => {
    expect(podeAbordarNoDirect({ ...qualquer, contatoConhecido: true }, agora)).toBe(false);
  });

  it("não aborda mensagem só de emoji ou pontuação", () => {
    for (const t of ["👏", "😍😍", "!!", "  ", "❤️ 🙌"]) expect(podeAbordarNoDirect({ ...qualquer, texto: t }, agora)).toBe(false);
    expect(temConteudo("ok 👍")).toBe(true);
    expect(temConteudo("2027?")).toBe(true);
  });

  it("palavra-chave (ex.: PRONTA) vale também para quem já é contato", () => {
    expect(podeAbordarNoDirect({ ...livre, qualquerMensagem: false, contatoConhecido: true, texto: "pronta" }, agora)).toBe(true);
  });
});

describe("condição segue você?", () => {
  it("o construtor aceita a condição segue", () => {
    const g = GrafoSchema.safeParse({
      inicio: "a",
      nos: [
        { id: "a", tipo: "mensagem", texto: "Já me segue?", respostas_rapidas: [{ titulo: "Já te sigo", proximo: "c" }] },
        { id: "c", tipo: "condicao", teste: "segue", sim: "a", nao: null },
      ],
    });
    expect(g.success).toBe(true);
  });
});
