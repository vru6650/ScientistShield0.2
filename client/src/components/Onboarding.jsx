import { useEffect, useState } from 'react';
import { Steps } from 'intro.js-react';
import 'intro.js/introjs.css';

export default function Onboarding() {
  const [enabled, setEnabled] = useState(false);
  const steps = [
    {
      element: '#tutorial-link',
      intro: 'Browse interactive tutorials here.',
    },
    {
      element: '#quiz-link',
      intro: 'Challenge yourself with quizzes.',
    },
    {
      element: '#editor-link',
      intro: 'Practice coding in the live editor.',
    },
  ];

  useEffect(() => {
    if (!localStorage.getItem('hasSeenOnboarding')) {
      setEnabled(true);
    }
  }, []);

  const handleExit = () => {
    setEnabled(false);
    localStorage.setItem('hasSeenOnboarding', 'true');
  };

  return <Steps enabled={enabled} steps={steps} initialStep={0} onExit={handleExit} />;
}
