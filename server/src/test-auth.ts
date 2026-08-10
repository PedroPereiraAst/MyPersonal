import dotenv from 'dotenv';
dotenv.config();
import { SupabaseService } from './services/supabase.service.js';

async function testAuth() {
  const testEmail = `teste_${Date.now()}@mypersonal.com`;
  console.log('🔍 Testando cadastro de usuário no Supabase Auth...');
  console.log('Email:', testEmail);

  try {
    const resCadastro = await SupabaseService.cadastrarUsuario(testEmail, '12345678', 'Pedro Teste Auth');
    console.log('✅ RESPOSTA DO SUPABASE AUTH (CADASTRO):', JSON.stringify(resCadastro, null, 2));

    const resLogin = await SupabaseService.loginUsuario(testEmail, '12345678');
    console.log('✅ RESPOSTA DO SUPABASE AUTH (LOGIN):', resLogin?.user?.id ? `ID do Usuário: ${resLogin.user.id}` : 'Sem ID');
  } catch (err: any) {
    console.error('❌ ERRO NO SUPABASE AUTH:', err.message);
  }
}

testAuth();
