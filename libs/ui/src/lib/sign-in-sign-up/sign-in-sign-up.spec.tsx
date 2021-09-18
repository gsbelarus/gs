import { render } from '@testing-library/react';

import SignInSignUp from './sign-in-sign-up';

describe('SignInSignUp', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<SignInSignUp />);
    expect(baseElement).toBeTruthy();
  });
});
