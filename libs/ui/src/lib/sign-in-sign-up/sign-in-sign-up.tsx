import { AppBar, Tabs, Tab, Stack, TextField, Typography, Container } from '@mui/material';
import Button from '@mui/material/Button';
import { Box } from '@mui/system';
import { useInterpret, useSelector } from '@xstate/react';
import { useMemo } from 'react';
import { assign, createMachine, MachineConfig } from 'xstate';
import './sign-in-sign-up.module.scss';

type LoginResult = 'OK' | 'INVALID_USER' | 'INVALID_PASSWORD' | 'ACCESS_DENIED';

interface IContext {
  userName: string;
  password: string;
  signedIn: boolean;
  error: string;
  email: string;
};

type UpdateEvent = { type: 'UPDATE', data: Partial<IContext> };

type Event = { type: 'SIGNUP' }
  | { type: 'AUTHENTICATE' }
  | { type: 'ERROR' }
  | { type: 'SUCCESS' }
  | { type: 'SIGNIN' }
  | { type: 'SIGNOUT' }
  | { type: 'FORGOT_PASSWORD' }
  | { type: 'REGISTER' }
  | { type: 'CANCEL' }
  | UpdateEvent;

const machineConfig: MachineConfig<IContext, any, Event> = {
  id: 'signInSignUp',
  initial: 'signIn',
  context: {
    userName: '',
    password: '',
    signedIn: false,
    error: '',
    email: ''
  },
  states: {
    signIn: {
      id: 'signIn',
      initial: 'check',
      states: {
        empty: {
          on: {
            UPDATE: {
              target: 'check',
              actions: 'mergeContext'
            },
            FORGOT_PASSWORD: 'forgotPassword'
          }
        },
        ready: {
          on: {
            AUTHENTICATE: '#signInSignUp.authenticating',
            UPDATE: {
              target: 'check',
              actions: 'mergeContext'
            },
            FORGOT_PASSWORD: 'forgotPassword'
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
        },
        forgotPassword: {
          initial: 'enterEmail',
          states: {
            enterEmail: {
              on: {
                UPDATE: {
                  target: 'checkEmailEntered',
                  actions: 'mergeContext'
                },
                CANCEL: '#signIn.check'
              }
            },
            readyToSend: {
              on: {
                UPDATE: {
                  target: 'checkEmailEntered',
                  actions: 'mergeContext'
                },
                CANCEL: '#signIn.check'
              }
            },
            checkEmailEntered: {
              always: [
                {
                  target: 'readyToSend',
                  cond: ({ email }) => /\S+@\S+\.\S+/.test(email)
                },
                {
                  target: 'enterEmail'
                },
              ]
            },
          }
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
  const readyToSend = useSelector(service, state => state.matches('signIn.forgotPassword.readyToSend') );
  const forgotPassword = useSelector(service, state => state.matches('signIn.forgotPassword') );
  const authenticated = useSelector(service, state => state.matches('authenticated') );
  const failure = useSelector(service, state => state.matches('failure') );
  const userName = useSelector(service, state => state.context.userName );
  const email = useSelector(service, state => state.context.email );
  const password = useSelector(service, state => state.context.password );
  const error = useSelector(service, state => state.context.error );

  const send = useMemo(
    () => {

      const getHandleChange = (fieldName: keyof IContext) => (event: React.ChangeEvent<HTMLInputElement>) =>
        service.send({ type: 'UPDATE', data: { [fieldName]: event.target.value } });

      return ({
        signIn: () => service.send('SIGNIN'),
        signUp: () => service.send('SIGNUP'),
        signOut: () => service.send('SIGNOUT'),
        authenticate: () => service.send('AUTHENTICATE'),
        forgotPassword: () => service.send('FORGOT_PASSWORD'),
        cancel: () => service.send('CANCEL'),
        updateUserName: getHandleChange('userName'),
        updatePassword: getHandleChange('password'),
        updateEmail: getHandleChange('email')
      });
    }, [service]
  );

  return (
    <Box sx={{ bgcolor: 'background.paper', width: 500, border: '1px solid gray' }}>
      {JSON.stringify(state.nextEvents)}
      {JSON.stringify(state.value)}
      <AppBar position="static">
        <Tabs
          indicatorColor="secondary"
          textColor="inherit"
          variant="fullWidth"
          aria-label="full width tabs example"
          value={signIn ? 'signIn' : signUp ? 'signUp' : undefined}
        >
          <Tab label="Sign In" value='signIn' disabled={!state.nextEvents.includes('SIGNIN')} onClick={send.signIn} />
          <Tab label="Sign Up" value='signUp' disabled={!state.nextEvents.includes('SIGNUP')} onClick={send.signUp}/>
        </Tabs>
      </AppBar>
      {
        authenticated
        ?
          <Container>
            <Typography>User {userName} successfully signed in.</Typography>
            <Button variant="contained" onClick={send.signOut}>Sign Out</Button>
          </Container>
        :
          failure
        ?
          <Container>
            <Typography>Error: {error}</Typography>
            <Button variant="contained" onClick={send.signIn}>Try again</Button>
          </Container>
        :
          signIn
        ?
          <Box p={2}>
              {
                forgotPassword
                ?
                  <Stack
                    direction="column"
                    spacing={2}
                  >
                    <TextField
                      label="Email"
                      value={email}
                      onChange={send.updateEmail}
                    />
                    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                      <Button variant="contained" onClick={send.cancel}>Cancel</Button>
                      <Button variant="contained" disabled={!readyToSend} onClick={send.authenticate}>Send request</Button>
                    </Stack>
                  </Stack>
                :
                  <Stack
                    direction="column"
                    spacing={2}
                  >
                    <TextField
                      label="Login"
                      value={userName}
                      onChange={send.updateUserName}
                    />
                    <TextField
                      label="Password"
                      type="password"
                      value={password}
                      onChange={send.updatePassword}
                    />
                    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                      <Button
                        variant="text"
                        sx={{ fontSize: 10 }}
                        onClick={send.forgotPassword}
                        disabled={!state.nextEvents.includes('FORGOT_PASSWORD')}
                      >
                        Forgot password
                      </Button>
                      <Button variant="contained" disabled={false} onClick={send.authenticate}>Login</Button>
                    </Stack>
                  </Stack>
              }
          </Box>
        :
          <Stack>
          </Stack>
      }
    </Box>
  );
};

export default SignInSignUp;
