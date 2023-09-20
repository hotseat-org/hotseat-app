import { redirect } from '@vercel/remix'

export const loader = () => {
  return redirect('offices')
}
