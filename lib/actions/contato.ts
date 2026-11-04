"use server";

import { z } from "zod";

import { type FormState, HONEYPOT, primeiroErro, valoresTexto } from "@/lib/actions/form-state";
import { createPublicClient } from "@/lib/supabase/public";

const CAMPOS = ["nome", "email", "assunto", "mensagem"];

const schema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(120, "Use no máximo 120 caracteres."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Informe um e-mail válido.").max(254, "E-mail longo demais.")),
  assunto: z.string().trim().max(160, "Use no máximo 160 caracteres."),
  mensagem: z.string().trim().min(10, "Escreva pelo menos 10 caracteres.").max(5000, "Use no máximo 5.000 caracteres."),
});

/** Grava em contact_messages (o visitante só pode inserir; quem lê é a diretoria). */
export async function enviarContato(_anterior: FormState, formData: FormData): Promise<FormState> {
  const valores = valoresTexto(formData, CAMPOS);

  // Robô preencheu o campo isca: responde como sucesso e descarta.
  if (formData.get(HONEYPOT)) return { status: "ok", mensagem: "Mensagem enviada." };

  const parsed = schema.safeParse(valores);
  if (!parsed.success) {
    return {
      status: "erro",
      mensagem: "Revise os campos destacados.",
      erros: primeiroErro(z.flattenError(parsed.error).fieldErrors),
      valores,
    };
  }

  const { nome, email, assunto, mensagem } = parsed.data;
  const { error } = await createPublicClient()
    .from("contact_messages")
    .insert({ nome, email, assunto: assunto || null, mensagem });

  if (error) {
    console.error("contact_messages insert", error);
    return {
      status: "erro",
      mensagem: "Não foi possível enviar agora. Tente de novo em instantes ou escreva para ligamf.ufu@gmail.com.",
      valores,
    };
  }

  return { status: "ok", mensagem: "Mensagem enviada! Respondemos pelo e-mail informado." };
}
