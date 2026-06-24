import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { LoginScreen } from '@/screens/auth/LoginScreen';

const mockSignIn = jest.fn<Promise<void>, [string, string]>();
const mockNavigate = jest.fn();
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
    signIn: mockSignIn,
    loading: mockLoading,
    error: mockError,
    session: null,
    profile: null,
    signUp: jest.fn(),
    signOut: jest.fn(),
    initialize: jest.fn(),
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    mockLoading = false;
    mockError = null;
    mockNavigate.mockReset();
    mockSignIn.mockReset().mockResolvedValue(undefined);
  });

  it('renders email input, password input, sign in button', () => {
    render(<LoginScreen />);

    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.getByText('Sign In')).toBeTruthy();
  });

  it('shows validation error when email is empty on submit', async () => {
    render(<LoginScreen />);

    fireEvent.changeText(screen.getByLabelText('Password'), 'password123');
    fireEvent.press(screen.getByRole('button'));

    expect(await screen.findByText('Email is required.')).toBeTruthy();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('shows validation error when password is empty on submit', async () => {
    render(<LoginScreen />);

    fireEvent.changeText(screen.getByLabelText('Email'), 'user@example.com');
    fireEvent.press(screen.getByRole('button'));

    expect(await screen.findByText('Password is required.')).toBeTruthy();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('calls signIn with correct email and password on valid submit', async () => {
    render(<LoginScreen />);

    fireEvent.changeText(screen.getByLabelText('Email'), 'user@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'password123');
    fireEvent.press(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('user@example.com', 'password123');
    });
  });

  it('shows error message when auth error is set', () => {
    mockError = 'Invalid credentials';

    render(<LoginScreen />);

    expect(screen.getByText('Invalid credentials')).toBeTruthy();
  });

  it('disables button and shows loading when loading=true', () => {
    mockLoading = true;

    render(<LoginScreen />);

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByTestId('button-loading-indicator')).toBeTruthy();
  });

  it('navigates to Signup when sign up link is pressed', () => {
    render(<LoginScreen />);

    fireEvent.press(screen.getByText("Don't have an account? Sign up"));

    expect(mockNavigate).toHaveBeenCalledWith('Signup');
  });
});
