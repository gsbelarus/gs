import { AppBar, Tabs, Tab, Stack, TextField } from '@mui/material';
import Button from '@mui/material/Button';
import { Box } from '@mui/system';
import { useInterpret, useSelector } from '@xstate/react';
import { useMemo } from 'react';
import { assign, createMachine, MachineConfig } from 'xstate';
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

const machineConfig: MachineConfig<IContext, any, Event> = {
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
};

export interface SignInSignUpProps {
  onCheckUser?: (userName: string, userPassword: string) => LoginResult;
};

export function SignInSignUp(props: SignInSignUpProps) {

  const service = useInterpret(createMachine(machineConfig));
  const stateValue = useSelector(service, state => state.value );
  const userName = useSelector(service, state => state.context.userName );
  const password = useSelector(service, state => state.context.password );

  const { sendSignIn, sendSignUp, getHandleChange } = useMemo( () => ({
    sendSignIn: () => service.send('SIGNIN'),
    sendSignUp: () => service.send('SIGNUP'),
    getHandleChange: (fieldName: keyof IContext) => (event: React.ChangeEvent<HTMLInputElement>) =>
      service.send('UPDATE', { [fieldName]: event.target.value })
  }), [service]);

  return (
    <Box sx={{ bgcolor: 'background.paper', width: 500 }}>
      <AppBar position="static">
        <Tabs
          value={stateValue}
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
        stateValue === 'signIn'
        ?
          <Box p={2}>
            <Stack
              direction="column"
              spacing={2}
            >
              <TextField
                label="Login"
                value={userName}
                onChange={getHandleChange('userName')}
              />
              <TextField
                label="Password"
                type="password"
                value={password}
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
