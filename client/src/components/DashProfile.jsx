// client/src/components/DashProfile.jsx
import { Alert, Button, FileInput, Select, TextInput, Textarea, Spinner, Modal } from 'flowbite-react';
import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Link } from 'react-router-dom';

// Import our advanced custom hook and modal component
import { useCloudinaryUpload } from '../hooks/useCloudinaryUpload';
import DeleteConfirmationModal from './DeleteConfirmationModal';

// Import Redux actions
import {
  updateStart,
  updateSuccess,
  updateFailure,
  deleteUserStart,
  deleteUserSuccess,
  deleteUserFailure,
  signoutSuccess,
} from '../redux/user/userSlice';

export default function DashProfile() {
  const { currentUser, error: reduxError, loading } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  // State for the form and UI feedback
  const [imageFile, setImageFile] = useState(null);
  const [imageFileUrl, setImageFileUrl] = useState(null);
  const [formData, setFormData] = useState({});
  const [updateUserSuccess, setUpdateUserSuccess] = useState(null);
  const [updateUserError, setUpdateUserError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const filePickerRef = useRef();

  // Use our custom hook for all upload logic
  const { upload, cancelUpload, progress, error: imageUploadError, isUploading } = useCloudinaryUpload();

  // Handle the selection of a new profile picture
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImageFileUrl(URL.createObjectURL(file)); // Show a temporary preview
    }
  };

  // This effect triggers the upload when a new imageFile is set
  useEffect(() => {
    if (imageFile) {
      const startUpload = async () => {
        try {
          const uploadedUrl = await upload(imageFile, {
            allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
            maxSizeMB: 5,
          });
          setFormData({ ...formData, profilePicture: uploadedUrl });
          setUpdateUserSuccess('Profile image updated. Click "Update" to save.');
        } catch (err) {
          // The hook already sets the error state, so we just log it
          console.error(err.message);
        }
      };
      startUpload();
    }
  }, [imageFile]);

  // Handle changes in the text inputs
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value.trim() });
  };

  // Handle the final form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdateUserError(null);
    setUpdateUserSuccess(null);

    if (Object.keys(formData).length === 0) {
      return setUpdateUserError('No changes were made.');
    }
    if (isUploading) {
      return setUpdateUserError('Please wait for the image to finish uploading.');
    }

    try {
      dispatch(updateStart());
      const res = await fetch(`/api/user/update/${currentUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, profileCompleted: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        dispatch(updateFailure(data.message));
        setUpdateUserError(data.message);
      } else {
        dispatch(updateSuccess(data));
        setUpdateUserSuccess("Your profile has been updated successfully!");
        setFormData({}); // Clear form data after successful update
      }
    } catch (error) {
      dispatch(updateFailure(error.message));
      setUpdateUserError(error.message);
    }
  };

  // Handle account deletion
  const handleDeleteUser = async () => {
    setShowModal(false);
    try {
      dispatch(deleteUserStart());
      const res = await fetch(`/api/user/delete/${currentUser._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        dispatch(deleteUserFailure(data.message));
      } else {
        dispatch(deleteUserSuccess(data));
      }
    } catch (error) {
      dispatch(deleteUserFailure(error.message));
    }
  };

  // Handle user sign-out
  const handleSignout = async () => {
    try {
      const res = await fetch('/api/user/signout', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        console.log(data.message);
      } else {
        dispatch(signoutSuccess());
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  return (
      <div className='max-w-lg mx-auto p-3 w-full'>
        <h1 className='my-7 text-center font-semibold text-3xl'>Profile</h1>
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <input type='file' accept='image/*' onChange={handleImageChange} ref={filePickerRef} hidden />
          <div
              className='relative w-32 h-32 self-center cursor-pointer shadow-md overflow-hidden rounded-full'
              onClick={() => !isUploading && filePickerRef.current.click()}
          >
            {isUploading && (
                <div className='absolute inset-0 z-10 flex flex-col justify-center items-center'>
                  <CircularProgressbar
                      value={progress || 0}
                      text={`${progress}%`}
                      strokeWidth={5}
                      styles={{
                        root: { width: '100%', height: '100%' },
                        path: { stroke: `rgba(62, 152, 199, ${progress / 100})` },
                        text: { fill: '#f8fafc', fontSize: '24px' },
                      }}
                  />
                  <Button size="xs" className="absolute bottom-2" color="light" onClick={cancelUpload}>Cancel</Button>
                </div>
            )}
            <img
                src={imageFileUrl || currentUser.profilePicture}
                alt='user'
                className={`rounded-full w-full h-full object-cover border-8 border-[lightgray] ${
                    isUploading && 'opacity-60'
                }`}
            />
          </div>

          {imageUploadError && <Alert color='failure'>{imageUploadError}</Alert>}

          <TextInput id='username' type='text' placeholder='username' defaultValue={currentUser.username} onChange={handleChange} />
          <TextInput id='email' type='email' placeholder='email' defaultValue={currentUser.email} onChange={handleChange} />
          <TextInput id='password' type='password' placeholder='password' onChange={handleChange} />
          <Textarea id='bio' placeholder='bio' defaultValue={currentUser.bio} onChange={handleChange} />

          <Button type='submit' gradientDuoTone='purpleToBlue' outline disabled={loading || isUploading}>
            {loading ? 'Loading...' : 'Update'}
          </Button>

          {currentUser.isAdmin && (
              <>
                <Link to={'/create-post'}>
                  <Button type='button' gradientDuoTone='purpleToPink' className='w-full'>
                    Create a post
                  </Button>
                </Link>
                {/* Link to Create Tutorial page */}
                <Link to={'/create-tutorial'}>
                  <Button type='button' gradientDuoTone='tealToLime' className='w-full'>
                    Create a tutorial
                  </Button>
                </Link>
                {/* NEW: Link to Create Quiz page */}
                <Link to={'/create-quiz'}>
                  <Button type='button' gradientDuoTone='cyanToBlue' className='w-full'>
                    Create a quiz
                  </Button>
                </Link>
              </>
          )}
        </form>
        <div className='text-red-500 flex justify-between mt-5'>
          <span onClick={() => setShowModal(true)} className='cursor-pointer'>Delete Account</span>
          <span onClick={handleSignout} className='cursor-pointer'>Sign Out</span>
        </div>

        {updateUserSuccess && <Alert color='success' className='mt-5'>{updateUserSuccess}</Alert>}
        {updateUserError && <Alert color='failure' className='mt-5'>{updateUserError}</Alert>}
        {reduxError && <Alert color='failure' className='mt-5'>{reduxError}</Alert>}

        <DeleteConfirmationModal
            show={showModal}
            onClose={() => setShowModal(false)}
            onConfirm={handleDeleteUser}
        />
      </div>
  );
}