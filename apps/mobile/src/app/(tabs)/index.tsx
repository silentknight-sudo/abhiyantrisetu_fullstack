import { Redirect } from 'expo-router';
import { IS_PARTNER } from '@/lib/config';

export default function Index() {
  return <Redirect href={IS_PARTNER ? '/leads' : '/home'} />;
}
