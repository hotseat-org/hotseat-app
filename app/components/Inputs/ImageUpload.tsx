import { Avatar, Spinner } from "@heroui/react"
import clsx from "clsx"
import { UploadCloud } from "lucide-react"
import { useEffect, useState } from "react"
import { Rich, useI18n } from "~/i18n/I18nProvider"

/** A response's JSON, or an error if it isn't a success. */
const readJson = async (response: Response) => {
  if (!response.ok) throw new Error(`Upload failed (${response.status})`)

  return response.json()
}

/** Upload an image (direct to the image service); resolves to its id, or throws. */
export const uploadImage = async (file: File): Promise<string> => {
  const data = await fetch(`${import.meta.env.BASE_URL}api/upload-url`, {
    method: "POST",
  }).then(readJson)
  const body = new FormData()
  body.append("file", file)
  const uploadResult = await fetch(data.uploadUrl, { method: "POST", body }).then(readJson)

  return uploadResult.result.id
}

interface Props {
  onChange?: (value?: string) => void
  name: string
}

export const ImageUploadInput = ({ onChange, name }: Props) => {
  const { t } = useI18n()
  const [file, setFile] = useState<File | undefined>()
  const [thumbnail, setThumbnail] = useState<string | undefined>()
  // The last pick couldn't be uploaded: back to picking, saying so.
  const [hasFailed, setHasFailed] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFile = e.target.files?.[0]
    if (!newFile) return

    setThumbnail(undefined)
    setHasFailed(false)
    setFile(newFile)

    try {
      setThumbnail(await uploadImage(newFile))
    } catch {
      setFile(undefined)
      setHasFailed(true)
    }
  }

  useEffect(() => {
    onChange?.(thumbnail)
  }, [thumbnail])

  const isOptimistic = !!file && !thumbnail

  return (
    <>
      <div className="flex items-center justify-center w-full">
        <label
          className={clsx(
            "flex flex-col items-center justify-center w-full h-64 cursor-pointer",
            "border-2 border-dashed rounded-lg",
            "border-gray-700 bg-slate-100 hover:bg-slate-200",
            "dark:bg-black/30 dark:hover:bg-black/50 dark:border-slate-400 dark:hover:border-slate-500 "
          )}
        >
          {file ? (
            <div className="flex">
              <div className="relative">
                <div className={clsx({ "opacity-10": isOptimistic })}>
                  <Avatar className="w-52 h-52 z-0">
                    <Avatar.Image src={URL.createObjectURL(file)} />
                  </Avatar>
                </div>
                {isOptimistic && (
                  <Spinner
                    size="lg"
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-1"
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadCloud />
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                <Rich
                  text={t("{click} or drag and drop")}
                  values={{ click: <span className="font-semibold">{t("Click to upload")}</span> }}
                />
              </p>
              {hasFailed ? (
                <p role="alert" className="text-xs font-semibold text-danger">
                  {t("That image couldn't be uploaded. Try another one.")}
                </p>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  SVG, PNG, JPG, WEBP, or GIF
                </p>
              )}
            </div>
          )}

          <input
            accept=".svg,.png,.gif,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
            id="dropzone-file"
            type="file"
            className="hidden"
          />
        </label>
      </div>

      <input hidden name={name} value={thumbnail} />
    </>
  )
}
