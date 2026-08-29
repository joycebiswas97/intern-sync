import React from 'react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function Login() {
  return (
    <div className="max-w-md mx-auto py-12">
      <Card>
        <Card.Header>
          <Card.Title>Login to InternSync</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-4">
          <Input label="Email Address" type="email" placeholder="you@example.com" />
          <Input label="Password" type="password" placeholder="••••••••" />
          <Button variant="primary" className="w-full mt-4">Sign In</Button>
        </Card.Content>
      </Card>
    </div>
  );
}
