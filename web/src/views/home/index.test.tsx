import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/utils/render';
import Home from '@/views/home';

describe('Home', () => {
  it('renders localized content and the initial counter value', () => {
    renderWithProviders(<Home />, {
      route: '/home',
      locale: 'en',
    });

    expect(screen.getByRole('heading', { name: 'React Templates' })).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent === 'Current Count: 0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '-1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });
});
