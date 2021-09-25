import { AppBar, Tabs, Tab, Stack, TextField, Typography, Container } from '@mui/material';
import Button from '@mui/material/Button';
import { Box } from '@mui/system';
import { useInterpret, useSelector } from '@xstate/react';
import { useMemo, useEffect } from 'react';
import { assign, createMachine, MachineConfig } from 'xstate';
import './sign-in-sign-up.module.scss';

type LoginResult = 'OK' | 'INVALID_USER' | 'INVALID_PASSWORD' | 'ACCESS_DENIED';

interface IContext {
  userName: string;
  password: string;
  signedIn: boolean;
  error: string;
};

type UpdateEvent = { type: 'UPDATE', data: Partial<IContext> };

type Event = { type: 'SIGNUP' }
  | { type: 'AUTHENTICATE' }
  | UpdateEvent
  | { type: 'ERROR' }
  | { type: 'SUCCESS' }
  | { type: 'SIGNIN' }
  | { type: 'SIGNOUT' }
  | { type: 'REGISTER' };

const machineConfig: MachineConfig<IContext, any, Event> = {
  id: 'signInSignUp',
  initial: 'signIn',
  context: {
    userName: '',
    password: '',
    signedIn: false,
    error: ''
  },
  states: {
    signIn: {
      initial: 'empty',
      states: {
        empty: {
          on: {
            UPDATE: {
              target: 'check',
              actions: 'mergeContext'
            }
          }
        },
        ready: {
          on: {
            AUTHENTICATE: '#signInSignUp.authenticating',
            UPDATE: {
              target: 'check',
              actions: 'mergeContext'
            }
          }
        },
        check: {
          always: [
            {
              target: 'ready',
              cond: (ctx) => !!ctx.userName && !!ctx.password
            },
            {
              target: 'empty'
            },
          ]
        }
      },
      on: {
        SIGNUP: 'signUp',
      }
    },
    authenticating: {
      invoke: {
        id: 'getUser',
        src: 'authUser',
        onDone: {
          target: 'authenticated',
          actions: assign({
            signedIn: (_ctx, _event) => true,
            password: (_ctx, _event) => ''
          })
        },
        onError: {
          target: 'failure',
          actions: assign({
            signedIn: (_ctx, _event) => false,
            error: (_, event) => event.data,
            password: (_ctx, _event) => ''
          })
        }
      }
    },
    authenticated: {
      on: {
        SIGNOUT: {
          target: 'signIn',
          actions: assign({ signedIn: (_ctx, _evt) => false })
        }
      }
    },
    failure: {
      on: {
        SIGNIN: 'signIn',
        SIGNUP: 'signUp'
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

  const service = useInterpret(createMachine(machineConfig, {
    services: {
      authUser: (ctx, _event) => new Promise( (resolve, reject) => setTimeout( () => {
        if (ctx.userName === 'admin') {
          resolve(0);
        } else {
          reject('Invalid user name or password!')
        }
      }, 1000 ) )
    },
    actions: {
      mergeContext: assign( (ctx, evt) => ({ ...ctx, ...(evt as UpdateEvent).data }) )
    }
  }));
  const state = useSelector(service, state => state);
  const signIn = useSelector(service, state => state.matches('signIn') );
  const signUp = useSelector(service, state => state.matches('signUp') );
  const ready = useSelector(service, state => state.matches('signIn.ready') );
  const authenticated = useSelector(service, state => state.matches('authenticated') );
  const failure = useSelector(service, state => state.matches('failure') );
  const userName = useSelector(service, state => state.context.userName );
  const password = useSelector(service, state => state.context.password );
  const error = useSelector(service, state => state.context.error );

  const { sendSignIn, sendSignUp, sendSignOut, sendAuthenticate, sendUpdateUserName, sendUpdatePassword } = useMemo(
    () => {

      const getHandleChange = (fieldName: keyof IContext) => (event: React.ChangeEvent<HTMLInputElement>) =>
        service.send({ type: 'UPDATE', data: { [fieldName]: event.target.value } });

      return ({
        sendSignIn: () => service.send('SIGNIN'),
        sendSignUp: () => service.send('SIGNUP'),
        sendSignOut: () => service.send('SIGNOUT'),
        sendAuthenticate: () => service.send('AUTHENTICATE'),
        sendUpdateUserName: getHandleChange('userName'),
        sendUpdatePassword: getHandleChange('password'),
      });
    }, [service]);

  service.nextState

  return (
    <Box sx={{ bgcolor: 'background.paper', width: 500, border: '1px solid gray' }}>
      {JSON.stringify(state.nextEvents)}
      <AppBar position="static">
        <Tabs
          indicatorColor="secondary"
          textColor="inherit"
          variant="fullWidth"
          aria-label="full width tabs example"
          value={signIn ? 'signIn' : signUp ? 'signUp' : undefined}
        >
          <Tab label="Sign In" value='signIn' disabled={!state.nextEvents.includes('SIGNIN')} onClick={sendSignIn} />
          <Tab label="Sign Up" value='signUp' disabled={!state.nextEvents.includes('SIGNUP')} onClick={sendSignUp}/>
        </Tabs>
      </AppBar>
      {
        authenticated
        ?
          <Container>
            <Typography>User {userName} successfully signed in.</Typography>
            <Button variant="contained" onClick={sendSignOut}>Sign Out</Button>
          </Container>
        :
          failure
        ?
          <Container>
            <Typography>Error: {error}</Typography>
            <Button variant="contained" onClick={sendSignIn}>Try again</Button>
          </Container>
        :
          signIn
        ?
          <Box p={2}>
            <Stack
              direction="column"
              spacing={2}
            >
              <TextField
                label="Login"
                value={userName}
                onChange={sendUpdateUserName}
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={sendUpdatePassword}
              />
              <Button variant="contained" disabled={!ready} onClick={sendAuthenticate}>Login</Button>
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
