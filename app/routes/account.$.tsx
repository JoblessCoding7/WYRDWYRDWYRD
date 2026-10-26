import {redirect} from 'react-router';
import type {Route} from './+types/account.$';


export async function loader({context}: Route.LoaderArgs) {
  context.customerAccount.handleAuthStatus();

  return redirect('/account');
}
