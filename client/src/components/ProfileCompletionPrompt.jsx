import { Modal, Button } from 'flowbite-react';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

export default function ProfileCompletionPrompt() {
  const { currentUser } = useSelector((state) => state.user);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (currentUser && !currentUser.profileCompleted) {
      setOpen(true);
    }
  }, [currentUser]);

  if (!currentUser) return null;

  return (
    <Modal show={open} onClose={() => setOpen(false)} popup>
      <Modal.Header />
      <Modal.Body>
        <div className="text-center">
          <h3 className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
            Complete your profile to unlock personalized features.
          </h3>
          <div className="flex justify-center gap-4">
            <Button color="gray" onClick={() => setOpen(false)}>
              Later
            </Button>
            <Link to="/dashboard?tab=profile">
              <Button>Complete now</Button>
            </Link>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}
