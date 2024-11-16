import { Avatar, Spinner } from "@nextui-org/react"
import clsx from "clsx"
import { UploadCloud } from "lucide-react"
import { useEffect, useState } from "react"

interface Props {
  onChange?: (value?: string) => void
  name: string
}

export const ImageUploadInput = ({ onChange, name }: Props) => {
  const [file, setFile] = useState<File | undefined>()
  const [thumbnail, setThumbnail] = useState<string | undefined>()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFile = e.target.files?.[0]

    if (newFile) {
      setThumbnail(undefined)
      setFile(newFile)

      const data = await fetch("/api/upload-url", {
        method: "POST",
      }).then((res) => res.json())

      const body = new FormData()
      body.append("file", newFile)

      const uploadResult = await fetch(data.uploadUrl, {
        method: "POST",
        body,
      }).then((res) => res.json())

      setThumbnail(uploadResult.result.id)
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
                  <Avatar className="w-52 h-52 z-0" src={URL.createObjectURL(file)} />
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
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                SVG, PNG, JPG, WEBP, or GIF
              </p>
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
