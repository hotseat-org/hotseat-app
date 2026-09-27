import { Button } from "@heroui/react"
import { Form, Link } from "react-router"
import { useState } from "react"
import { ImageUploadInput } from "../Inputs/ImageUpload"
import { ButtonLink } from "../ButtonLink"

export const ImageUpload = () => {
  const [thumbnail, setThumbnail] = useState<string | undefined>()

  return (
    <Form method="POST">
      <ImageUploadInput name="thumbnail" onChange={setThumbnail} />
      <div className="flex justify-end pt-6">
        <div className="flex gap-2">
          <ButtonLink to=".." replace variant="tertiary">
            <Link to=".." replace>
              Close
            </Link>
          </ButtonLink>
          <Button variant="secondary" isDisabled={!thumbnail} type="submit">
            Save
          </Button>
        </div>
      </div>
    </Form>
  )
}

export default ImageUpload
