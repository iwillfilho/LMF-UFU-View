"use server";

import { z } from "zod";

import { type FormState, HONEYPOT, primeiroErro, valoresTexto } from "@/lib/actions/form-state";
import { createPublicClient } from "@/lib/supabase/public";

const CAMPOS = ["nome", "curso", "email", "linkedin", "gestao_trainee", "gestoes", "cargos", "mensagem"];

const FOTO_MAX = 5 * 1024 * 1024;
const FOTO_TIPOS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const opcional = (max: number, msg: string) => z.string().trim().max(max, msg);

const schema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(120, "Use no máximo 120 caracteres."),
  curso: opcional(120, "Use no máximo 120 caracteres."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Informe um e-mail válido.").max(254, "E-mail longo demais.")),
  linkedin: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https:\/\/([a-z]+\.)?linkedin\.com\//.test(v), "Cole o link completo do perfil (https://www.linkedin.com/in/...)."),
  gestao_trainee: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}\.[12]$/.test(v), "Use o formato ano.semestre, por exemplo 2023.1."),
  gestoes: opcional(500, "Use no máximo 500 caracteres."),
  cargos: opcional(1000, "Use no máximo 1.000 caracteres."),
  mensagem: opcional(2000, "Use no máximo 2.000 caracteres."),
});

/**
 * Cadastro de ex-membro (link divulgado no Instagram). Entra como "pendente"
 * em alumni_submissions; o Presidente ou o Diretor de RH aprova na Área Restrita.
 * A foto vai para o bucket privado `envios/alumni/` e só a diretoria vê.
 */
export async function enviarCadastroAlumni(_anterior: FormState, formData: FormData): Promise<FormState> {
  const valores = valoresTexto(formData, CAMPOS);
  if (formData.get(HONEYPOT)) return { status: "ok", mensagem: "Cadastro enviado." };

  const parsed = schema.safeParse(valores);
  const erros: Record<string, string> = parsed.success ? {} : primeiroErro(z.flattenError(parsed.error).fieldErrors);

  if (formData.get("consentimento") !== "on") {
    erros.consentimento = "Precisamos da sua autorização para publicar estes dados no site.";
  }

  const foto = formData.get("foto");
  const temFoto = foto instanceof File && foto.size > 0;
  if (temFoto && !FOTO_TIPOS[foto.type]) erros.foto = "Envie a foto em JPG, PNG ou WebP.";
  else if (temFoto && foto.size > FOTO_MAX) erros.foto = "A foto pode ter no máximo 5 MB.";

  if (!parsed.success || Object.keys(erros).length > 0) {
    return { status: "erro", mensagem: "Revise os campos destacados.", erros, valores };
  }

  const supabase = createPublicClient();
  const d = parsed.data;

  let fotoPath: string | null = null;
  if (temFoto) {
    fotoPath = `alumni/${crypto.randomUUID()}.${FOTO_TIPOS[foto.type]}`;
    const { error } = await supabase.storage.from("envios").upload(fotoPath, foto, { contentType: foto.type, upsert: false });
    if (error) {
      console.error("envios upload", error);
      return {
        status: "erro",
        mensagem: "Não foi possível enviar a foto. Tente outra imagem ou envie o cadastro sem foto.",
        erros: { foto: "Falha no envio da foto." },
        valores,
      };
    }
  }

  const { error } = await supabase.from("alumni_submissions").insert({
    nome: d.nome,
    curso: d.curso || null,
    email: d.email,
    linkedin: d.linkedin || null,
    gestao_trainee: d.gestao_trainee || null,
    gestoes: d.gestoes || null,
    cargos: d.cargos || null,
    mensagem: d.mensagem || null,
    foto_path: fotoPath,
    consentimento: true,
  });

  if (error) {
    console.error("alumni_submissions insert", error);
    return { status: "erro", mensagem: "Não foi possível enviar agora. Tente de novo em instantes.", valores };
  }

  return {
    status: "ok",
    mensagem: "Cadastro enviado! A diretoria vai revisar seus dados e adicionar você à página de Alumni.",
  };
}
