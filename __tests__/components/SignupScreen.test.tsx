import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { SignupScreen } from '@/screens/auth/SignupScreen';

const mockSignUp = jest.fn<Promise<void>, [string, string, string]>();
const mockGoBack = jest.fn();
let mockLoading = false;
let mockError: string | null = null;

jest.mock('@/api/authApi', () => ({
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
  onAuthStateChange: jest.fn(),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: jest.fn(),
    signUp: mockSignUp,
    signOut: jest.fn(),
    initialize: jest.fn(),
    loading: mockLoading,
    error: mockError,
    session: null,
    profile: null,
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('SignupScreen', () => {
  beforeEach(() => {
    mockLoading = false;
    mockError = null;
    mockGoBack.mockReset();
    mockSignUp.mockReset().mockResolvedValue(undefined);
  });

  it('renders all 4 inputs and submit button', () => {
    render(<SignupScreen />);

    expect(screen.getByLabelText('Display Name')).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.getByLabelText('Confirm Password')).toBeTruthy();
    expect(screen.getByText('Create Account')).toBeTruthy();
  });

  it('shows validation error when display name is too short', async () => {
    render(<SignupScreen />);

    fireEvent.changeText(screen.getByLabelText('Display Name'), 'A');
    fireEvent.changeText(screen.getByLabelText('Email'), 'user@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'password123');
    fireEvent.changeText(screen.getByLabelText('Confirm Password'), 'password123');
    fireEvent.press(screen.getByRole('button'));

    expect(await screen.findByText('Display name must be at least 2 characters.')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('shows validation error when passwords do not match', async () => {
    render(<SignupScreen />);

    fireEvent.changeText(screen.getByLabelText('Display Name'), 'Alex');
    fireEvent.changeText(screen.getByLabelText('Email'), 'user@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'password123');
    fireEvent.changeText(screen.getByLabelText('Confirm Password'), 'password124');
    fireEvent.press(screen.getByRole('button'));

    expect(await screen.findByText('Passwords do not match.')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('shows validation error when password < 8 chars', async () => {
    render(<SignupScreen />);

    fireEvent.changeText(screen.getByLabelText('Display Name'), 'Alex');
    fireEvent.changeText(screen.getByLabelText('Email'), 'user@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'short');
    fireEvent.changeText(screen.getByLabelText('Confirm Password'), 'short');
    fireEvent.press(screen.getByRole('button'));

    expect(await screen.findByText('Password must be at least 8 characters.')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('calls signUp with correct args on valid submit', async () => {
    render(<SignupScreen />);

    fireEvent.changeText(screen.getByLabelText('Display Name'), 'Alex');
    fireEvent.changeText(screen.getByLabelText('Email'), 'user@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'password123');
    fireEvent.changeText(screen.getByLabelText('Confirm Password'), 'password123');
    fireEvent.press(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('user@example.com', 'password123', 'Alex');
    });
  });

  it('navigates back when sign in link is pressed', () => {
    render(<SignupScreen />);

    fireEvent.press(screen.getByText('Already have an account? Sign in'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
