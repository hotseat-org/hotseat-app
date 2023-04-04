import type { Smplr } from '@smplrspace/smplr-loader'
import { loadSmplrJs } from '@smplrspace/smplr-loader'

export let smplr: Smplr

export const loadSmplr = async (): Promise<Smplr> => {
  if (smplr) {
    return smplr
  }

  smplr = await loadSmplrJs('umd')

  return smplr
}
