import React from 'react';
import { render, screen } from '@testing-library/react';
import Nav from './nav';

test('renders learn react link', () => {
  const location = {
    pathname: '/repositories'
  }
  render(<Nav location={location} />);
  const linkElement = screen.getByText('Repositories');
  expect(linkElement).toBeInTheDocument();
});
