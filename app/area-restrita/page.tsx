import { redirect } from "next/navigation";

import { DESTINO_PADRAO } from "@/lib/auth-destino";

export default function AreaRestritaPage() {
  redirect(DESTINO_PADRAO);
}
