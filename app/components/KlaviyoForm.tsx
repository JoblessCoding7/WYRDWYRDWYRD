import {useState, useEffect} from 'react';

export const KlaviyoForm = () => {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setShowEmailForm(true);
    }, 2000);
  }, []);

  useEffect(() => {
    if (localStorage.getItem('hasSubmitted')) {
      setHasSubmitted(true);
    }
  }, []);

  useEffect(() => {
    const handleButtonClick = (event: Event) => {
      const target = event.target as HTMLElement;

      if (target.matches('.klaviyo-form button[type="button"]')) {
        const formContainer = target.closest('.klaviyo-form');
        const emailInput = formContainer?.querySelector(
          'input[type="email"]',
        ) as HTMLInputElement;

        if (
          emailInput &&
          emailInput.value.trim() !== '' &&
          /\S+@\S+\.\S+/.test(emailInput.value)
        ) {
          localStorage.setItem('hasSubmitted', 'true');
          setShowEmailForm(false);
        }
      }
    };

    document.addEventListener('click', handleButtonClick);

    return () => {
      document.removeEventListener('click', handleButtonClick);
    };
  }, []);

  const handleClose = () => {
    setShowEmailForm(false);
  };

  return (
    <div
      className={`klaviyo-signup-container ${
        showEmailForm && !hasSubmitted ? 'show' : ''
      }`}
    >
      <div className="klaviyo-form-container">
        <button className="close-button" onClick={handleClose}>
          CLOSE
        </button>
        <div className="klaviyo-form-WRB76G"></div>
      </div>
    </div>
  );
};
