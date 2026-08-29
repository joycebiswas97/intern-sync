import React from 'react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function ResetPassword() {
  return (
    <div className="max-w-md mx-auto py-12">
      <Card>
        <Card.Header>
          <Card.Title>Set New Password</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-4">
          <Input label="New Password" type="password" placeholder="••••••••" />
          <Input label="Confirm New Password" type="password" placeholder="••••••••" />
          <Button variant="primary" className="w-full mt-4">Reset Password</Button>
        </Card.Content>
      </Card>
    </div>
  );
}
