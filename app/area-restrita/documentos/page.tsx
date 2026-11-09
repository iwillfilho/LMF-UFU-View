import { Download, ExternalLink, FileText, FolderOpen } from "lucide-react";
import type { Metadata } from "next";

import { FormDrive, GerenciarDocumento, NovoDocumento } from "@/components/area-restrita/documentos-admin";
import { exigirPapel } from "@/lib/auth";
import { CATEGORIA_DOCUMENTO } from "@/lib/labels";
import { ADMIN, TODOS, temPapel } from "@/lib/papeis";
import { type Documento, getDocumentos, getDriveUrl } from "@/lib/restrito";

export const metadata: Metadata = { title: "Documentos" };

export default async function Page() {
  const sessao = await exigirPapel(TODOS);
  const admin = temPapel(sessao.papeis, ADMIN);
  const [documentos, driveUrl] = await Promise.all([getDocumentos(), getDriveUrl()]);

  const grupos = (Object.keys(CATEGORIA_DOCUMENTO) as Documento["categoria"][])
    .map((categoria) => ({ categoria, itens: documentos.filter((d) => d.categoria === categoria) }))
    .filter((g) => g.itens.length > 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <h1 className="text-title">Documentos</h1>
      <p className="mt-4 max-w-[62ch] text-muted-foreground">
        Estatuto, Regimento e documentos auxiliares da LMF. Os arquivos só abrem para quem está logado, por um link que
        vale por um minuto.
      </p>

      {driveUrl ? (
        <a
          href={driveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pill mt-8 bg-primary px-6 py-3 text-base text-primary-foreground transition-colors hover:bg-plum dark:hover:bg-lilac dark:hover:text-galaxy"
        >
          <FolderOpen className="size-4" aria-hidden />
          Google Drive da LMF
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
      ) : null}

      {grupos.length === 0 ? (
        <p className="mt-12 max-w-[62ch] rounded-[1.25rem_1.25rem_0.35rem_1.25rem] border border-dashed border-border p-6 text-muted-foreground">
          Nenhum documento disponível ainda.
          {admin ? " Adicione o primeiro logo abaixo." : " O Presidente ou o Diretor de RH publica os documentos aqui."}
        </p>
      ) : (
        grupos.map((g) => (
          <section key={g.categoria} aria-labelledby={`cat-${g.categoria}`} className="mt-12">
            <h2 id={`cat-${g.categoria}`} className="text-3xl">
              {CATEGORIA_DOCUMENTO[g.categoria]}
            </h2>
            <ul className="mt-5 grid gap-3">
              {g.itens.map((doc) => (
                <li key={doc.id} className="rounded-2xl border border-border p-5">
                  <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
                    <FileText className="mt-0.5 size-5 shrink-0 text-ink-accent" aria-hidden />
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="text-[0.9375rem] text-foreground">{doc.titulo}</p>
                      {doc.descricao ? <p className="mt-1 text-sm text-muted-foreground">{doc.descricao}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/area-restrita/documentos/${doc.id}/arquivo`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-4 text-sm hover:bg-secondary"
                      >
                        Abrir <ExternalLink className="size-3.5" aria-hidden />
                        <span className="sr-only"> {doc.titulo} (abre em nova aba)</span>
                      </a>
                      <a
                        href={`/area-restrita/documentos/${doc.id}/arquivo?baixar`}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-4 text-sm hover:bg-secondary"
                      >
                        <Download className="size-3.5" aria-hidden />
                        Baixar <span className="sr-only"> {doc.titulo}</span>
                      </a>
                    </div>
                  </div>
                  {admin ? <GerenciarDocumento doc={doc} /> : null}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {admin ? (
        <section aria-labelledby="gerenciar-titulo" className="mt-16 border-t border-border pt-10">
          <h2 id="gerenciar-titulo" className="text-3xl">
            Gerenciar
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">Visível só para o Presidente e o Diretor de RH.</p>
          <div className="mt-8 grid gap-10 lg:grid-cols-2">
            <div>
              <h3 className="font-sans text-base font-normal">Adicionar documento</h3>
              <div className="mt-4">
                <NovoDocumento />
              </div>
            </div>
            <div>
              <h3 className="font-sans text-base font-normal">Google Drive</h3>
              <div className="mt-4">
                <FormDrive atual={driveUrl} />
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
