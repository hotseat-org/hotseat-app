import { redirect } from '@vercel/remix'

export const loader = async () => {
  return redirect('organizations')
}
