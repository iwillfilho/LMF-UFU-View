"use client";

import { useActionState, useEffect, useRef } from "react";

import { AvisoFormulario, Field, Honeypot, ariaCampo, inputClasse } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { enviarCadastroAlumni } from "@/lib/actions/alumni";
import { ESTADO_INICIAL } from "@/lib/actions/form-state";
import { cn } from "@/lib/utils";

export function AlumniForm() {
  const [estado, enviar, enviando] = useActionState(enviarCadastroAlumni, ESTADO_INICIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const e = estado.erros ?? {};
  const v = estado.valores ?? {};

  useEffect(() => {
    if (estado.status === "erro") formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [estado]);

  if (estado.status === "ok") {
    return (
      <div className="rounded-[1.75rem_1.75rem_0.5rem_1.75rem] border border-border bg-card p-8">
        <h2 className="text-3xl">Obrigado!</h2>
        <div className="mt-3">
          <AvisoFormulario status="ok" mensagem={estado.mensagem} />
        </div>
      </div>
    );
  }

  const dicaGestao = "Formato ano.semestre, por exemplo 2023.1.";
  const dicaFoto = "JPG, PNG ou WebP, até 5 MB. De preferência quadrada, com o rosto visível.";

  return (
    <div>
      <form
        ref={formRef}
        key={JSON.stringify(estado)}
        action={enviar}
        noValidate
        encType="multipart/form-data"
        className="relative grid gap-6 sm:grid-cols-2"
      >
        <Honeypot />
        <Field id="nome" label="Nome completo" erro={e.nome}>
          <Input {...ariaCampo("nome", e.nome)} autoComplete="name" required defaultValue={v.nome} className={inputClasse} />
        </Field>
        <Field id="curso" label="Curso na UFU" opcional erro={e.curso}>
          <Input {...ariaCampo("curso", e.curso)} defaultValue={v.curso} className={inputClasse} />
        </Field>
        <Field id="email" label="E-mail de contato" erro={e.email}>
          <Input
            {...ariaCampo("email", e.email)}
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            defaultValue={v.email}
            className={inputClasse}
          />
        </Field>
        <Field id="linkedin" label="LinkedIn" opcional erro={e.linkedin}>
          <Input
            {...ariaCampo("linkedin", e.linkedin)}
            type="url"
            placeholder="https://www.linkedin.com/in/…"
            defaultValue={v.linkedin}
            className={inputClasse}
          />
        </Field>
        <Field id="gestao_trainee" label="Gestão em que entrou como trainee" opcional erro={e.gestao_trainee} dica={dicaGestao}>
          <Input
            {...ariaCampo("gestao_trainee", e.gestao_trainee, dicaGestao)}
            inputMode="decimal"
            placeholder="2023.1"
            defaultValue={v.gestao_trainee}
            className={inputClasse}
          />
        </Field>
        <Field id="gestoes" label="Gestões como membro efetivo" opcional erro={e.gestoes}>
          <Input
            {...ariaCampo("gestoes", e.gestoes)}
            placeholder="2023.2 a 2025.1"
            defaultValue={v.gestoes}
            className={inputClasse}
          />
        </Field>
        <Field id="cargos" label="Cargos que teve na liga" opcional erro={e.cargos} className="sm:col-span-2">
          <Textarea
            {...ariaCampo("cargos", e.cargos)}
            rows={3}
            placeholder="Ex.: Analista do núcleo Equity (2023.2), Diretor(a) de Marketing (2024.1–2024.2)"
            defaultValue={v.cargos}
            className={cn(inputClasse, "h-auto py-3")}
          />
        </Field>
        <Field id="foto" label="Foto" opcional erro={e.foto} dica={dicaFoto} className="sm:col-span-2">
          <Input
            {...ariaCampo("foto", e.foto, dicaFoto)}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className={cn(inputClasse, "py-2.5 file:mr-3 file:rounded-full file:bg-secondary file:px-3")}
          />
        </Field>
        <Field id="mensagem" label="Algo mais que queira contar?" opcional erro={e.mensagem} className="sm:col-span-2">
          <Textarea
            {...ariaCampo("mensagem", e.mensagem)}
            rows={4}
            placeholder="Onde você trabalha hoje, lembranças da liga…"
            defaultValue={v.mensagem}
            className={cn(inputClasse, "h-auto py-3")}
          />
        </Field>

        <div className="grid gap-1.5 sm:col-span-2">
          <label className="flex items-start gap-3 text-[0.9375rem]">
            <input
              type="checkbox"
              name="consentimento"
              aria-required="true"
              aria-invalid={e.consentimento ? true : undefined}
              aria-describedby={e.consentimento ? "consentimento-erro" : undefined}
              className="mt-1 size-4 shrink-0 accent-primary"
            />
            <span>
              Autorizo a LMF UFU a publicar no site meu nome, curso, foto, gestões, cargos e LinkedIn. O e-mail fica só com a
              diretoria. Posso pedir a remoção a qualquer momento por ligamf.ufu@gmail.com.
            </span>
          </label>
          {e.consentimento ? (
            <p id="consentimento-erro" className="text-sm text-destructive">
              {e.consentimento}
            </p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={enviando}
            className="pill bg-primary px-6 py-3 text-base text-primary-foreground transition-colors hover:bg-plum disabled:opacity-60 dark:hover:bg-lilac dark:hover:text-galaxy"
          >
            {enviando ? "Enviando…" : "Enviar cadastro"}
          </button>
        </div>
      </form>
      <div className="mt-4">
        <AvisoFormulario status={estado.status} mensagem={estado.mensagem} />
      </div>
    </div>
  );
}
