// Supabase 프로젝트 연결 정보
// anon key는 공개되어도 되는 키입니다 (RLS 정책이 접근을 통제).
const SUPABASE_URL = 'https://gaivwuzeafxeecgcidfr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhaXZ3dXplYWZ4ZWVjZ2NpZGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxMTMyNjMsImV4cCI6MjEwMDY4OTI2M30.Nu7pYV9tvqZjReppD7MAzgGaRs2XDmZ_xmEQ5zvnUJA';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
