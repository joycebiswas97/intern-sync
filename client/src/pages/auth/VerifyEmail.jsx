import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { verifyEmail } from '../../api/auth';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [status, setStatus] = useState(token ? 'verifying' : 'waiting');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      verifyEmail(token)
        .then(() => {
          setStatus('success');
          setMessage('Your email has been verified successfully!');
          setTimeout(() => navigate('/login'), 3000);
        })
        .catch((err) => {
          setStatus('error');
          setMessage(err.response?.data?.message || 'Verification failed. Token may be invalid or expired.');
        });
    }
  }, [token, navigate]);

  return (
    <div className="max-w-md mx-auto py-12">
      <Card>
        <Card.Header>
          <Card.Title>Verify Your Email</Card.Title>
        </Card.Header>
        <Card.Content className="text-center space-y-4">
          {status === 'waiting' && (
            <p className="text-gray-600">
              We've sent a verification link to your email address. Please click the link to activate your account.
            </p>
          )}
          {status === 'verifying' && <p className="text-gray-600">Verifying your email...</p>}
          {status === 'success' && <p className="text-green-600">{message}<br/>Redirecting to login...</p>}
          {status === 'error' && (
            <>
              <p className="text-red-600">{message}</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/login')}>Go to Login</Button>
            </>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
