import { fireEvent, screen, userEvent } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { Linking } from 'react-native';

import { ApiError } from '@/api/client';
import { twoFactorApi, userApi } from '@/api/endpoints';
import type { User } from '@/api/types';
import { DangerZone } from '@/components/settings/danger-zone';
import { EmailSection } from '@/components/settings/email-section';
import { TwoFactorSection } from '@/components/settings/two-factor-section';
import { user } from '@/test/fixtures';
import { renderScreen } from '@/test/render-screen';

const mockUser = jest.fn();
const mockSession = { updateUser: jest.fn(), clearSession: jest.fn() };

jest.mock('@/api/endpoints');
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('react-native-qrcode-svg', () => 'QRCode');
jest.mock('@/session/session-context', () => ({ useCurrentUser: () => mockUser(), useSession: () => mockSession }));

const PASSWORD = 'Subtrack#2026';
const SETUP = { secret: 'AAAABBBBCCCCDDDD', otpauthUri: 'otpauth://totp/Subtrack:demo@subtrack.example?secret=AAAABBBBCCCCDDDD&issuer=Subtrack' };
const RECOVERY_CODES = ['ABCD-EFGH', 'IJKL-MNOP'];

beforeEach(() => {
  jest.clearAllMocks();
  mockUser.mockReturnValue(user());
  // What the real session does: the next render sees the updated account.
  mockSession.updateUser.mockImplementation((updated: User) => mockUser.mockReturnValue(updated));
});

describe('two-factor', () => {
  async function startSetup() {
    jest.mocked(twoFactorApi.setup).mockResolvedValue(SETUP);
    await renderScreen(<TwoFactorSection />);
    await userEvent.press(screen.getByRole('button', { name: 'Set up two-factor' }));
    await userEvent.type(screen.getByLabelText('Password'), PASSWORD);
    await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  }

  it('asks for the password, then offers the key, the QR code and the authenticator app', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await startSetup();

    expect(twoFactorApi.setup).toHaveBeenCalledWith({ currentPassword: PASSWORD });
    expect(screen.getByText('Off')).toBeOnTheScreen();
    expect(screen.getByText('AAAA BBBB CCCC DDDD')).toBeOnTheScreen();
    expect(screen.getByLabelText('QR code for your authenticator app')).toBeOnTheScreen();

    await userEvent.press(screen.getByRole('button', { name: 'Open authenticator app' }));
    expect(openURL).toHaveBeenCalledWith(SETUP.otpauthUri);
  });

  it('ignores Enter until the password and then the whole code are typed', async () => {
    jest.mocked(twoFactorApi.setup).mockResolvedValue(SETUP);
    await renderScreen(<TwoFactorSection />);
    await userEvent.press(screen.getByRole('button', { name: 'Set up two-factor' }));

    await fireEvent(screen.getByLabelText('Password'), 'submitEditing');
    expect(twoFactorApi.setup).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('Password'), PASSWORD, { submitEditing: true });
    expect(twoFactorApi.setup).toHaveBeenCalledWith({ currentPassword: PASSWORD });

    await userEvent.type(await screen.findByLabelText('Code'), '12345', { submitEditing: true });
    expect(twoFactorApi.enable).not.toHaveBeenCalled();
  });

  it('copies the key as one piece, without the spaces', async () => {
    await startSetup();

    await userEvent.press(screen.getByRole('button', { name: 'Copy key' }));

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('AAAABBBBCCCCDDDD');
    expect(screen.getByText('Key copied')).toBeOnTheScreen();
  });

  it('says so when the phone has no authenticator app', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('No Activity found to handle Intent'));
    await startSetup();

    await userEvent.press(screen.getByRole('button', { name: 'Open authenticator app' }));

    expect(await screen.findByText(/^No authenticator app was found on this phone/)).toBeOnTheScreen();
  });

  it('turns on with a code from the app and shows the recovery codes once', async () => {
    jest.mocked(twoFactorApi.enable).mockResolvedValue({ recoveryCodes: RECOVERY_CODES });
    await startSetup();

    await userEvent.type(screen.getByLabelText('Code'), '123456');
    await userEvent.press(screen.getByRole('button', { name: 'Turn on' }));

    expect(twoFactorApi.enable).toHaveBeenCalledWith('123456');
    expect(mockSession.updateUser).toHaveBeenCalledWith(expect.objectContaining({ twoFactorEnabled: true }));
    expect(await screen.findByText('Two-factor authentication is on')).toBeOnTheScreen();
    expect(screen.getByText('On')).toBeOnTheScreen();
    expect(screen.getByText('ABCD-EFGH')).toBeOnTheScreen();

    await userEvent.press(screen.getByRole('button', { name: 'Copy codes' }));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('ABCD-EFGH\nIJKL-MNOP');

    await userEvent.press(screen.getByRole('button', { name: "I've saved them" }));
    expect(screen.queryByText('ABCD-EFGH')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Turn off two-factor' })).toBeOnTheScreen();
  });

  it('stays off when the code is wrong, and clears the box for another try', async () => {
    jest.mocked(twoFactorApi.enable).mockRejectedValue(new ApiError(400, 'INVALID_CODE', 'That code is not valid'));
    await startSetup();

    await userEvent.type(screen.getByLabelText('Code'), '000000');
    await userEvent.press(screen.getByRole('button', { name: 'Turn on' }));

    expect(await screen.findByText('That code is not valid')).toBeOnTheScreen();
    expect(screen.getByLabelText('Code')).toHaveDisplayValue('');
    expect(mockSession.updateUser).not.toHaveBeenCalled();
  });

  it('refuses a wrong password before any key is created', async () => {
    jest.mocked(twoFactorApi.setup).mockRejectedValue(new ApiError(403, 'WRONG_PASSWORD', 'Your current password is incorrect'));
    await renderScreen(<TwoFactorSection />);

    await userEvent.press(screen.getByRole('button', { name: 'Set up two-factor' }));
    await userEvent.type(screen.getByLabelText('Password'), 'not-my-password');
    await userEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Your current password is incorrect')).toBeOnTheScreen();
    expect(screen.queryByText('Or type this key by hand:')).not.toBeOnTheScreen();
  });

  it('asks an account that has no password for an emailed code instead', async () => {
    mockUser.mockReturnValue(user({ hasPassword: false }));
    jest.mocked(userApi.sendConfirmationCode).mockResolvedValue(undefined);
    jest.mocked(twoFactorApi.setup).mockResolvedValue(SETUP);
    await renderScreen(<TwoFactorSection />);

    await userEvent.press(screen.getByRole('button', { name: 'Set up two-factor' }));
    expect(twoFactorApi.setup).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();

    await userEvent.press(screen.getByRole('button', { name: 'Email me a code' }));
    await userEvent.type(screen.getByLabelText('Code'), '123456');
    await userEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(twoFactorApi.setup).toHaveBeenCalledWith({ confirmationCode: '123456' });
    expect(await screen.findByText('AAAA BBBB CCCC DDDD')).toBeOnTheScreen();
  });

  it('turns off only with a code from the app or a recovery code', async () => {
    mockUser.mockReturnValue(user({ twoFactorEnabled: true }));
    jest.mocked(twoFactorApi.disable).mockResolvedValue(undefined);
    await renderScreen(<TwoFactorSection />);

    await userEvent.press(screen.getByRole('button', { name: 'Turn off two-factor' }));
    expect(screen.getByRole('button', { name: 'Turn off' })).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Authenticator or recovery code'), 'ABCD-EFGH');
    await userEvent.press(screen.getByRole('button', { name: 'Turn off' }));

    expect(twoFactorApi.disable).toHaveBeenCalledWith('ABCD-EFGH');
    expect(mockSession.updateUser).toHaveBeenCalledWith(expect.objectContaining({ twoFactorEnabled: false }));
    expect(await screen.findByText('Two-factor authentication is off')).toBeOnTheScreen();
  });
});

describe('email address', () => {
  async function requestChange() {
    jest.mocked(userApi.requestEmailChange).mockResolvedValue(undefined);
    await renderScreen(<EmailSection />);
    await userEvent.type(screen.getByLabelText('New email'), ' new@subtrack.example ');
    await userEvent.type(screen.getByLabelText('Current password'), PASSWORD);
    await userEvent.press(screen.getByRole('button', { name: 'Send confirmation code' }));
  }

  it('sends a code to the new address and changes the email only once it is confirmed', async () => {
    const changed = user({ email: 'new@subtrack.example' });
    jest.mocked(userApi.confirmEmailChange).mockResolvedValue(changed);
    await requestChange();

    expect(userApi.requestEmailChange).toHaveBeenCalledWith('new@subtrack.example', { currentPassword: PASSWORD });
    expect(mockSession.updateUser).not.toHaveBeenCalled();
    expect(screen.getByText('Currently demo@subtrack.example')).toBeOnTheScreen();

    await userEvent.type(screen.getByLabelText('Code'), '123456');
    await userEvent.press(screen.getByRole('button', { name: 'Confirm new email' }));

    expect(userApi.confirmEmailChange).toHaveBeenCalledWith('123456');
    expect(mockSession.updateUser).toHaveBeenCalledWith(changed);
    expect(await screen.findByText('Email address changed')).toBeOnTheScreen();
    expect(screen.getByText('Currently new@subtrack.example')).toBeOnTheScreen();
    expect(screen.getByLabelText('New email')).toHaveDisplayValue('');
  });

  it('stops a badly formed new email before calling the API', async () => {
    await renderScreen(<EmailSection />);

    await userEvent.type(screen.getByLabelText('New email'), 'new@subtrack');
    await userEvent.type(screen.getByLabelText('Current password'), PASSWORD);
    await userEvent.press(screen.getByRole('button', { name: 'Send confirmation code' }));

    expect(screen.getByText('Enter a full email address, like name@example.com')).toBeOnTheScreen();
    expect(userApi.requestEmailChange).not.toHaveBeenCalled();
  });

  it('says why when the change could not be started', async () => {
    jest
      .mocked(userApi.requestEmailChange)
      .mockRejectedValue(new ApiError(429, 'RATE_LIMITED', 'Wait a minute before requesting another code'));
    await renderScreen(<EmailSection />);

    await userEvent.type(screen.getByLabelText('New email'), 'new@subtrack.example');
    await userEvent.type(screen.getByLabelText('Current password'), PASSWORD);
    await userEvent.press(screen.getByRole('button', { name: 'Send confirmation code' }));

    expect(await screen.findByText('Wait a minute before requesting another code')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Code')).not.toBeOnTheScreen();
  });

  it('ignores Enter until the whole confirmation code is typed', async () => {
    await requestChange();

    await userEvent.type(screen.getByLabelText('Code'), '12345', { submitEditing: true });

    expect(userApi.confirmEmailChange).not.toHaveBeenCalled();
  });

  it('keeps the old email when the code is wrong', async () => {
    jest.mocked(userApi.confirmEmailChange).mockRejectedValue(new ApiError(400, 'INVALID_CODE', 'That code is invalid or has expired'));
    await requestChange();

    await userEvent.type(screen.getByLabelText('Code'), '000000');
    await userEvent.press(screen.getByRole('button', { name: 'Confirm new email' }));

    expect(await screen.findByText('That code is invalid or has expired')).toBeOnTheScreen();
    expect(mockSession.updateUser).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Code')).toHaveDisplayValue('');
  });

  it('can be cancelled while waiting for the code', async () => {
    await requestChange();

    await userEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByLabelText('New email')).toHaveDisplayValue('new@subtrack.example');
    expect(userApi.confirmEmailChange).not.toHaveBeenCalled();
  });

  it('asks an account without a password for an emailed code before starting the change', async () => {
    mockUser.mockReturnValue(user({ hasPassword: false }));
    jest.mocked(userApi.sendConfirmationCode).mockResolvedValue(undefined);
    jest.mocked(userApi.requestEmailChange).mockResolvedValue(undefined);
    await renderScreen(<EmailSection />);

    await userEvent.type(screen.getByLabelText('New email'), 'new@subtrack.example');
    expect(screen.getByRole('button', { name: 'Send confirmation code' })).toBeDisabled();

    await userEvent.press(screen.getByRole('button', { name: 'Email me a code' }));
    await userEvent.type(screen.getByLabelText('Code'), '123456');
    await userEvent.press(screen.getByRole('button', { name: 'Send confirmation code' }));

    expect(userApi.requestEmailChange).toHaveBeenCalledWith('new@subtrack.example', { confirmationCode: '123456' });
    expect(await screen.findByText(/Enter the code we sent to new@subtrack\.example/)).toBeOnTheScreen();
  });
});

describe('delete account', () => {
  it('asks for the password, deletes, then forgets the session on this device', async () => {
    jest.mocked(userApi.deleteAccount).mockResolvedValue(undefined);
    await renderScreen(<DangerZone />);

    await userEvent.press(screen.getByRole('button', { name: 'Delete my account' }));
    expect(screen.getByText('Everything tied to demo@subtrack.example will be removed for good.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Delete forever' })).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Your password'), PASSWORD);
    await userEvent.press(screen.getByRole('button', { name: 'Delete forever' }));

    expect(userApi.deleteAccount).toHaveBeenCalledWith({ currentPassword: PASSWORD });
    expect(mockSession.clearSession).toHaveBeenCalled();
  });

  it('keeps the account and the session when the password is wrong', async () => {
    jest.mocked(userApi.deleteAccount).mockRejectedValue(new ApiError(403, 'WRONG_PASSWORD', 'Your current password is incorrect'));
    await renderScreen(<DangerZone />);

    await userEvent.press(screen.getByRole('button', { name: 'Delete my account' }));
    await userEvent.type(screen.getByLabelText('Your password'), 'not-my-password');
    await userEvent.press(screen.getByRole('button', { name: 'Delete forever' }));

    expect(await screen.findByText('Your current password is incorrect')).toBeOnTheScreen();
    expect(mockSession.clearSession).not.toHaveBeenCalled();
  });

  it('asks an account without a password for an emailed code instead', async () => {
    mockUser.mockReturnValue(user({ hasPassword: false }));
    jest.mocked(userApi.sendConfirmationCode).mockResolvedValue(undefined);
    jest.mocked(userApi.deleteAccount).mockResolvedValue(undefined);
    await renderScreen(<DangerZone />);

    await userEvent.press(screen.getByRole('button', { name: 'Delete my account' }));
    await userEvent.press(screen.getByRole('button', { name: 'Email me a code' }));
    await userEvent.type(screen.getByLabelText('Code'), '12345');
    expect(screen.getByRole('button', { name: 'Delete forever' })).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Code'), '6');
    await userEvent.press(screen.getByRole('button', { name: 'Delete forever' }));

    expect(userApi.deleteAccount).toHaveBeenCalledWith({ confirmationCode: '123456' });
  });

  it('does nothing when the user decides to keep the account', async () => {
    await renderScreen(<DangerZone />);

    await userEvent.press(screen.getByRole('button', { name: 'Delete my account' }));
    await userEvent.type(screen.getByLabelText('Your password'), PASSWORD);
    await userEvent.press(screen.getByRole('button', { name: 'Keep my account' }));

    expect(userApi.deleteAccount).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Delete my account' })).toBeOnTheScreen();
    expect(screen.queryByLabelText('Your password')).not.toBeOnTheScreen();
  });
});
