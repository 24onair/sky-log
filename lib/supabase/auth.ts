"use client";

import { createClient } from "./client";

export interface SignUpData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  nickname?: string;
  wing_brand?: string;
  wing_name?: string;
  wing_grade?: string;
}

export async function signUp(data: SignUpData) {
  const supabase = createClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { name: data.name },
    },
  });

  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error("회원가입에 실패했습니다.");

  // 프로필 추가 정보 저장
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      name: data.name,
      phone: data.phone || null,
      nickname: data.nickname || null,
      wing_brand: data.wing_brand || null,
      wing_name: data.wing_name || null,
      wing_grade: data.wing_grade || null,
    })
    .eq("id", authData.user.id);

  if (profileError) throw new Error(profileError.message);

  return authData;
}

export async function signIn(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
