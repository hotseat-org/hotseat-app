import {
  Checkbox,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@nextui-org/react'
import { Link, useNavigate } from '@remix-run/react'
import { Button } from '~/components/Button'

export default function Index() {
  const navigate = useNavigate()

  return (
    <Modal
      aria-labelledby="modal-title"
      isOpen
      closeButton
      onClose={() => navigate('..')}
    >
      <ModalContent>
        <ModalHeader>
          <p>Fooo</p>
        </ModalHeader>
        <ModalBody>
          <Input
            isClearable
            variant="bordered"
            fullWidth
            color="primary"
            size="lg"
            placeholder="Email"
          />
          <Input
            isClearable
            variant="bordered"
            fullWidth
            color="primary"
            size="lg"
            placeholder="Password"
          />
          <div className="flex space-between">
            <Checkbox>
              <p>Remember me</p>
            </Checkbox>
            <p>Forgot password?</p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button as={Link} to=".." replace>
            Close
          </Button>
          <Button>Sign in</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
