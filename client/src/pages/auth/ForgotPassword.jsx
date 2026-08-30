import React from 'react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function ForgotPassword() {
  return (
    <div className="max-w-md mx-auto py-12">
      <Card>
        <Card.Header>
          <Card.Title>Reset Password</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
          <Input label="Email Address" type="email" placeholder="you@example.com" />
          <Button variant="primary" className="w-full mt-4">Send Reset Link</Button>
        </Card.Content>
      </Card>
    </div>
  );
}
