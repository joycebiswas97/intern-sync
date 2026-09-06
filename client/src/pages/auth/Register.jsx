import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { register } from '../../api/auth';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const data = {
        email,
        password,
        role
      };
      
      if (role === 'STUDENT') {
        data.fullName = name;
      } else {
        data.companyName = name;
      }

      await register(data);
      setSuccess('Registration successful! Please login.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <Card>
        <Card.Header>
          <Card.Title>Create an Account</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-4">
          {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
          {success && <div className="text-green-500 text-sm mb-4">{success}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input 
              label={role === 'STUDENT' ? "Full Name" : "Company Name"} 
              type="text" 
              placeholder={role === 'STUDENT' ? "John Doe" : "Acme Corp"} 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input 
              label="Email Address" 
              type="email" 
              placeholder="you@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input 
              label="Password" 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Select 
              label="I am a..." 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              options={[
                { value: 'STUDENT', label: 'Student looking for opportunities' },
                { value: 'EMPLOYER', label: 'Employer posting opportunities' }
              ]} 
            />
            <Button type="submit" variant="primary" className="w-full mt-4" disabled={loading}>
              {loading ? 'Signing up...' : 'Sign Up'}
            </Button>
          </form>
        </Card.Content>
      </Card>
    </div>
  );
}
