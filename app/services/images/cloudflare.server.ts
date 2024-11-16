import crypto from "node:crypto"
import dayjs from "dayjs"
import type { ImageService } from "./types"

const KEY = process.env.CLOUDFLARE_IMAGE_KEY
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const API_KEY = process.env.CLOUDFLARE_API_KEY
const DELIVERY_URL = process.env.CLOUDFLARE_DELIVERY_URL

const bufferToHex = (buffer: ArrayBufferLike) =>
  [...new Uint8Array(buffer)].map((x) => x.toString(16).padStart(2, "0")).join("")

const encode = async (value: string) => {
  const encoder = new TextEncoder()
  const secretKeyData = encoder.encode(KEY)

  const key = await crypto.subtle.importKey(
    "raw",
    secretKeyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(value))
  return bufferToHex(new Uint8Array(mac).buffer)
}

export const getSignedUrl = async (id: string, variant: string) => {
  const newUrl = new URL(`${DELIVERY_URL}/${id}/${variant}`)

  // Attach the expiration value to the `url`
  const expiry = dayjs().endOf("day").unix()
  newUrl.searchParams.set("exp", expiry.toString())
  // `url` now looks like
  // https://imagedelivery.net/cheeW4oKsx5ljh8e8BoL2A/bc27a117-9509-446b-8c69-c81bfeac0a01/mobile?exp=1631289275

  const stringToSign = newUrl.pathname + "?" + newUrl.searchParams.toString()
  // for example, /cheeW4oKsx5ljh8e8BoL2A/bc27a117-9509-446b-8c69-c81bfeac0a01/mobile?exp=1631289275

  const sig = await encode(stringToSign)

  // And attach it to the `url`
  newUrl.searchParams.set("sig", sig)

  return newUrl.toString()
}

export const getUploadUrl = async () => {
  const body = new FormData()
  body.append("requireSignedURLs", "true")

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/images/v2/direct_upload`,
    {
      method: "POST",
      body,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    }
  ).then((res) => res.json())

  return {
    imageId: response.result.id,
    uploadUrl: new URL(response.result.uploadURL),
  }
}

export const cloudflareImageService: ImageService = {
  getSignedUrl,
  getUploadUrl,
}
