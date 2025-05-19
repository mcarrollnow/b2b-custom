import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/request-form.html');
  return null;
} 