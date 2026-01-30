import { api } from './api';

interface LoginResponse {
  token: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
  };
}

interface RegisterResponse {
  id: string;
  nome: string;
  email: string;
}

export async function login(email: string, senha: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, senha });
  return data;
}

export async function register(nome: string, email: string, senha: string): Promise<RegisterResponse> {
  const { data } = await api.post<RegisterResponse>('/auth/register', { nome, email, senha });
  return data;
}
