import React from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export default function VerifyEmail() {
  return (
    <div className="max-w-md mx-auto py-12">
      <Card>
        <Card.Header>
          <Card.Title>Verify Your Email</Card.Title>
        </Card.Header>
        <Card.Content className="text-center space-y-4">
          <p className="text-gray-600">
            We've sent a verification link to your email address. Please click the link to activate your account.
          </p>
          <Button variant="outline" className="mt-4">Resend Verification Email</Button>
        </Card.Content>
      </Card>
    </div>
  );
}
