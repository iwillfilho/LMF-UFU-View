import { Voltar } from "@/components/area-restrita/voltar";

export function CabecalhoConteudo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <>
      <Voltar href="/area-restrita/conteudo" label="Conteúdo" />
      <h1 className="text-title mt-6">{titulo}</h1>
      <p className="mt-4 max-w-[62ch] text-muted-foreground">{children}</p>
    </>
  );
}
