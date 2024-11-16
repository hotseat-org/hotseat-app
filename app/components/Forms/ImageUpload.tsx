import { Button, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@nextui-org/react"
import { Form, Link } from "@remix-run/react"
import { useState } from "react"
import { ImageUploadInput } from "../Inputs/ImageUpload"

export const ImageUpload = () => {
  const [thumbnail, setThumbnail] = useState<string | undefined>()

  return (
    <Form method="POST">
      <ModalContent>
        <ModalHeader />
        <ModalBody>
          <ImageUploadInput name="thumbnail" onChange={setThumbnail} />
        </ModalBody>
        <ModalFooter>
          <Button variant="light" as={Link} to=".." replace>
            Close
          </Button>
          <Button isDisabled={!thumbnail} type="submit" color="primary">
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Form>
  )
}

export default ImageUpload
