/** Estado devolvido pelas Server Actions dos formulários públicos (useActionState). */
export type FormState = {
  status: "idle" | "ok" | "erro";
  mensagem?: string;
  /** Primeiro erro de cada campo, para mostrar ao lado do input. */
  erros?: Record<string, string>;
  /** Valores enviados, para o formulário não perder o que a pessoa digitou quando der erro. */
  valores?: Record<string, string>;
};

export const ESTADO_INICIAL: FormState = { status: "idle" };

/** Campo isca: invisível para pessoas, preenchido por robôs. */
export const HONEYPOT = "site_web";

export function primeiroErro(fieldErrors: Record<string, string[] | undefined>) {
  return Object.fromEntries(
    Object.entries(fieldErrors).flatMap(([campo, msgs]) => (msgs?.[0] ? [[campo, msgs[0]]] : [])),
  );
}

export function valoresTexto(formData: FormData, campos: string[]) {
  return Object.fromEntries(campos.map((c) => [c, String(formData.get(c) ?? "")]));
}
