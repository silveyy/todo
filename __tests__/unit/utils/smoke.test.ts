import { APP_NAME } from '@/utils';

describe('project scaffold', () => {
  it('exposes the application name constant', () => {
    expect(APP_NAME).toBe('Todo');
  });
});
