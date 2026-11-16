/**
 * Login com e-mail e senha é PROVISÓRIO: só fica ligado com LOGIN_COM_SENHA=1
 * (variável de ambiente do servidor). Para desligar, remova a variável na
 * Vercel e faça um novo deploy.
 */
export function loginComSenhaAtivo() {
  return process.env.LOGIN_COM_SENHA === "1";
}
