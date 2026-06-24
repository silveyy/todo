# Maestro E2E Tests

## Prerequisites

Install Maestro CLI:

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

## Test credentials

Export the required credentials first:

```bash
export TEST_USER_A_EMAIL="user-a@example.com"
export TEST_USER_A_PASSWORD="password-for-user-a"
export TEST_USER_B_EMAIL="user-b@example.com"
export TEST_USER_B_PASSWORD="password-for-user-b"
```

Pass them through to Maestro when running flows:

```bash
-e TEST_USER_A_EMAIL="$TEST_USER_A_EMAIL" \
-e TEST_USER_A_PASSWORD="$TEST_USER_A_PASSWORD" \
-e TEST_USER_B_EMAIL="$TEST_USER_B_EMAIL" \
-e TEST_USER_B_PASSWORD="$TEST_USER_B_PASSWORD"
```

## Run all flows

```bash
maestro test __tests__/e2e/ \
  -e TEST_USER_A_EMAIL="$TEST_USER_A_EMAIL" \
  -e TEST_USER_A_PASSWORD="$TEST_USER_A_PASSWORD" \
  -e TEST_USER_B_EMAIL="$TEST_USER_B_EMAIL" \
  -e TEST_USER_B_PASSWORD="$TEST_USER_B_PASSWORD"
```

## Run a single flow

```bash
maestro test __tests__/e2e/01_login.yaml \
  -e TEST_USER_A_EMAIL="$TEST_USER_A_EMAIL" \
  -e TEST_USER_A_PASSWORD="$TEST_USER_A_PASSWORD"
```

## Simulator vs real device

- iOS simulator: use `maestro test ...` after booting the simulator and launching the Expo app build.
- Android emulator: use `maestro test ...` after booting the emulator and installing the app.
- Real device: connect the device, confirm Maestro can see it, then run the same commands.

## Known limitations

- The offline sync flow uses `setAirplaneMode`, which only affects Android connectivity in Maestro.
- For reliable offline coverage, run `03_offline_sync.yaml` on a physical Android device.
- CI execution needs a separate Maestro Cloud project plus uploaded app binaries before the E2E suite can run automatically.
