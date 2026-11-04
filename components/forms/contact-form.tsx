"use client";

import { useActionState, useEffect, useRef } from "react";

import { AvisoFormulario, Field, Honeypot, ariaCampo, inputClasse } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { enviarContato } from "@/lib/actions/contato";
import { ESTADO_INICIAL } from "@/lib/actions/form-state";
import { cn } from "@/lib/utils";

/**
 * Formulário de contato. `compacto` é a versão da home (fundo plum),
 * sem o campo de assunto.
 */
export function ContactForm({ compacto = false }: { compacto?: boolean }) {
  const [estado, enviar, enviando] = useActionState(enviarContato, ESTADO_INICIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const e = estado.erros ?? {};
  const v = estado.valores ?? {};

  // Leva o foco ao primeiro campo com erro.
  useEffect(() => {
    if (estado.status === "erro") formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [estado]);

  const campo = cn(inputClasse, compacto && "border-white/25 bg-white/10 text-white placeholder:text-white/50 dark:bg-white/10");

  return (
    <div className={cn(compacto && "[&_label]:text-white [&_.text-destructive]:text-[#ffb4b8]")}>
      <form
        ref={formRef}
        key={JSON.stringify(estado)}
        action={enviar}
        noValidate
        className="relative grid gap-5 sm:grid-cols-2"
      >
        <Honeypot />
        <Field id="nome" label="Nome" erro={e.nome}>
          <Input {...ariaCampo("nome", e.nome)} autoComplete="name" required defaultValue={v.nome} className={campo} />
        </Field>
        <Field id="email" label="E-mail" erro={e.email}>
          <Input
            {...ariaCampo("email", e.email)}
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            defaultValue={v.email}
            className={campo}
          />
        </Field>
        {compacto ? (
          <input type="hidden" name="assunto" value="" />
        ) : (
          <Field id="assunto" label="Assunto" opcional erro={e.assunto} className="sm:col-span-2">
            <Input {...ariaCampo("assunto", e.assunto)} defaultValue={v.assunto} className={campo} />
          </Field>
        )}
        <Field id="mensagem" label="Mensagem" erro={e.mensagem} className="sm:col-span-2">
          <Textarea
            {...ariaCampo("mensagem", e.mensagem)}
            required
            rows={compacto ? 4 : 6}
            defaultValue={v.mensagem}
            className={cn(campo, "h-auto min-h-28 py-3")}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 sm:col-span-2">
          <button
            type="submit"
            disabled={enviando}
            className={cn(
              "pill px-6 py-3 text-base transition-colors disabled:opacity-60",
              compacto
                ? "bg-white text-plum hover:bg-lilac hover:text-galaxy"
                : "bg-primary text-primary-foreground hover:bg-plum dark:hover:bg-lilac dark:hover:text-galaxy",
            )}
          >
            {enviando ? "Enviando…" : "Enviar mensagem"}
          </button>
        </div>
      </form>
      <div className="mt-4">
        <AvisoFormulario status={estado.status} mensagem={estado.mensagem} />
      </div>
    </div>
  );
}
