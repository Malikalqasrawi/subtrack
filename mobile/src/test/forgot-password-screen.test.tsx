import { screen, userEvent } from '@testing-library/react-native';

import { ApiError } from '@/api/client';
import { authApi } from '@/api/endpoints';
import ForgotPasswordScreen from '@/app/forgot-password';
import { renderScreen } from '@/test/render-screen';

const mockRouter = { push: jest.fn(), dismissTo: jest.fn() };

jest.mock('@/api/endpoints');
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ email: 'demo@subtrack.example' }),
}));

async function requestCode() {
  jest.mocked(authApi.forgotPassword).mockResolvedValue(undefined);
  await renderScreen(<ForgotPasswordScreen />);
  await userEvent.press(screen.getByRole('button', { name: 'Send reset code' }));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ForgotPasswordScreen', () => {
  it('starts with the email typed on the sign-in screen and asks for a code', async () => {
    await requestCode();

    expect(authApi.forgotPassword).toHaveBeenCalledWith('demo@subtrack.example');
    expect(screen.getByRole('header', { name: 'Choose a new password' })).toBeOnTheScreen();
  });

  it('says the same thing whether or not the account exists', async () => {
    await requestCode();

    expect(screen.getByText(/^If demo@subtrack.example has an account/)).toBeOnTheScreen();
  });

  it('changes the password and returns to sign in', async () => {
    jest.mocked(authApi.resetPassword).mockResolvedValue(undefined);
    await requestCode();

    await userEvent.type(screen.getByLabelText('Code'), '123456');
    await userEvent.type(screen.getByLabelText('New password'), 'Subtrack#2027');
    await userEvent.press(screen.getByRole('button', { name: 'Change password' }));

    expect(authApi.resetPassword).toHaveBeenCalledWith('demo@subtrack.example', '123456', 'Subtrack#2027');
    expect(mockRouter.dismissTo).toHaveBeenCalledWith({ pathname: '/sign-in', params: { passwordChanged: '1' } });
  });

  it('keeps the button off until the code is complete and the password is strong', async () => {
    await requestCode();

    await userEvent.type(screen.getByLabelText('Code'), '12345');
    await userEvent.type(screen.getByLabelText('New password'), 'Subtrack#2027');
    expect(screen.getByRole('button', { name: 'Change password' })).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Code'), '6');
    expect(screen.getByRole('button', { name: 'Change password' })).toBeEnabled();
  });

  it('shows a refused code and stays on the screen', async () => {
    jest.mocked(authApi.resetPassword).mockRejectedValue(new ApiError(400, 'INVALID_CODE', 'That code is invalid or has expired'));
    await requestCode();

    await userEvent.type(screen.getByLabelText('Code'), '000000');
    await userEvent.type(screen.getByLabelText('New password'), 'Subtrack#2027');
    await userEvent.press(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText('That code is invalid or has expired')).toBeOnTheScreen();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });
});
