import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { Checkbox } from '@/components/ui';

describe('Checkbox', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders unchecked state', () => {
    render(<Checkbox checked={false} onToggle={jest.fn()} />);

    expect(screen.getByRole('checkbox').props.accessibilityState).toMatchObject({ checked: false });
    expect(screen.queryByText('✓')).toBeNull();
  });

  it('renders checked state', () => {
    render(<Checkbox checked onToggle={jest.fn()} />);
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(screen.getByRole('checkbox').props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByText('✓')).toBeTruthy();
  });

  it('calls onToggle when pressed', () => {
    const onToggle = jest.fn();

    render(<Checkbox checked={false} onToggle={onToggle} />);

    fireEvent.press(screen.getByRole('checkbox'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onToggle when disabled', () => {
    const onToggle = jest.fn();

    render(<Checkbox checked={false} disabled onToggle={onToggle} />);

    fireEvent.press(screen.getByRole('checkbox'));

    expect(onToggle).not.toHaveBeenCalled();
  });

  it('renders label text', () => {
    render(<Checkbox checked={false} label="Assign to me" onToggle={jest.fn()} />);

    expect(screen.getByText('Assign to me')).toBeTruthy();
  });

  it('has correct accessibilityRole="checkbox"', () => {
    render(<Checkbox checked={false} onToggle={jest.fn()} />);

    expect(screen.getByRole('checkbox')).toBeTruthy();
  });

  it('has correct accessibilityState checked/unchecked', () => {
    const { rerender } = render(<Checkbox checked={false} onToggle={jest.fn()} />);

    expect(screen.getByRole('checkbox').props.accessibilityState).toMatchObject({ checked: false });

    rerender(<Checkbox checked onToggle={jest.fn()} />);
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(screen.getByRole('checkbox').props.accessibilityState).toMatchObject({ checked: true });
  });
});
