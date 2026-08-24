import { getAppUser } from './auth';
import RescataApp from './rescata-app';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const authUser = await getAppUser();
  return <RescataApp authUser={authUser} />;
}
