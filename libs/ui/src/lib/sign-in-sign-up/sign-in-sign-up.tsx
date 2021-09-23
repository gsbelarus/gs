import { AppBar, Tabs, Tab, Stack, TextField } from '@mui/material';
import Button from '@mui/material/Button';
import { Box } from '@mui/system';
import { useMachine } from '@xstate/react';
import { useMemo } from 'react';
import { assign, createMachine } from 'xstate';
import './sign-in-sign-up.module.scss';

type LoginResult = 'OK' | 'INVALID_USER' | 'INVALID_PASSWORD' | 'ACCESS_DENIED';

interface IContext {
  userName?: string;
  password?: string;
};

type Event = { type: 'SIGNUP' }
  | { type: 'AUTHENTICATE' }
  | { type: 'UPDATE', data: Partial<IContext> }
  | { type: 'ERROR' }
  | { type: 'SUCCESS' }
  | { type: 'SIGNIN' }
  | { type: 'SIGNOUT' }
  | { type: 'REGISTER' };

export interface SignInSignUpProps {
  onCheckUser?: (userName: string, userPassword: string) => LoginResult;
};

export function SignInSignUp(props: SignInSignUpProps) {

  const [state, send] = useMachine( () => createMachine<IContext, Event>({
    id: 'signInSignUp',
    initial: 'signIn',
    context: { },
    states: {
      signIn: {
        on: {
          SIGNUP: 'signUp',
          AUTHENTICATE: 'authenticating',
          UPDATE: {
            actions: assign( (ctx, event) => ({ ...ctx, ...event.data }) )
          }
        }
      },
      authenticating: {
        on: {
          ERROR: 'signIn',
          SUCCESS: 'authenticated'
        }
      },
      authenticated: {
        on: {
          SIGNOUT: 'signIn'
        }
      },
      signUp: {
        on: {
          SIGNIN: 'signIn',
          REGISTER: 'registering'
        }
      },
      registering: {
        on: {
          ERROR: 'signUp',
          SUCCESS: 'registered'
        }
      },
      registered: {
        on: {
          SIGNIN: 'signIn'
        }
      }
    }
  }) );

  const { sendSignIn, sendSignUp } = useMemo( () => ({
    sendSignIn: () => send('SIGNIN'),
    sendSignUp: () => send('SIGNUP'),
  }), [send]);

  const getHandleChange = (fieldName: keyof IContext) => (event: React.ChangeEvent<HTMLInputElement>) => {
    send('UPDATE', { [fieldName]: event.target.value });
  };

  return (
    <Box sx={{ bgcolor: 'background.paper', width: 500 }}>
      <AppBar position="static">
        <Tabs
          value={state.value}
          indicatorColor="secondary"
          textColor="inherit"
          variant="fullWidth"
          aria-label="full width tabs example"
        >
          <Tab label="Sign In" value="signIn" onClick={sendSignIn} />
          <Tab label="Sign Up" value="signUp" onClick={sendSignUp}/>
        </Tabs>
      </AppBar>
      {
        state.value === 'signIn'
        ?
          <Box p={2}>
            <Stack
              direction="column"
              spacing={2}
            >
              <TextField
                label="Login"
                value={state.context.userName}
                onChange={getHandleChange('userName')}
              />
              <TextField
                label="Password"
                type="password"
                value={state.context.password}
                onChange={getHandleChange('password')}
              />
              <Button variant="contained">Login</Button>
            </Stack>
          </Box>
        :
          <Stack>
          </Stack>
      }
    </Box>
  );
};

export default SignInSignUp;
