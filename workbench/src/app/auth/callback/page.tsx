import {notFound} from 'next/navigation';
import {AccountLogin} from '@/components/account-login';
export const dynamic='force-dynamic';
export default function Callback(){if(process.env.WORKBENCH_INTERNAL_ENABLED!=='1')notFound();return <AccountLogin callback sessionKey={process.env.WORKBENCH_SESSION_STORAGE_KEY||'sb-kaqlfoxselrvriulvlsm-auth-token'}/>;}
