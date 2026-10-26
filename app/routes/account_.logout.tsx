import {redirect} from 'react-router';
import type {Route} from './+types/account_.logout';


export async function loader() {
  return redirect('/');
}

export async function action({context}: Route.ActionArgs) {
  return context.customerAccount.logout();
}
