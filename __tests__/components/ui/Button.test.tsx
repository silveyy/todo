import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { Button } from '@/components/ui';

describe('Button', () => {
  it('renders primary variant with correct text', () => {
    render(<Button onPress={jest.fn()}>Save</Button>);

    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();

    render(<Button onPress={onPress}>Save</Button>);

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onPress when disabled', () => {
    const onPress = jest.fn();

    render(
      <Button disabled onPress={onPress}>
        Save
      </Button>,
    );

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows ActivityIndicator when loading=true', () => {
    render(
      <Button loading onPress={jest.fn()}>
        Save
      </Button>,
    );

    expect(screen.getByTestId('button-loading-indicator')).toBeTruthy();
  });

  it('does NOT call onPress when loading=true', () => {
    const onPress = jest.fn();

    render(
      <Button loading onPress={onPress}>
        Save
      </Button>,
    );

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders all 4 variants without crashing', () => {
    render(
      <>
        <Button onPress={jest.fn()} variant="primary">
          Primary
        </Button>
        <Button onPress={jest.fn()} variant="secondary">
          Secondary
        </Button>
        <Button onPress={jest.fn()} variant="destructive">
          Destructive
        </Button>
        <Button onPress={jest.fn()} variant="ghost">
          Ghost
        </Button>
      </>,
    );

    expect(screen.getByText('Primary')).toBeTruthy();
    expect(screen.getByText('Secondary')).toBeTruthy();
    expect(screen.getByText('Destructive')).toBeTruthy();
    expect(screen.getByText('Ghost')).toBeTruthy();
  });

  it('has accessible label', () => {
    render(
      <Button accessibilityLabel="Create todo" onPress={jest.fn()}>
        Save
      </Button>,
    );

    expect(screen.getByLabelText('Create todo')).toBeTruthy();
  });
});
