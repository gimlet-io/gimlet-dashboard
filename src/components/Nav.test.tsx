import React from 'react';
import { render, screen } from '@testing-library/react';
import Nav from './Nav';

test('renders learn react link', () => {
  render(<Nav />);
  const linkElement = screen.getByText('Services');
  expect(linkElement).toBeInTheDocument();
});
