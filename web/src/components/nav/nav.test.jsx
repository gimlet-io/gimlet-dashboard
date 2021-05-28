import React from 'react';
import { render, screen } from '@testing-library/react';
import Nav from './nav';

test('renders learn react link', () => {
  const location = {
    pathname: '/services'
  }
  render(<Nav location={location} />);
  const linkElement = screen.getByText('Services');
  expect(linkElement).toBeInTheDocument();
});
