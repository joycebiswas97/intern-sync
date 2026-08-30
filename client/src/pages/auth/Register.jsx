import React from 'react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';

export default function Register() {
  return (
    <div className="max-w-md mx-auto py-12">
      <Card>
        <Card.Header>
          <Card.Title>Create an Account</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-4">
          <Input label="Full Name (or Company Name)" type="text" placeholder="John Doe" />
          <Input label="Email Address" type="email" placeholder="you@example.com" />
          <Input label="Password" type="password" placeholder="••••••••" />
          <Select 
            label="I am a..." 
            options={[
              { value: 'STUDENT', label: 'Student looking for opportunities' },
              { value: 'EMPLOYER', label: 'Employer posting opportunities' }
            ]} 
          />
          <Button variant="primary" className="w-full mt-4">Sign Up</Button>
        </Card.Content>
      </Card>
    </div>
  );
}
