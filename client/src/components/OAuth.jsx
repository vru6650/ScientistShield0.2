import { Button } from 'flowbite-react';
import { AiFillGoogleCircle, AiFillGithub } from 'react-icons/ai';
import { GoogleAuthProvider, GithubAuthProvider, signInWithPopup, getAuth } from 'firebase/auth';
import { app } from '../firebase';
import { useDispatch } from 'react-redux';
import { signInSuccess } from '../redux/user/userSlice';
import { useNavigate } from 'react-router-dom';

export default function OAuth() {
    const auth = getAuth(app)
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const handleGoogleClick = async () =>{
        const provider = new GoogleAuthProvider()
        provider.setCustomParameters({ prompt: 'select_account' })
        try {
            const resultsFromGoogle = await signInWithPopup(auth, provider)
            const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: resultsFromGoogle.user.displayName,
                    email: resultsFromGoogle.user.email,
                    googlePhotoUrl: resultsFromGoogle.user.photoURL,
                }),
                })
            const data = await res.json()
            if (res.ok){
                dispatch(signInSuccess(data))
                navigate('/')
            }
        } catch (error) {
            console.log(error);
        }
    }

    const handleGithubClick = async () => {
        const provider = new GithubAuthProvider();
        provider.setCustomParameters({ allow_signup: 'false' });
        try {
            const results = await signInWithPopup(auth, provider);
            const res = await fetch('/api/auth/github', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: results.user.displayName,
                    email: results.user.email,
                    githubPhotoUrl: results.user.photoURL,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                dispatch(signInSuccess(data));
                navigate('/');
            }
        } catch (error) {
            console.log(error);
        }
    };

    return (
        <div className='flex flex-col gap-2'>
            <Button type='button' gradientDuoTone='pinkToOrange' outline onClick={handleGoogleClick}>
                <AiFillGoogleCircle className='w-6 h-6 mr-2'/>
                Continue with Google
            </Button>
            <Button type='button' gradientDuoTone='cyanToBlue' outline onClick={handleGithubClick}>
                <AiFillGithub className='w-6 h-6 mr-2'/>
                Continue with GitHub
            </Button>
        </div>
    )
}