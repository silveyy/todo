import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { TextInput, colors } from '@/components/ui';

describe('TextInput', () => {
  it('renders label text', () => {
    render(<TextInput label="Email" onChangeText={jest.fn()} value="" />);

    expect(screen.getByText('Email')).toBeTruthy();
  });

  it('shows error message when error prop set', () => {
    render(
      <TextInput
        error="Email is required"
        label="Email"
        onChangeText={jest.fn()}
        value=""
      />,
    );

    expect(screen.getByText('Email is required')).toBeTruthy();
  });

  it('applies red border style when error prop set', () => {
    render(
      <TextInput
        error="Email is required"
        label="Email"
        onChangeText={jest.fn()}
        value=""
      />,
    );

    expect(StyleSheet.flatten(screen.getByLabelText('Email').props.style)).toMatchObject({
      borderColor: colors.error,
    });
  });

  it('shows hint text when no error', () => {
    render(<TextInput hint="We'll never share your email" label="Email" value="" />);

    expect(screen.getByText("We'll never share your email")).toBeTruthy();
  });

  it('calls onChangeText with input value', () => {
    const onChangeText = jest.fn();

    render(<TextInput label="Email" onChangeText={onChangeText} value="" />);

    fireEvent.changeText(screen.getByLabelText('Email'), 'test@example.com');

    expect(onChangeText).toHaveBeenCalledWith('test@example.com');
  });

  it('sets accessibilityLabel from label prop', () => {
    render(<TextInput label="Email" onChangeText={jest.fn()} value="" />);

    expect(screen.getByLabelText('Email')).toBeTruthy();
  });
});
