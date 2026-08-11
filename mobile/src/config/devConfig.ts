/**
 * LISTA DE E-MAILS AUTORIZADOS PARA ACESSAR O MODO DEV / FERRAMENTAS DE TESTE RÁPIDO
 * Adicione aqui os e-mails dos desenvolvedores e administradores autorizados.
 */
export const EMAILS_DEV_AUTORIZADOS: string[] = [
  'pedroks434@gmail.com',
];

/**
 * Função utilitária para verificar se um e-mail possui permissão de Dev/Admin
 */
export function verificarPermissaoDev(email?: string | null): boolean {
  if (!email) return false;
  const emailFormatado = email.trim().toLowerCase();
  return EMAILS_DEV_AUTORIZADOS.some((e) => e.trim().toLowerCase() === emailFormatado);
}
